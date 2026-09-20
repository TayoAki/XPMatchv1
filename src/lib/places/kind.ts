import type { PlaceKind } from "@/lib/places/types";

const HOTEL_CATEGORY = /\b(hotel|hotels|lodging|inn|hostel|resort|motel|guest house|guesthouse|aparthotel|apartment|bed and breakfast|b&b|residence|pension)\b/i;
const FOOD_CATEGORY =
  /\b(restaurant|cafe|café|coffee|bar|pub|bakery|pizzeria|pizza|trattoria|osteria|bistro|brasserie|diner|eatery|steakhouse|steak house|grill|sushi|ramen|taqueria|food court|gelato|ice cream|dessert|cocktail|tea house|deli|takeout|fast food|noodle|burger|seafood|kitchen|wine bar|brewery|taproom)\b/i;

/** What Google's primary type says a place is; null when it says nothing. A hotel never belongs in "things to do". */
export function inferKind(category: string | undefined): PlaceKind | null {
  if (!category) return null;
  if (HOTEL_CATEGORY.test(category)) return "hotel";
  if (FOOD_CATEGORY.test(category)) return "restaurant";
  return "attraction";
}

/** The kind a place is stored under: what its category says, else what the caller asked for. */
export function catalogKind(kind: PlaceKind, category: string | undefined): PlaceKind {
  if (kind === "destination") return kind;
  return inferKind(category) ?? kind;
}
