"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { estimateLeg, type DirectionsMode, type RoutedLeg } from "@/lib/itinerary";
import type { ItineraryStop } from "@/lib/types";

interface LegsState {
  signature: string;
  legs: RoutedLeg[];
}

/**
 * Legs between a day's placed stops for the chosen mode. Estimates show at
 * once; the Routes API answer (when the server has it) replaces them a moment
 * later. Requests are debounced so dragging does not fire one per frame.
 */
export function useDayLegs(stops: ItineraryStop[], mode: DirectionsMode): RoutedLeg[] {
  const placed = stops.filter((s) => s.place);
  const points = placed.map((s) => ({ lat: s.place!.lat, lng: s.place!.lng }));
  const signature = `${mode}|${points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(";")}`;
  const [routed, setRouted] = useState<LegsState | null>(null);

  useEffect(() => {
    if (points.length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      api<{ legs: RoutedLeg[] }>("/api/routes/legs", { method: "POST", json: { mode, points } })
        .then((res) => {
          if (active && res.legs.length === points.length - 1) setRouted({ signature, legs: res.legs });
        })
        .catch(() => undefined);
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // `signature` summarizes mode + points; `points` is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  if (routed && routed.signature === signature) return routed.legs;
  const estimates: RoutedLeg[] = [];
  for (let i = 1; i < points.length; i++) {
    estimates.push({ ...estimateLeg(points[i - 1], points[i], mode === "transit" ? undefined : mode), source: "estimate" });
  }
  return estimates;
}
