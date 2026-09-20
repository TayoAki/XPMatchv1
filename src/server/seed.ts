import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { placesApiKey, searchTextPlaces } from "./places";

/**
 * Seeds the catalog for a destination with list searches: one Text Search returns up
 * to 20 places for one fee, so a city lands in the catalog for well under a dollar,
 * once. The package builder and every later lookup then read from it.
 */

export const SEED_QUERIES: { kind: PlaceKind; query: string }[] = [
  { kind: "hotel", query: "boutique hotels" },
  { kind: "hotel", query: "well-rated hotels" },
  { kind: "hotel", query: "luxury hotels" },
  { kind: "hotel", query: "affordable hotels" },
  { kind: "hotel", query: "hotels in the center" },
  { kind: "restaurant", query: "best restaurants" },
  { kind: "restaurant", query: "restaurants locals love" },
  { kind: "restaurant", query: "cafes and bakeries" },
  { kind: "restaurant", query: "street food" },
  { kind: "restaurant", query: "fine dining" },
  { kind: "restaurant", query: "vegetarian restaurants" },
  { kind: "restaurant", query: "bars and wine bars" },
  { kind: "attraction", query: "top things to do" },
  { kind: "attraction", query: "museums and galleries" },
  { kind: "attraction", query: "parks and gardens" },
  { kind: "attraction", query: "historic landmarks" },
  { kind: "attraction", query: "scenic viewpoints" },
  { kind: "attraction", query: "markets" },
  { kind: "attraction", query: "nightlife" },
];

export interface SeedResult {
  queries: number;
  places: number;
  byKind: Record<Exclude<PlaceKind, "destination">, number>;
}

/** Runs the seed searches for a destination (three at a time) and reports what came back. */
export async function seedDestination(destination: ResolvedPlace, queries = SEED_QUERIES): Promise<SeedResult> {
  const seen = new Map<string, PlaceKind>();
  if (!placesApiKey()) return { queries: 0, places: 0, byKind: { hotel: 0, restaurant: 0, attraction: 0 } };
  let ran = 0;
  for (let i = 0; i < queries.length; i += 3) {
    const batch = queries.slice(i, i + 3);
    const lists = await Promise.all(
      batch.map((q) =>
        searchTextPlaces(`${q.query} in ${destination.name}`, q.kind, destination, 20).catch((err: unknown) => {
          console.warn("[seed] search failed:", err instanceof Error ? err.message : err);
          return [] as ResolvedPlace[];
        }),
      ),
    );
    ran += batch.length;
    for (const list of lists) for (const place of list) if (place.source === "google" && !seen.has(place.id)) seen.set(place.id, place.kind);
  }
  const byKind = { hotel: 0, restaurant: 0, attraction: 0 };
  for (const kind of seen.values()) if (kind !== "destination") byKind[kind] += 1;
  return { queries: ran, places: seen.size, byKind };
}
