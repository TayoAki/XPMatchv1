import { json, requireUser, resolveParams, route } from "@/server/http";
import { loadInvites, requireTrip, revokeInvite } from "@/server/collab";

type Ctx = { params: Promise<{ id: string; inviteId: string }> };

/** Turns a link off or withdraws an emailed invite; people who already joined stay on the trip. */
export const DELETE = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id, inviteId } = await resolveParams(ctx);
  const trip = await requireTrip(id, user.id, "edit");
  await revokeInvite(trip, inviteId);
  return json({ invites: await loadInvites(id) });
});
