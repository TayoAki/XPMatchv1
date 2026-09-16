import { queryAll } from "@/server/db";
import { HttpError, json, requireUser, resolveParams, route } from "@/server/http";
import { loadTrip, loadTripDetail } from "@/server/models";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export const DELETE = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id, itemId } = await resolveParams(ctx);
  const trip = await loadTrip(id, user.id);
  if (!trip) throw new HttpError(404, "Trip not found");
  if (trip.role === "viewer") throw new HttpError(403, "Viewers cannot edit this trip");
  await queryAll("DELETE FROM trip_items WHERE id = $1 AND trip_id = $2", [itemId, id]);
  return json(await loadTripDetail(id, user.id));
});
