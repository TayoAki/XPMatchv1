"use client";

import { useMemo } from "react";
import clsx from "clsx";
import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import type { MatchCandidate } from "@/lib/match";
import type { RecContext } from "@/lib/recs/types";
import { MatchBadge, useMatch } from "./MatchBadge";
import { RecThumbs } from "./RecThumbs";

/**
 * The match badge and thumbs for one recommendation, from whatever the card
 * knows (the model's fields) plus the resolved pin when it exists.
 */
export function MatchLine({
  name,
  kind,
  place,
  destination,
  context,
  category,
  priceLevel,
  rating,
  userRatingCount,
  text,
  tradeoffs,
  size = "md",
  labeled = false,
  className,
}: {
  name?: string;
  kind: PlaceKind;
  place?: ResolvedPlace | null;
  destination?: string;
  context: RecContext;
  category?: string;
  priceLevel?: string;
  rating?: number;
  userRatingCount?: number;
  text?: string;
  tradeoffs?: (string | undefined)[];
  size?: "sm" | "md";
  /** Spells out Good fit / Not a fit. */
  labeled?: boolean;
  className?: string;
}) {
  const candidate = useMemo<MatchCandidate | null>(() => {
    if (!name) return null;
    return {
      kind,
      name,
      category: place?.category ?? category,
      priceLevel: place?.priceLevel ?? priceLevel,
      rating: place?.rating ?? rating,
      userRatingCount: place?.userRatingCount ?? userRatingCount,
      text: [text ?? "", place?.summary ?? "", category ?? ""].filter(Boolean).join(" "),
      tradeoffs: (tradeoffs ?? []).filter((t): t is string => typeof t === "string" && t.trim() !== ""),
    };
  }, [name, kind, place, category, priceLevel, rating, userRatingCount, text, tradeoffs]);
  const match = useMatch(candidate);
  if (!name || !match) return null;
  return (
    <div className={clsx("flex flex-wrap items-center gap-2", className)} data-testid="match-line">
      <MatchBadge match={match} size={size} />
      <RecThumbs name={name} kind={kind} place={place} destination={destination} context={context} match={match} size={size} labeled={labeled} />
    </div>
  );
}
