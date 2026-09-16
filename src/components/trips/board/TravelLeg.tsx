"use client";

import { Bus, Car, Footprints } from "lucide-react";
import { formatRoutedLeg, type DirectionsMode, type RoutedLeg } from "@/lib/itinerary";

/** Travel between two placed stops: "12 min walk · 0.9 km · via Google" (Routes API) or "… · est." (straight line). */
export function TravelLeg({ leg, mode }: { leg: RoutedLeg; mode: DirectionsMode }) {
  const Icon = mode === "transit" ? Bus : leg.mode === "walk" ? Footprints : Car;
  const label = mode === "transit" ? formatRoutedLeg({ ...leg, mode: "walk" }).replace(" walk ", " transit ") : formatRoutedLeg(leg);
  return (
    <li className="flex items-center gap-2 py-0.5 pl-12 text-[12px] text-muted" data-testid="travel-leg" aria-label={`Travel: ${label}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </li>
  );
}
