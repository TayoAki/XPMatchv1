import { z } from "zod";
import { findUserByEmail, normalizeEmail } from "@/server/auth";
import { emailConfigured, passwordResetEmail, sendEmail } from "@/server/email";
import { assertSameOrigin, json, parseBody, requestOrigin, route } from "@/server/http";
import { createPasswordReset, RESET_LINK_MINUTES } from "@/server/password-reset";
import { allow, clientIp } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().email("Enter a valid email").max(200) });

const WINDOW_MS = 15 * 60_000;

/**
 * "Forgot password?": emails a single-use reset link when an account exists. The answer is the
 * same whether or not it does, so the form cannot be used to find out who has an account, and
 * requests are rate-limited per address and per email.
 */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  const body = await parseBody(request, schema);
  const email = normalizeEmail(body.email);
  const reply = () => json({ ok: true, minutes: RESET_LINK_MINUTES });

  if (!allow(`forgot:ip:${clientIp(request)}`, 8, WINDOW_MS) || !allow(`forgot:email:${email}`, 3, WINDOW_MS)) return reply();
  const user = await findUserByEmail(email);
  if (!user) return reply();

  const { token } = await createPasswordReset(user.id, null);
  const url = `${requestOrigin(request)}/reset?token=${token}`;
  if (!emailConfigured()) {
    if (process.env.NODE_ENV === "production") console.error("[email] RESEND_API_KEY is not set: a password reset was requested but no email could be sent");
    else console.warn(`[email] not configured; the reset link for ${email} is ${url}`);
    return reply();
  }
  try {
    await sendEmail(passwordResetEmail({ to: user.email, name: user.name, url, minutes: RESET_LINK_MINUTES }));
  } catch (err) {
    console.error("[email] sending the password reset failed", err instanceof Error ? err.message : err);
  }
  return reply();
});
