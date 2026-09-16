import { json, requireUser, resolveParams, route } from "@/server/http";
import { deleteFeedback, refreshTaste } from "@/server/taste";

export const dynamic = "force-dynamic";

export const DELETE = route(async (request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  const { id } = await resolveParams(ctx);
  await deleteFeedback(user.id, id);
  const { taste } = await refreshTaste(user.id);
  return json({ ok: true, taste });
});
