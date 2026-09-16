import { queryAll } from "@/server/db";
import { json, requireUser, route } from "@/server/http";

export const POST = route(async (request) => {
  const user = await requireUser(request);
  await queryAll("UPDATE notifications SET read = true WHERE user_id = $1 AND read = false", [user.id]);
  return json({ ok: true });
});
