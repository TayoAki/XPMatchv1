import type { PlaceKind } from "@/lib/places/types";

const HOTEL_CATEGORY = /\b(hotel|hotels|lodging|inn|hostel|resort|motel|guest house|guesthouse|aparthotel|apartment|bed and breakfast|b&b|residence|pension)\b/i;
const FOOD_CATEGORY =
  /\b(restaurant|cafe|café|coffee|bar|pub|bakery|pizzeria|pizza|trattoria|osteria|bistro|brasserie|diner|eatery|steakhouse|steak house|grill|sushi|ramen|taqueria|food court|gelato|ice cream|dessert|cocktail|tea house|deli|takeout|fast food|noodle|burger|seafood|kitchen|wine bar|brewery|taproom)\b/i;
const LOCALITY_TYPES = new Set(["locality", "sublocality", "postal_town", "administrative_area_level_1", "administrative_area_level_2", "country", "colloquial_area"]);

/** What Google's primary type says a place is; null when it says nothing. A hotel never belongs in "things to do". */
export function inferKind(category: string | undefined): PlaceKind | null {
  if (!category) return null;
  if (HOTEL_CATEGORY.test(category)) return "hotel";
  if (FOOD_CATEGORY.test(category)) return "restaurant";
  return "attraction";
}

/** True when Google's types mark a city, region or country rather than a place inside one. */
export function isLocality(types: string[] | undefined): boolean {
  return (types ?? []).some((t) => LOCALITY_TYPES.has(t));
}

/** The kind a place is stored under: a locality is a destination, otherwise what its category says, else what the caller asked for. */
export function catalogKind(kind: PlaceKind, category: string | undefined, types?: string[]): PlaceKind {
  if (kind === "destination" || isLocality(types)) return "destination";
  return inferKind(category) ?? kind;
}
