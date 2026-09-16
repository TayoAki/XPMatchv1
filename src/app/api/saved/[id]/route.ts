import { queryAll } from "@/server/db";
import { json, requireUser, resolveParams, route } from "@/server/http";

export const DELETE = route(async (request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  const { id } = await resolveParams(ctx);
  await queryAll("DELETE FROM saved_items WHERE id = $1 AND user_id = $2", [id, user.id]);
  return json({ ok: true });
});
