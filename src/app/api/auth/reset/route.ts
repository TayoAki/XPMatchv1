import { z } from "zod";
import { cookies } from "next/headers";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/server/auth";
import { assertSameOrigin, HttpError, json, parseBody, route } from "@/server/http";
import { consumePasswordReset, peekPasswordReset } from "@/server/password-reset";

export const dynamic = "force-dynamic";

const EXPIRED = "This reset link has expired or was already used. Ask for a new one.";

const schema = z.object({
  token: z.string().min(16).max(500),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

/** Whose password a live link sets (the page shows the email before asking for a new password). */
export const GET = route(async (request) => {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const info = await peekPasswordReset(token);
  if (!info) throw new HttpError(404, EXPIRED);
  return json({ email: info.email, name: info.name, expiresAt: info.expiresAt });
});

/** Sets the new password for a live link, signs every other session out and signs this browser in. */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  const body = await parseBody(request, schema);
  const user = await consumePasswordReset(body.token, body.password);
  if (!user) throw new HttpError(400, EXPIRED);
  const { token, expiresAt } = await createSession(user.id);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return json({ user });
});
