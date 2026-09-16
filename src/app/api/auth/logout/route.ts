import { cookies } from "next/headers";
import { deleteSession, SESSION_COOKIE } from "@/server/auth";
import { assertSameOrigin, json, route } from "@/server/http";

export const POST = route(async (request) => {
  assertSameOrigin(request);
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  store.delete(SESSION_COOKIE);
  return json({ ok: true });
});
