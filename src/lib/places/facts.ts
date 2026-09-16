import type { PlaceKind, PlaceReview } from "@/lib/places/types";

/**
 * Evidence about one place: what Google Places knows beyond the card (reviews,
 * Google's own review summary, attributes). Shared by the sheet, the Q&A card,
 * the comparison card and the heads-up chips.
 */

export interface PlaceAttribute {
  /** Places field name, e.g. "allowsDogs" or "accessibilityOptions.wheelchairAccessibleEntrance". */
  key: string;
  label: string;
  value: boolean | string;
}

export interface PlaceFacts {
  placeId: string;
  kind: PlaceKind;
  name: string;
  reviews: PlaceReview[];
  reviewSummary?: string;
  generativeSummary?: string;
  attributes: PlaceAttribute[];
  openingHours?: string[];
  websiteUri?: string;
  phone?: string;
  fetchedAt: string;
}

export type EvidenceTopic =
  | "noise"
  | "cleanliness"
  | "service"
  | "value"
  | "location"
  | "food"
  | "crowds"
  | "booking"
  | "workspace"
  | "family"
  | "accessibility"
  | "pets"
  | "parking"
  | "outdoor"
  | "time";

export const TOPIC_LABEL: Record<EvidenceTopic, string> = {
  noise: "Noise",
  cleanliness: "Cleanliness",
  service: "Service",
  value: "Value",
  location: "Location",
  food: "Food",
  crowds: "Crowds",
  booking: "Booking",
  workspace: "Workspace",
  family: "Kids",
  accessibility: "Accessibility",
  pets: "Pets",
  parking: "Parking",
  outdoor: "Outdoors",
  time: "Timing",
};

/** Review-tab chips, in display order. */
export const TOPIC_CHIPS: EvidenceTopic[] = ["noise", "cleanliness", "service", "value", "location", "food", "crowds", "booking", "workspace", "family", "accessibility"];

export interface EvidenceSnippet {
  reviewIndex: number;
  sentence: string;
  terms: string[];
  author: string;
  rating?: number;
  relativeTime?: string;
}

export interface Evidence {
  topics: EvidenceTopic[];
  snippets: EvidenceSnippet[];
  attributes: PlaceAttribute[];
  summaryHits: string[];
  /** Number of reviews that mention each topic (for the Reviews-tab chips). */
  topicCounts: Partial<Record<EvidenceTopic, number>>;
}

export type AnswerConfidence = "clear" | "mixed" | "thin" | "none";

export interface PlaceAnswer {
  placeId: string;
  name: string;
  question: string;
  answer: string;
  confidence: AnswerConfidence;
  evidence: Evidence;
  /** Which evidence items the answer rests on (indices into snippets / attributes / summaryHits). */
  refs: { type: "review" | "attribute" | "summary"; ref: number }[];
  /** Human-readable evidence base, e.g. "Google's review summary, 5 reviews and 12 attributes". */
  basis: string;
}

/** Suggested questions per kind, filtered later by what the traveler cares about. */
export const SUGGESTED_QUESTIONS: Record<PlaceKind, string[]> = {
  hotel: ["Is it quiet at night?", "Is there a desk to work at?", "How far is it from the center?", "Is it good for kids?", "Do they allow dogs?"],
  restaurant: ["Are there vegetarian options?", "Do I need to book?", "Is it good for a group?", "Is it loud?", "Is there outdoor seating?"],
  attraction: ["How long does it take?", "Is it crowded?", "Worth it with kids?", "Is it wheelchair accessible?", "When is the best time to go?"],
  destination: ["When is the best time to visit?", "Is it walkable?", "Is it expensive?"],
};
