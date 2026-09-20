import { z } from "zod";
import { cookies } from "next/headers";
import { createSession, findUserByEmail, normalizeEmail, SESSION_COOKIE, sessionCookieOptions, verifyPassword } from "@/server/auth";
import { assertSameOrigin, HttpError, json, parseBody, route } from "@/server/http";
import { allow, clientIp } from "@/server/rate-limit";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

const WINDOW_MS = 15 * 60_000;

export const POST = route(async (request) => {
  assertSameOrigin(request);
  const body = await parseBody(request, schema);
  // Guessing stays slow: ten tries per email and a hundred per network address every 15 minutes.
  if (!allow(`login:ip:${clientIp(request)}`, 100, WINDOW_MS) || !allow(`login:email:${normalizeEmail(body.email)}`, 10, WINDOW_MS)) {
    throw new HttpError(429, "Too many sign-in attempts. Wait 15 minutes and try again, or reset your password.");
  }
  const user = await findUserByEmail(body.email);
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    throw new HttpError(401, "Email or password is incorrect");
  }
  const { token, expiresAt } = await createSession(user.id);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  const { passwordHash: _omit, ...safe } = user;
  void _omit;
  return json({ user: safe });
});
