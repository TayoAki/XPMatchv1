import { z } from "zod";
import { queryAll } from "@/server/db";
import { HttpError, json, parseBody, requireUser, resolveParams, route } from "@/server/http";
import { loadTrip, loadTripDetail } from "@/server/models";
import { changeMemberRole, requireTrip } from "@/server/collab";

type Ctx = { params: Promise<{ id: string; userId: string }> };

const patchSchema = z.object({ role: z.enum(["editor", "viewer"]) });

/** The owner changes what a member can do: edit the trip, or comment on it. */
export const PATCH = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id, userId } = await resolveParams(ctx);
  const trip = await requireTrip(id, user.id, "owner");
  const body = await parseBody(request, patchSchema);
  await changeMemberRole(trip, user, userId, body.role);
  return json(await loadTripDetail(id, user.id));
});

export const DELETE = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id, userId } = await resolveParams(ctx);
  const trip = await loadTrip(id, user.id);
  if (!trip) throw new HttpError(404, "Trip not found");
  if (userId === trip.ownerId) throw new HttpError(400, "The owner cannot be removed");
  if (trip.role !== "owner" && userId !== user.id) throw new HttpError(403, "Only the owner can remove other members");
  await queryAll("DELETE FROM trip_members WHERE trip_id = $1 AND user_id = $2", [id, userId]);
  return json(await loadTripDetail(id, user.id));
});
