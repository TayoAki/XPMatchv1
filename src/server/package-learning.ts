import type { MatchFactor } from "@/lib/match";
import type { PackageStats } from "@/lib/admin/types";
import { queryAll, queryOne } from "./db";
import { jsonb } from "./models";

/**
 * The learning loop behind packages. What a traveler keeps (locks, thumbs up, the
 * places in a package turned into a trip) and rejects (swaps, thumbs down) is stored
 * with the match factors that put each place there. Counting them per factor gives a
 * second calibration layer on top of the thumbs one: a factor that keeps getting its
 * place swapped out loses weight for that traveler, one that keeps being kept gains it.
 */

const KEPT = new Set(["keep", "lock", "thumbs_up"]);
const REJECTED = new Set(["swap", "thumbs_down"]);
/** Judgments per factor before its weight moves. */
const MIN_JUDGMENTS = 4;

export async function loadPackageCalibration(userId: string): Promise<Partial<Record<MatchFactor, number>>> {
  const out: Partial<Record<MatchFactor, number>> = {};
  try {
    const rows = await queryAll<{ action: string; factors: unknown }>(
      `SELECT action, factors FROM package_events
        WHERE user_id = $1 AND action = ANY($2::text[])
        ORDER BY created_at DESC LIMIT 400`,
      [userId, [...KEPT, ...REJECTED]],
    );
    const counts = new Map<string, { kept: number; rejected: number }>();
    for (const row of rows) {
      const factors = jsonb<string[]>(row.factors) ?? [];
      for (const factor of factors) {
        const c = counts.get(factor) ?? { kept: 0, rejected: 0 };
        if (KEPT.has(row.action)) c.kept += 1;
        else c.rejected += 1;
        counts.set(factor, c);
      }
    }
    for (const [factor, c] of counts) {
      const n = c.kept + c.rejected;
      if (n < MIN_JUDGMENTS) continue;
      out[factor as MatchFactor] = Math.max(0.6, Math.min(1.3, 0.5 + c.kept / n));
    }
  } catch (err) {
    console.warn("[packages] calibration unavailable:", err instanceof Error ? err.message : err);
  }
  return out;
}

/** Package numbers for the admin page: how many were shown, how travelers reacted, how many became trips. */
export async function loadPackageStats(): Promise<PackageStats> {
  const n = (v: unknown) => Number(v ?? 0) || 0;
  try {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT
         count(*) FILTER (WHERE action = 'shown') AS shown,
         count(DISTINCT user_id) FILTER (WHERE action = 'shown') AS travelers,
         count(*) FILTER (WHERE action = 'swap') AS swaps,
         count(*) FILTER (WHERE action = 'lock') AS locks,
         count(*) FILTER (WHERE action = 'thumbs_up') AS thumbs_up,
         count(*) FILTER (WHERE action = 'thumbs_down') AS thumbs_down,
         count(*) FILTER (WHERE action = 'variant') AS variant_picks,
         count(*) FILTER (WHERE action = 'to_trip') AS trips
       FROM package_events`,
    );
    const shown = n(row?.shown);
    const swaps = n(row?.swaps);
    const variants = await queryAll<{ reason: string | null; count: unknown }>(
      "SELECT reason, count(*) AS count FROM package_events WHERE action = 'variant' GROUP BY reason ORDER BY count(*) DESC",
    );
    return {
      shown,
      travelers: n(row?.travelers),
      swaps,
      locks: n(row?.locks),
      thumbsUp: n(row?.thumbs_up),
      thumbsDown: n(row?.thumbs_down),
      trips: n(row?.trips),
      /** Slots left untouched, assuming seven per package shown. */
      keepRate: shown ? Math.max(0, Math.round((1 - swaps / (shown * 7)) * 100)) : null,
      tripRate: shown ? Math.round((n(row?.trips) / shown) * 100) : null,
      variants: variants.map((v) => ({ variant: v.reason ?? "match", count: n(v.count) })),
    };
  } catch (err) {
    console.warn("[packages] stats unavailable:", err instanceof Error ? err.message : err);
    return { shown: 0, travelers: 0, swaps: 0, locks: 0, thumbsUp: 0, thumbsDown: 0, trips: 0, keepRate: null, tripRate: null, variants: [] };
  }
}
