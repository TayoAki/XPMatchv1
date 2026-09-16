import { requireAdmin } from "@/server/admin";
import { json, route } from "@/server/http";
import { loadRecQualityOverall } from "@/server/recs";

export const dynamic = "force-dynamic";

/** Recommendation quality across every traveler: hit rate, by kind and context, common miss reasons. */
export const GET = route(async () => {
  await requireAdmin();
  return json({ quality: await loadRecQualityOverall() });
});
