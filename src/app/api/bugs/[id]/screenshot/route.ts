import { requireAdmin } from "@/server/admin";
import { loadBugScreenshot } from "@/server/bugs";
import { HttpError, resolveParams, route } from "@/server/http";

export const dynamic = "force-dynamic";

/** The screenshot attached to a report, admins only. */
export const GET = route(async (_request, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await resolveParams(ctx);
  const shot = await loadBugScreenshot(id);
  if (!shot) throw new HttpError(404, "No screenshot");
  return new Response(Buffer.from(shot.data, "base64"), { headers: { "Content-Type": shot.type, "Cache-Control": "private, max-age=600" } });
});
