import { requireAdmin } from "@/server/admin";
import { json, route } from "@/server/http";
import { loadBetaStats, loadQuizAnswers } from "@/server/stats";

export const dynamic = "force-dynamic";

/** Beta numbers: sign-ups (total, recent, by day), what travelers have made so far, and what the quiz answers look like. */
export const GET = route(async () => {
  await requireAdmin();
  const [stats, quiz] = await Promise.all([loadBetaStats(), loadQuizAnswers()]);
  return json({ stats, quiz });
});
