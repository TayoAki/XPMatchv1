/** A themed collection on Discover: three of them, each represented by one real destination's Places photo. */
export interface Collection {
  key: string;
  title: string;
  description: string;
  /** Inspiration `bestFor` tags the collection gathers. */
  tags: string[];
  /** The destination whose Google Places photo stands for the collection. */
  destination: string;
  /** Wikipedia titles for the fallback thumbnail when Places has no photo. */
  queries: string[];
}

export const COLLECTIONS: Collection[] = [
  {
    key: "water",
    title: "By the water",
    description: "Private islands, coastal retreats, and life on a slower tide.",
    tags: ["beach", "romance"],
    destination: "Amalfi Coast, Italy",
    queries: ["Amalfi Coast"],
  },
  {
    key: "nature",
    title: "Close to nature",
    description: "Mountains, forests, and places that restore.",
    tags: ["outdoors", "road trip", "photography"],
    destination: "Banff National Park, Canada",
    queries: ["Banff National Park"],
  },
  {
    key: "culture",
    title: "Immersed in culture",
    description: "Iconic cities, rich traditions, and deeper connections.",
    tags: ["culture", "art", "food"],
    destination: "Kyoto, Japan",
    queries: ["Kyoto"],
  },
];

export function findCollection(key: string | undefined | null): Collection | null {
  return COLLECTIONS.find((c) => c.key === key) ?? null;
}

/** The curated default for the Discover hero when the traveler has no destination in mind yet. */
export const DEFAULT_HERO_DESTINATION = "Paros, Greece";
