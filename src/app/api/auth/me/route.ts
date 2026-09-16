import { getSessionUser } from "@/server/auth";
import { json, route } from "@/server/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await getSessionUser();
  if (!user) return json({ user: null }, { status: 401 });
  return json({ user });
});
