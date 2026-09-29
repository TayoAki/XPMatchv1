import { requireAdmin } from "@/server/admin";
import { json, route } from "@/server/http";
import { loadActivityReport, loadCostReport } from "@/server/metrics";

export const dynamic = "force-dynamic";

/** Costs (metered calls at list price, OpenRouter's own figures) and activity (active travelers, the path to a trip). */
export const GET = route(async () => {
  await requireAdmin();
  const [costs, activity] = await Promise.all([loadCostReport(), loadActivityReport()]);
  return json({ costs, activity });
});
