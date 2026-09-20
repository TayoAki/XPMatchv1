import { requireAdmin } from "@/server/admin";
import { loadCatalogStats } from "@/server/catalog";
import { json, route } from "@/server/http";
import { loadPackageStats } from "@/server/package-learning";
import { loadBetaStats, loadQuizAnswers } from "@/server/stats";

export const dynamic = "force-dynamic";

/** Beta numbers: sign-ups (total, recent, by day), what travelers have made so far, the quiz answers, the place catalog and the packages. */
export const GET = route(async () => {
  await requireAdmin();
  const [stats, quiz, catalog, packages] = await Promise.all([loadBetaStats(), loadQuizAnswers(), loadCatalogStats(), loadPackageStats()]);
  return json({ stats, quiz, catalog, packages });
});
