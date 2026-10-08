import { json, requireUser, resolveParams, route } from "@/server/http";
import { deleteMessage, loadCollab, requireTrip } from "@/server/collab";

type Ctx = { params: Promise<{ id: string; messageId: string }> };

export const DELETE = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id, messageId } = await resolveParams(ctx);
  const trip = await requireTrip(id, user.id);
  await deleteMessage(trip, user, messageId);
  return json(await loadCollab(id));
});
