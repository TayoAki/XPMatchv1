import { requireAdmin } from "@/server/admin";
import { json, route } from "@/server/http";
import { loadBetaStats } from "@/server/stats";

export const dynamic = "force-dynamic";

/** Beta numbers: sign-ups (total, recent, by day) and what travelers have made so far. */
export const GET = route(async () => {
  await requireAdmin();
  return json({ stats: await loadBetaStats() });
});
