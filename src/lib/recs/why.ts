import type { ResolvedPlace } from "@/lib/places/types";
import type { MatchResult } from "@/lib/match";

/** One line on why a place fits, from the strongest positive reasons; quality is the fallback. */
export function whyFor(match: MatchResult, place: ResolvedPlace): string {
  const positive = match.reasons.filter((r) => r.delta > 0);
  const specific = positive.filter((r) => r.factor !== "quality").slice(0, 2).map((r) => r.text);
  if (specific.length) return specific.join(" · ");
  const quality = positive.find((r) => r.factor === "quality");
  if (quality) return quality.text;
  return [place.category, place.priceLevel].filter(Boolean).join(" · ") || "A solid pick here";
}
