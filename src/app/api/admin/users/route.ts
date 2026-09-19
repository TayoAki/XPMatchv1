import { requireAdmin } from "@/server/admin";
import { json, route } from "@/server/http";
import { loadUserRoster } from "@/server/stats";

export const dynamic = "force-dynamic";

/** Admin-only roster of every account: who signed up, quiz status and light activity. Includes emails. */
export const GET = route(async () => {
  await requireAdmin();
  return json({ users: await loadUserRoster() });
});
