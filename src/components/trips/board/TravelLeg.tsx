"use client";

import { Car, Footprints } from "lucide-react";
import type { ItineraryStop } from "@/lib/types";
import { estimateLeg, formatLeg } from "@/lib/itinerary";

/** Estimated travel between two placed stops ("12 min walk · 0.9 km · est."). */
export function TravelLeg({ from, to }: { from: ItineraryStop; to: ItineraryStop }) {
  if (!from.place || !to.place) return null;
  const leg = estimateLeg(from.place, to.place);
  const Icon = leg.mode === "walk" ? Footprints : Car;
  return (
    <li className="flex items-center gap-2 py-0.5 pl-12 text-[12px] text-muted" data-testid="travel-leg" aria-label={`Travel: ${formatLeg(leg)}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{formatLeg(leg)}</span>
    </li>
  );
}
