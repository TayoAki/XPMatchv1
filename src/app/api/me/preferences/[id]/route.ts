import { json, requireUser, resolveParams, route } from "@/server/http";
import { deletePreference } from "@/server/models";

export const DELETE = route(async (request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  const { id } = await resolveParams(ctx);
  await deletePreference(user.id, id);
  return json({ ok: true });
});
