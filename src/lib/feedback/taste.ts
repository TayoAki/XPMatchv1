import type { PlaceKind } from "@/lib/places/types";
import {
  DOMAIN_OF_KIND,
  PREFERENCE_DOMAIN_OF,
  REASONS,
  TASTE_DOMAINS,
  type PlaceFeedback,
  type RankedPlace,
  type ReasonCount,
  type TasteDomain,
  type TasteDomainSummary,
  type TasteProfile,
} from "./types";
import type { PreferenceDomain, PreferencePolarity } from "@/lib/types";

/** Reactions to the same reason repeated this many times become a learned preference. */
export const STRONG_SIGNAL = 2;

const VERDICT_ORDER = { loved: 0, fine: 1, disliked: 2 } as const;

function countReasons(list: PlaceFeedback[]): ReasonCount[] {
  const counts = new Map<string, number>();
  for (const f of list) for (const r of f.reasons) counts.set(r, (counts.get(r) ?? 0) + 1);
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}

function mode(values: string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | undefined;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

/** Sort key inside a bucket: higher comparison score first, then the most recent reaction. */
function rankSort(a: PlaceFeedback, b: PlaceFeedback): number {
  const bucket = VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict];
  if (bucket !== 0) return bucket;
  const sa = a.score ?? -1;
  const sb = b.score ?? -1;
  if (sa !== sb) return sb - sa;
  return b.updatedAt.localeCompare(a.updatedAt);
}

function summarizeDomain(list: PlaceFeedback[]): TasteDomainSummary {
  const loved = list.filter((f) => f.verdict === "loved");
  const disliked = list.filter((f) => f.verdict === "disliked");
  const ranked: RankedPlace[] = [...list].sort(rankSort).map((f) => ({
    placeId: f.placeId,
    name: f.name,
    verdict: f.verdict,
    score: f.score,
    category: f.place?.category,
  }));
  const categories = countReasons(loved.map((f) => ({ ...f, reasons: f.place?.category ? [f.place.category] : [] })));
  const priceTendency = mode(loved.map((f) => f.place?.priceLevel ?? "").filter(Boolean));
  const summary: TasteDomainSummary = { count: list.length, liked: countReasons(loved), disliked: countReasons(disliked), ranked, categories };
  if (priceTendency) summary.priceTendency = priceTendency;
  return summary;
}

/** Aggregates a traveler's reactions into the per-domain profile stored on their profile row. */
export function computeTasteProfile(feedback: PlaceFeedback[], now = new Date()): TasteProfile {
  const domains: TasteProfile["domains"] = {};
  for (const domain of TASTE_DOMAINS) {
    const list = feedback.filter((f) => DOMAIN_OF_KIND[f.kind] === domain);
    if (list.length) domains[domain] = summarizeDomain(list);
  }
  return { updatedAt: now.toISOString(), total: feedback.length, domains };
}

export interface StrongSignal {
  domain: PreferenceDomain;
  polarity: PreferencePolarity;
  statement: string;
  reason: string;
  count: number;
}

/** Reasons that repeat across places become preferences the assistant and the memory panel already understand. */
export function strongSignals(profile: TasteProfile): StrongSignal[] {
  const out: StrongSignal[] = [];
  for (const domain of TASTE_DOMAINS) {
    const summary = profile.domains[domain];
    if (!summary) continue;
    const chips = REASONS[domain];
    for (const { reason, count } of summary.disliked) {
      const chip = chips.disliked.find((c) => c.label === reason);
      if (chip && count >= STRONG_SIGNAL) out.push({ domain: PREFERENCE_DOMAIN_OF[domain], polarity: "dislike", statement: chip.statement, reason, count });
    }
    for (const { reason, count } of summary.liked) {
      const chip = chips.liked.find((c) => c.label === reason);
      if (chip && count >= STRONG_SIGNAL) out.push({ domain: PREFERENCE_DOMAIN_OF[domain], polarity: "like", statement: chip.statement, reason, count });
    }
  }
  return out;
}

export interface TasteCandidate {
  kind: PlaceKind;
  name?: string;
  category?: string;
  /** Free text describing the pick (amenities, style, cuisine, vibes, why it fits). */
  text?: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").trim();

/**
 * Deterministic "Fits your taste" line: the candidate shares a category with a
 * loved place ("Like Trattoria Da Enzo, which you loved") or its description
 * mentions a reason the traveler keeps liking. Returns null without real overlap.
 */
export function fitsYourTaste(candidate: TasteCandidate, profile: TasteProfile | null | undefined): string | null {
  if (!profile) return null;
  const domain: TasteDomain = DOMAIN_OF_KIND[candidate.kind];
  const summary = profile.domains[domain];
  if (!summary) return null;
  const self = candidate.name ? norm(candidate.name) : "";
  if (candidate.category) {
    const cat = norm(candidate.category);
    const twin = summary.ranked.find((p) => p.verdict === "loved" && p.category && norm(p.category) === cat && norm(p.name) !== self);
    if (twin) return `Like ${twin.name}, which you loved`;
  }
  const text = norm([candidate.category ?? "", candidate.text ?? ""].join(" "));
  if (text) {
    const hit = summary.liked.find(({ reason, count }) => count >= 1 && text.includes(norm(reason)));
    if (hit) return `Matches what you like: ${hit.reason.toLowerCase()}`;
  }
  return null;
}

/** "Not for me" places in this domain the candidate should not be confused with (by name). */
export function isDisliked(name: string | undefined, kind: PlaceKind, profile: TasteProfile | null | undefined): boolean {
  if (!name || !profile) return false;
  const summary = profile.domains[DOMAIN_OF_KIND[kind]];
  return !!summary?.ranked.some((p) => p.verdict === "disliked" && norm(p.name) === norm(name));
}

// Type aliases (not interfaces) so the values satisfy the agent context's JSON index signature.
export type TasteDomainContext = {
  ratings: number;
  loves: string[];
  notForThem: string[];
  likedReasons: string[];
  dislikedReasons: string[];
  usualPrice: string;
};

export type TasteContext = {
  ratings: number;
  summary: string;
  domains: Record<string, TasteDomainContext>;
  recent: string[];
};

/** Compact per-domain lines for the assistant's context (every field present so it serializes cleanly). */
export function tasteForContext(profile: TasteProfile | null | undefined, recent: PlaceFeedback[]): TasteContext {
  if (!profile || profile.total === 0) return { ratings: 0, summary: "No reactions recorded yet", domains: {}, recent: [] };
  const domains: Record<string, TasteDomainContext> = {};
  for (const domain of TASTE_DOMAINS) {
    const s = profile.domains[domain];
    if (!s) continue;
    domains[domain] = {
      ratings: s.count,
      loves: s.ranked.filter((p) => p.verdict === "loved").slice(0, 5).map((p) => p.name),
      notForThem: s.ranked.filter((p) => p.verdict === "disliked").slice(0, 5).map((p) => p.name),
      likedReasons: s.liked.slice(0, 4).map((r) => r.reason),
      dislikedReasons: s.disliked.slice(0, 4).map((r) => r.reason),
      usualPrice: s.priceTendency ?? "",
    };
  }
  return {
    ratings: profile.total,
    summary: `${profile.total} reaction${profile.total === 1 ? "" : "s"} across ${Object.keys(domains).length} domain${Object.keys(domains).length === 1 ? "" : "s"}`,
    domains,
    recent: recent.slice(0, 10).map((f) => `${f.name}: ${f.verdict}${f.reasons.length ? ` (${f.reasons.join(", ")})` : ""}`),
  };
}
