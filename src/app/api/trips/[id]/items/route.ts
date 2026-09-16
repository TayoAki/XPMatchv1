import { z } from "zod";
import { queryAll } from "@/server/db";
import { HttpError, json, parseBody, requireUser, resolveParams, route } from "@/server/http";
import { loadTrip, loadTripDetail, notify, tripMemberIds } from "@/server/models";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  kind: z.enum(["idea", "booking", "media"]).default("idea"),
  title: z.string().trim().min(1).max(200),
  note: z.string().max(2000).default(""),
  url: z.string().max(2000).optional(),
  place: z.object({}).passthrough().optional(),
});

export const POST = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id } = await resolveParams(ctx);
  const trip = await loadTrip(id, user.id);
  if (!trip) throw new HttpError(404, "Trip not found");
  if (trip.role === "viewer") throw new HttpError(403, "Viewers cannot add to this trip");
  const body = await parseBody(request, schema);
  await queryAll(
    "INSERT INTO trip_items (trip_id, kind, title, note, url, place, added_by) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)",
    [id, body.kind, body.title, body.note, body.url ?? null, body.place ? JSON.stringify(body.place) : null, user.id],
  );
  await queryAll("UPDATE trips SET updated_at = now() WHERE id = $1", [id]);
  const others = (await tripMemberIds(id)).filter((m) => m !== user.id);
  const what = body.kind === "idea" ? "an idea" : body.kind === "booking" ? "a booking" : "media";
  await Promise.all(
    others.map((m) => notify(m, "trip_activity", `${user.name} added ${what} to "${trip.title}": ${body.title}.`, { tripId: id })),
  );
  return json(await loadTripDetail(id, user.id), { status: 201 });
});
