import { requireAdmin } from "@/server/admin";
import { queryOne } from "@/server/db";
import { HttpError, json, requestOrigin, resolveParams, route } from "@/server/http";
import { createPasswordReset, RESET_LINK_MINUTES } from "@/server/password-reset";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Admin-only: issues a password reset link for one account. The admin sends it to the traveler by
 * hand (text, email); it works once and expires after RESET_LINK_MINUTES.
 */
export const POST = route(async (request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin(request);
  const { id } = await resolveParams(ctx);
  if (!UUID.test(id)) throw new HttpError(404, "No such account");
  const user = await queryOne<{ id: string; email: string } & Record<string, unknown>>("SELECT id, email FROM users WHERE id = $1", [id]);
  if (!user) throw new HttpError(404, "No such account");
  const { token, expiresAt } = await createPasswordReset(user.id, admin.id);
  return json({ url: `${requestOrigin(request)}/reset?token=${token}`, expiresAt: expiresAt.toISOString(), email: user.email, minutes: RESET_LINK_MINUTES });
});
