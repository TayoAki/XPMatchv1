import { z } from "zod";
import { cookies } from "next/headers";
import { createSession, findUserByEmail, SESSION_COOKIE, sessionCookieOptions, verifyPassword } from "@/server/auth";
import { assertSameOrigin, HttpError, json, parseBody, route } from "@/server/http";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const POST = route(async (request) => {
  assertSameOrigin(request);
  const body = await parseBody(request, schema);
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
