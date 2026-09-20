import { z } from "zod";
import { cookies } from "next/headers";
import { createSession, createUser, findUserByEmail, SESSION_COOKIE, sessionCookieOptions } from "@/server/auth";
import { assertSameOrigin, HttpError, json, parseBody, route } from "@/server/http";
import { allow, clientIp } from "@/server/rate-limit";

const schema = z.object({
  name: z.string().trim().min(1, "Tell us your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(200),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

export const POST = route(async (request) => {
  assertSameOrigin(request);
  // A hundred accounts an hour from one network address is plenty for people and too few for a script.
  if (!allow(`signup:ip:${clientIp(request)}`, 100, 60 * 60_000)) throw new HttpError(429, "Too many accounts created from this network. Try again later.");
  const body = await parseBody(request, schema);
  if (await findUserByEmail(body.email)) throw new HttpError(409, "An account with this email already exists");
  const user = await createUser(body);
  const { token, expiresAt } = await createSession(user.id);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return json({ user }, { status: 201 });
});
