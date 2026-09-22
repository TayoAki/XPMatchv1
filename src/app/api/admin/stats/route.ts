import { requireAdmin } from "@/server/admin";
import { loadSpendStats } from "@/server/api-spend";
import { loadCatalogStats } from "@/server/catalog";
import { json, route } from "@/server/http";
import { loadPackageStats } from "@/server/package-learning";
import { loadBetaStats, loadQuizAnswers } from "@/server/stats";

export const dynamic = "force-dynamic";

/** Beta numbers: sign-ups, what travelers have made, the quiz answers, the place catalog, the packages, and measured Google spend. */
export const GET = route(async () => {
  await requireAdmin();
  const [stats, quiz, catalog, packages, spend] = await Promise.all([
    loadBetaStats(),
    loadQuizAnswers(),
    loadCatalogStats(),
    loadPackageStats(),
    loadSpendStats(30),
  ]);
  return json({ stats, quiz, catalog, packages, spend });
});
