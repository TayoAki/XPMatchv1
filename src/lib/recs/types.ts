import type { PlaceKind } from "@/lib/places/types";

/** Where a recommendation was shown when the traveler judged it. */
export type RecContext = "chat" | "home" | "explore" | "board" | "sheet";
export const REC_CONTEXTS: RecContext[] = ["chat", "home", "explore", "board", "sheet"];

export type RecVerdict = "up" | "down";

/** Why a pick missed, in the traveler's words (a chip). */
export const REC_MISS_REASONS = ["Too pricey", "Wrong vibe", "Too far", "Already been", "Not my thing", "Other"] as const;
export type RecMissReason = (typeof REC_MISS_REASONS)[number];

/** Thumbs up / down on one recommendation: did the match score get it right? */
export interface RecFeedback {
  id: string;
  /** Google place id, or `name:<slug>` when the place never resolved. */
  placeId: string;
  kind: PlaceKind;
  name: string;
  destination?: string;
  context: RecContext;
  verdict: RecVerdict;
  /** The match score the traveler saw (0–100), when any. */
  score?: number;
  /** Ids of the match factors that fired for that pick (see `src/lib/match.ts`). */
  factors: string[];
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

/** Hit rate of the recommendations a traveler judged. */
export interface RecQuality {
  total: number;
  up: number;
  down: number;
  /** 0–100, null until there are judgments. */
  hitRate: number | null;
  byKind: Record<string, { up: number; down: number }>;
  byContext: Record<string, { up: number; down: number }>;
  reasons: { reason: string; count: number }[];
  recentMisses: { name: string; kind: PlaceKind; reason?: string; score?: number }[];
}

export function recQuality(list: RecFeedback[]): RecQuality {
  const byKind: RecQuality["byKind"] = {};
  const byContext: RecQuality["byContext"] = {};
  const reasonCounts = new Map<string, number>();
  let up = 0;
  let down = 0;
  for (const f of list) {
    const k = (byKind[f.kind] ??= { up: 0, down: 0 });
    const c = (byContext[f.context] ??= { up: 0, down: 0 });
    if (f.verdict === "up") {
      up += 1;
      k.up += 1;
      c.up += 1;
    } else {
      down += 1;
      k.down += 1;
      c.down += 1;
      if (f.reason) reasonCounts.set(f.reason, (reasonCounts.get(f.reason) ?? 0) + 1);
    }
  }
  const total = up + down;
  return {
    total,
    up,
    down,
    hitRate: total ? Math.round((up / total) * 100) : null,
    byKind,
    byContext,
    reasons: [...reasonCounts.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
    recentMisses: [...list]
      .filter((f) => f.verdict === "down")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 10)
      .map((f) => ({ name: f.name, kind: f.kind, reason: f.reason, score: f.score })),
  };
}
