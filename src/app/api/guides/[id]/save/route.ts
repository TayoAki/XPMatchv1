import { HttpError, json, requireUser, resolveParams, route } from "@/server/http";
import { loadGuide, setGuideSaved } from "@/server/guides";

type Ctx = { params: Promise<{ id: string }> };

async function toggle(request: Request, ctx: Ctx, saved: boolean) {
  const user = await requireUser(request);
  const { id } = await resolveParams(ctx);
  const guide = await loadGuide(id, user.id);
  if (!guide) throw new HttpError(404, "Guide not found");
  const item = await setGuideSaved(user, guide, saved);
  const fresh = await loadGuide(id, user.id);
  return json({ saved: item, guide: fresh });
}

export const POST = route((request, ctx: Ctx) => toggle(request, ctx, true));
export const DELETE = route((request, ctx: Ctx) => toggle(request, ctx, false));
