import { json, requireUser, resolveParams, route } from "@/server/http";
import { deleteRecFeedback } from "@/server/recs";

export const dynamic = "force-dynamic";

export const DELETE = route(async (request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  const { id } = await resolveParams(ctx);
  await deleteRecFeedback(user.id, id);
  return json({ ok: true });
});
