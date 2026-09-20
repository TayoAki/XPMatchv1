import { requireAdmin } from "@/server/admin";
import { loadCatalogStats } from "@/server/catalog";
import { json, route } from "@/server/http";
import { loadBetaStats, loadQuizAnswers } from "@/server/stats";

export const dynamic = "force-dynamic";

/** Beta numbers: sign-ups (total, recent, by day), what travelers have made so far, the quiz answers and the place catalog. */
export const GET = route(async () => {
  await requireAdmin();
  const [stats, quiz, catalog] = await Promise.all([loadBetaStats(), loadQuizAnswers(), loadCatalogStats()]);
  return json({ stats, quiz, catalog });
});
