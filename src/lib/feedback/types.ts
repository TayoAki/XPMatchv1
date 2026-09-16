import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import type { PreferenceDomain } from "@/lib/types";

/** Beli-style buckets: every reaction lands in one of three. */
export type FeedbackVerdict = "loved" | "fine" | "disliked";
export const VERDICTS: FeedbackVerdict[] = ["loved", "fine", "disliked"];
export const VERDICT_LABEL: Record<FeedbackVerdict, string> = { loved: "Loved it", fine: "It was fine", disliked: "Not for me" };

export type FeedbackSource = "card" | "sheet" | "trip" | "post_trip" | "hide" | "chat";

/** One traveler's reaction to one place. */
export interface PlaceFeedback {
  id: string;
  /** Google place id, or `name:<slug>` when the place never resolved. */
  placeId: string;
  kind: PlaceKind;
  name: string;
  destination?: string;
  place?: ResolvedPlace;
  verdict: FeedbackVerdict;
  reasons: string[];
  note: string;
  tripId?: string;
  source: FeedbackSource;
  /** 0–10 position from pairwise comparisons, when the traveler answered any. */
  score?: number;
  createdAt: string;
  updatedAt: string;
}

export type TasteDomain = "stays" | "food" | "activities" | "destinations";
export const TASTE_DOMAINS: TasteDomain[] = ["stays", "food", "activities", "destinations"];

export const DOMAIN_OF_KIND: Record<PlaceKind, TasteDomain> = {
  hotel: "stays",
  restaurant: "food",
  attraction: "activities",
  destination: "destinations",
};

export const TASTE_DOMAIN_LABEL: Record<TasteDomain, string> = {
  stays: "Stays",
  food: "Food",
  activities: "Things to do",
  destinations: "Destinations",
};

/** Where a taste domain's strong signals land in the Wave 1 preferences model. */
export const PREFERENCE_DOMAIN_OF: Record<TasteDomain, PreferenceDomain> = {
  stays: "stays",
  food: "food",
  activities: "activities",
  destinations: "general",
};

export interface ReasonChip {
  label: string;
  /** Third-person statement stored as a learned preference once the reason repeats. */
  statement: string;
}

/** Reason chips per domain: what stood out for a loved place, what went wrong for a disliked one. */
export const REASONS: Record<TasteDomain, { liked: ReasonChip[]; disliked: ReasonChip[] }> = {
  stays: {
    liked: [
      { label: "Quiet", statement: "Loves quiet stays" },
      { label: "Location", statement: "Values a central location" },
      { label: "Design", statement: "Loves well-designed hotels" },
      { label: "Clean", statement: "Values spotless rooms" },
      { label: "Service", statement: "Values attentive service" },
      { label: "Value", statement: "Appreciates good value stays" },
      { label: "Bed", statement: "Cares about a great bed" },
      { label: "Workspace", statement: "Likes a desk to work at" },
    ],
    disliked: [
      { label: "Noisy", statement: "Avoids noisy stays" },
      { label: "Far from center", statement: "Avoids stays far from the center" },
      { label: "Dated", statement: "Avoids dated hotels" },
      { label: "Not clean", statement: "Needs spotless rooms" },
      { label: "Poor service", statement: "Avoids hotels with poor service" },
      { label: "Overpriced", statement: "Price-sensitive on stays" },
      { label: "Bad bed", statement: "Needs a comfortable bed" },
      { label: "No workspace", statement: "Needs a desk in the room" },
    ],
  },
  food: {
    liked: [
      { label: "Taste", statement: "Chases standout food" },
      { label: "Value", statement: "Appreciates good value restaurants" },
      { label: "Ambiance", statement: "Loves a great atmosphere" },
      { label: "Service", statement: "Values warm service at restaurants" },
      { label: "Portions", statement: "Likes generous portions" },
    ],
    disliked: [
      { label: "Bland", statement: "Avoids bland food" },
      { label: "Overpriced", statement: "Price-sensitive on restaurants" },
      { label: "Loud", statement: "Avoids loud restaurants" },
      { label: "Slow service", statement: "Avoids slow service" },
      { label: "Long wait", statement: "Avoids long waits for a table" },
      { label: "Touristy", statement: "Avoids touristy restaurants" },
    ],
  },
  activities: {
    liked: [
      { label: "Worth it", statement: "Loves must-see sights" },
      { label: "Uncrowded", statement: "Loves uncrowded places" },
      { label: "Right length", statement: "Likes activities that do not drag" },
      { label: "Kid-friendly", statement: "Values kid-friendly activities" },
      { label: "Active", statement: "Enjoys physically active outings" },
    ],
    disliked: [
      { label: "Crowded", statement: "Avoids crowded attractions" },
      { label: "Too long", statement: "Avoids activities that take too long" },
      { label: "Overrated", statement: "Skips overrated sights" },
      { label: "Not kid-friendly", statement: "Needs kid-friendly activities" },
      { label: "Too demanding", statement: "Avoids physically demanding outings" },
    ],
  },
  destinations: {
    liked: [
      { label: "Vibe", statement: "Loves places with a strong vibe" },
      { label: "Food", statement: "Picks destinations for the food" },
      { label: "Affordable", statement: "Prefers affordable destinations" },
      { label: "Weather", statement: "Values good weather" },
      { label: "Walkable", statement: "Loves walkable cities" },
    ],
    disliked: [
      { label: "Bad vibe", statement: "Avoids places without a vibe" },
      { label: "Expensive", statement: "Avoids expensive destinations" },
      { label: "Bad weather", statement: "Avoids destinations with poor weather" },
      { label: "Felt unsafe", statement: "Needs to feel safe where they travel" },
      { label: "Too touristy", statement: "Avoids very touristy destinations" },
    ],
  },
};

export function reasonChips(kind: PlaceKind, verdict: FeedbackVerdict): ReasonChip[] {
  const set = REASONS[DOMAIN_OF_KIND[kind]];
  if (verdict === "loved") return set.liked;
  if (verdict === "disliked") return set.disliked;
  return [...set.liked.slice(0, 3), ...set.disliked.slice(0, 3)];
}

export interface ReasonCount {
  reason: string;
  count: number;
}

export interface RankedPlace {
  placeId: string;
  name: string;
  verdict: FeedbackVerdict;
  score?: number;
  category?: string;
}

export interface TasteDomainSummary {
  count: number;
  liked: ReasonCount[];
  disliked: ReasonCount[];
  /** Loved places first, by score, then fine, then disliked. */
  ranked: RankedPlace[];
  categories: ReasonCount[];
  /** Most common price level among loved places ("$$" style), when any. */
  priceTendency?: string;
}

export interface TasteProfile {
  updatedAt: string;
  total: number;
  domains: Partial<Record<TasteDomain, TasteDomainSummary>>;
}

export const EMPTY_TASTE: TasteProfile = { updatedAt: "", total: 0, domains: {} };

export const slugName = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

/** Key a reaction is stored under: the Google place id, or a name slug for places that never resolved. */
export function feedbackKey(name: string, place?: Pick<ResolvedPlace, "id" | "source"> | null): string {
  return place && place.source === "google" ? place.id : `name:${slugName(name)}`;
}

/** Finds the traveler's reaction to a place by id, falling back to the name for unresolved places. */
export function findFeedback(list: PlaceFeedback[], name: string | undefined, place?: Pick<ResolvedPlace, "id" | "source"> | null): PlaceFeedback | undefined {
  if (!name) return undefined;
  const key = feedbackKey(name, place);
  const byKey = list.find((f) => f.placeId === key);
  if (byKey) return byKey;
  const slug = `name:${slugName(name)}`;
  return list.find((f) => f.placeId === slug || slugName(f.name) === slugName(name));
}
