import { z } from "zod";
import { queryAll } from "@/server/db";
import { HttpError, json, parseBody, requireUser, resolveParams, route } from "@/server/http";
import { loadTrip, loadTripDetail } from "@/server/models";
import { itemRecipients, notifyItemAdded } from "@/server/collab";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  kind: z.enum(["idea", "booking", "media"]).default("idea"),
  title: z.string().trim().min(1).max(200),
  note: z.string().max(2000).default(""),
  url: z.string().max(2000).optional(),
  place: z.object({}).passthrough().optional(),
  /** Structured reservation (bookings only). */
  details: z.object({ kind: z.string(), title: z.string() }).passthrough().optional(),
});

export const POST = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id } = await resolveParams(ctx);
  const trip = await loadTrip(id, user.id);
  if (!trip) throw new HttpError(404, "Trip not found");
  if (trip.role === "viewer") throw new HttpError(403, "Viewers cannot add to this trip");
  const body = await parseBody(request, schema);
  const details = body.kind === "booking" && body.details ? JSON.stringify(body.details) : null;
  await queryAll(
    "INSERT INTO trip_items (trip_id, kind, title, note, url, place, details, added_by) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)",
    [id, body.kind, body.title, body.note, body.url ?? null, body.place ? JSON.stringify(body.place) : null, details, user.id],
  );
  await queryAll("UPDATE trips SET updated_at = now() WHERE id = $1", [id]);
  // The assistant adding five ideas in a row is one update ("added 5 ideas"), not five.
  await notifyItemAdded(await itemRecipients(id, user.id, body.kind), trip, user, body.kind, body.title);
  return json(await loadTripDetail(id, user.id), { status: 201 });
});
