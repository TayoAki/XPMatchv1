import type { ResolvedPlace } from "@/lib/places/types";
import type { ItineraryDay } from "@/lib/types";
import { newStopId, normalizeItinerary } from "@/lib/itinerary";
import { resolvePointOfInterest } from "./places";

/** How many stops one save may look up (each goes through the catalog first, Google only for a new place). */
const MAX_RESOLVE = 40;

/** Stops a save would look up: named a kind, carry no place yet. */
export function countPendingLookups(raw: unknown): number {
  let n = 0;
  for (const day of normalizeItinerary(raw)) for (const stop of day.stops) if (!stop.place && stop.kind) n += 1;
  return Math.min(n, MAX_RESOLVE);
}

/**
 * Normalizes an incoming itinerary (version 1 strings or version 2 stops) and
 * resolves the stops that name a place kind but carry no place yet, biased to
 * the trip's destination. Text-only stops stay text-only.
 */
export async function resolveItinerary(raw: unknown, destination: ResolvedPlace | null): Promise<ItineraryDay[]> {
  const days = normalizeItinerary(raw);
  let budget = MAX_RESOLVE;
  const jobs: Promise<void>[] = [];
  for (const day of days) {
    day.stops = day.stops.map((stop) => (stop.id.startsWith("legacy-") ? { ...stop, id: newStopId() } : stop));
    for (const stop of day.stops) {
      if (stop.place || !stop.kind || budget <= 0) continue;
      budget -= 1;
      jobs.push(
        resolvePointOfInterest(stop.title, stop.kind, destination)
          .then((place) => {
            if (place && place.source === "google") {
              stop.place = place;
              stop.title = place.name;
            }
          })
          .catch(() => undefined),
      );
    }
  }
  await Promise.all(jobs);
  return days;
}
