import { getSessionUser } from "@/server/auth";
import { HttpError, json, requireUser, resolveParams, route } from "@/server/http";
import { acceptInvite, previewInvite } from "@/server/collab";
import { allow, clientIp } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/** What an invite link opens: public, so someone without an account sees who invited them to what. */
export const GET = route(async (request, ctx: Ctx) => {
  if (!allow(`join:ip:${clientIp(request)}`, 120, 60 * 60_000)) throw new HttpError(429, "Too many requests. Try again in a bit.");
  const { token } = await resolveParams(ctx);
  const preview = await previewInvite(token, await getSessionUser());
  if (!preview) throw new HttpError(404, "This invite link doesn't work. Ask for a new one.");
  return json(preview);
});

/** Joins the trip as the signed-in traveler. */
export const POST = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  if (!allow(`join:${user.id}`, 30, 60 * 60_000)) throw new HttpError(429, "Too many requests. Try again in a bit.");
  const { token } = await resolveParams(ctx);
  return json(await acceptInvite(token, user));
});
