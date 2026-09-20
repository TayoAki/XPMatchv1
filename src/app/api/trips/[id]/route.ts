import { z } from "zod";
import { queryAll } from "@/server/db";
import { HttpError, json, parseBody, requireUser, resolveParams, route } from "@/server/http";
import { loadTrip, loadTripDetail, notify, tripMemberIds } from "@/server/models";
import { resolveDestination } from "@/server/places";
import { countPendingLookups, resolveItinerary } from "@/server/itinerary";
import { assertLookupBudget } from "@/server/lookup-budget";
import { itinerarySchema } from "../route";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  destination: z.string().trim().min(1).max(160).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  travelers: z.number().int().min(1).max(50).nullable().optional(),
  budgetTier: z.string().max(40).nullable().optional(),
  summary: z.string().max(4000).nullable().optional(),
  itinerary: itinerarySchema.optional(),
  preferences: z.string().max(4000).optional(),
});

export const GET = route(async (_request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await resolveParams(ctx);
  const trip = await loadTripDetail(id, user.id);
  if (!trip) throw new HttpError(404, "Trip not found");
  return json(trip);
});

export const PATCH = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id } = await resolveParams(ctx);
  const existing = await loadTrip(id, user.id);
  if (!existing) throw new HttpError(404, "Trip not found");
  if (existing.role === "viewer") throw new HttpError(403, "Viewers cannot edit this trip");
  const body = await parseBody(request, patchSchema);

  const sets: string[] = [];
  const values: unknown[] = [id];
  const add = (column: string, value: unknown, cast = "") => {
    values.push(value);
    sets.push(`${column} = $${values.length}${cast}`);
  };
  if (body.title !== undefined) add("title", body.title);
  if (body.destination !== undefined) {
    add("destination", body.destination);
    if (body.destination !== existing.destination) {
      const place = await resolveDestination(body.destination).catch(() => null);
      add("place", place ? JSON.stringify(place) : null, "::jsonb");
    }
  }
  if (body.startDate !== undefined) add("start_date", body.startDate);
  if (body.endDate !== undefined) add("end_date", body.endDate);
  if (body.travelers !== undefined) add("travelers", body.travelers);
  if (body.budgetTier !== undefined) add("budget_tier", body.budgetTier);
  if (body.summary !== undefined) add("summary", body.summary);
  if (body.itinerary !== undefined) {
    assertLookupBudget(user.id, countPendingLookups(body.itinerary));
    add("itinerary", JSON.stringify(await resolveItinerary(body.itinerary, existing.place ?? null)), "::jsonb");
  }
  if (body.preferences !== undefined) add("preferences", body.preferences);
  if (sets.length) {
    await queryAll(`UPDATE trips SET ${sets.join(", ")}, updated_at = now() WHERE id = $1`, values);
    const others = (await tripMemberIds(id)).filter((m) => m !== user.id);
    await Promise.all(
      others.map((m) => notify(m, "trip_activity", `${user.name} updated the trip "${body.title ?? existing.title}".`, { tripId: id })),
    );
  }
  const trip = await loadTripDetail(id, user.id);
  return json(trip);
});

export const DELETE = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id } = await resolveParams(ctx);
  const existing = await loadTrip(id, user.id);
  if (!existing) throw new HttpError(404, "Trip not found");
  if (existing.role !== "owner") {
    // Non-owners leave the trip instead of deleting it.
    await queryAll("DELETE FROM trip_members WHERE trip_id = $1 AND user_id = $2", [id, user.id]);
    return json({ ok: true, left: true });
  }
  await queryAll("DELETE FROM trips WHERE id = $1 AND owner_id = $2", [id, user.id]);
  return json({ ok: true });
});
