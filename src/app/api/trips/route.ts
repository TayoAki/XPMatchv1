import { z } from "zod";
import { queryAll, queryOne } from "@/server/db";
import { json, parseBody, requireUser, route } from "@/server/http";
import { loadTrip, loadTripsForUser } from "@/server/models";
import { resolveDestination } from "@/server/places";
import { countPendingLookups, resolveItinerary } from "@/server/itinerary";
import { assertLookupBudget } from "@/server/lookup-budget";

export const dynamic = "force-dynamic";

const stopSchema = z.object({
  id: z.string().max(80).optional(),
  title: z.string().max(200).optional(),
  name: z.string().max(200).optional(),
  note: z.string().max(1000).optional(),
  kind: z.enum(["hotel", "restaurant", "attraction", "destination"]).optional(),
  place: z.object({}).passthrough().optional(),
  startTime: z.string().max(5).optional(),
  durationMin: z.number().min(0).max(1440).optional(),
  itemId: z.string().max(80).optional(),
});

/** Accepts version 1 (`items: string[]`) and version 2 (`stops`) days; the server normalizes and resolves places. */
export const itinerarySchema = z
  .array(
    z.object({
      day: z.number().int().min(1),
      title: z.string().max(200),
      items: z.array(z.string().max(500)).max(20).optional(),
      stops: z.array(stopSchema).max(20).optional(),
    }),
  )
  .max(30);

const createSchema = z.object({
  title: z.string().trim().min(1).max(160),
  destination: z.string().trim().min(1).max(160),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  travelers: z.number().int().min(1).max(50).optional(),
  budgetTier: z.string().max(40).optional(),
  summary: z.string().max(4000).optional(),
  itinerary: itinerarySchema.optional(),
  place: z.object({}).passthrough().optional(),
});

export const GET = route(async () => {
  const user = await requireUser();
  return json({ trips: await loadTripsForUser(user.id) });
});

export const POST = route(async (request) => {
  const user = await requireUser(request);
  const body = await parseBody(request, createSchema);
  assertLookupBudget(user.id, countPendingLookups(body.itinerary ?? []) + (body.place ? 0 : 1));
  // Best effort: pin the destination so the trip has a cover photo and a map center.
  const place = body.place ?? (await resolveDestination(body.destination).catch(() => null));
  const itinerary = await resolveItinerary(body.itinerary ?? [], (place as { lat?: number } | null)?.lat !== undefined ? (place as never) : null);
  const row = await queryOne<{ id: string }>(
    `INSERT INTO trips (owner_id, title, destination, place, start_date, end_date, travelers, budget_tier, summary, itinerary)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10::jsonb) RETURNING id`,
    [
      user.id,
      body.title,
      body.destination,
      place ? JSON.stringify(place) : null,
      body.startDate || null,
      body.endDate || null,
      body.travelers ?? null,
      body.budgetTier ?? null,
      body.summary ?? null,
      JSON.stringify(itinerary),
    ],
  );
  if (!row) throw new Error("Could not create trip");
  await queryAll("INSERT INTO trip_members (trip_id, user_id, role, added_by) VALUES ($1, $2, 'owner', $2)", [row.id, user.id]);
  const trip = await loadTrip(row.id, user.id);
  return json(trip, { status: 201 });
});
