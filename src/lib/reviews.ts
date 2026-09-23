import type { FeedbackVerdict } from "@/lib/feedback/types";
import type { PlaceKind } from "@/lib/places/types";
import type { TravelerProfile } from "@/lib/types";

/**
 * Traveler reviews: what someone who went thinks of a place, with proof they were there when
 * they have it. Pure helpers shared by the server (proof, similarity) and the place panel.
 */

/** How a traveler showed they were there: a check-in on the spot, or a booking of theirs that has started. */
export type VisitProof = "checked_in" | "booked";
export const PROOF_LABEL: Record<VisitProof, string> = { checked_in: "Checked in", booked: "Booked" };

export const REVIEW_MAX = 1200;

/** One traveler's review of a place, as another traveler sees it. */
export interface TravelerReview {
  id: string;
  /** First name and last initial ("Tayo A."); the viewer's own reads "You". */
  author: string;
  mine: boolean;
  verdict: FeedbackVerdict;
  text: string;
  at: string;
  proof: VisitProof | null;
  /** Their profile overlaps the viewer's enough to count as "travels like you". */
  similar: boolean;
  /** What the two have in common, strongest first. */
  inCommon: string[];
  /** Shown to other travelers (the viewer always sees their own). */
  shared: boolean;
}

export interface ReviewSummary {
  count: number;
  verified: number;
  loved: number;
  /** Verified reviews by travelers like the viewer who loved the place. */
  similarLoved: number;
}

export interface PlaceReviews {
  reviews: TravelerReview[];
  summary: ReviewSummary;
  /** The viewer's own review, when they wrote one (also in `reviews`). */
  mine: TravelerReview | null;
  /** The viewer's own proof for this place, so the form can say "Checked in" before they post. */
  myProof: VisitProof | null;
}

/** "Tayo Akigbogun" → "Tayo A."; a single name stays whole. */
export function reviewerName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Traveler";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

const OUTDOOR = /park|garden|trail|hik|beach|mountain|nature|forest|lake|island|zoo|preserve|valley|waterfall|river|viewpoint|scenic|lookout|market|square|piazza/i;

/** How close a check-in has to be: a hotel or a restaurant is one building, a park or a trail is not. */
export function checkInRadiusMeters(kind: PlaceKind, category?: string): number {
  if (kind === "hotel") return 150;
  if (kind === "restaurant") return 120;
  if (kind === "destination") return 20_000;
  return OUTDOOR.test(category ?? "") ? 600 : 250;
}

/** Location readings worse than this cannot tell one street from the next. */
export const MAX_ACCURACY_M = 200;

/** Why a check-in does not stand, or null when it does. The reading's own uncertainty counts in its favor, up to 100 m. */
export function checkInProblem(distanceM: number, accuracyM: number, radiusM: number): "imprecise" | "far" | null {
  if (!Number.isFinite(accuracyM) || accuracyM > MAX_ACCURACY_M) return "imprecise";
  if (distanceM > radiusM + Math.min(Math.max(accuracyM, 0), 100)) return "far";
  return null;
}

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/** "about 2.3 km", "about 400 m" */
export function formatDistance(meters: number): string {
  return meters >= 1000 ? `about ${(meters / 1000).toFixed(meters >= 10_000 ? 0 : 1)} km` : `about ${Math.round(meters / 50) * 50 || 50} m`;
}

/** Two check-ins that would need a faster trip than a plane between them (a reading someone made up). */
export function impossibleTravel(prev: { lat: number; lng: number; at: Date }, next: { lat: number; lng: number; at: Date }): boolean {
  const km = haversineMeters(prev, next) / 1000;
  if (km < 50) return false;
  const hours = Math.max((next.at.getTime() - prev.at.getTime()) / 3_600_000, 1 / 60);
  return km / hours > 900;
}

const norm = (s: string) => s.trim().toLowerCase();

/** At or above this, a reviewer "travels like you". */
export const SIMILAR_AT = 0.4;

/**
 * How alike two travelers are (0–1) and what they share: the overlap of what they like
 * (interests, food, kinds of stay, travel styles) plus the same budget, company and pace. Without
 * anything liked in common they are not alike, whatever else matches (budget, company and pace
 * have defaults most travelers never change).
 */
export function travelerSimilarity(a: TravelerProfile, b: TravelerProfile): { score: number; inCommon: string[] } {
  const tags = (p: TravelerProfile) => [...(p.interests ?? []), ...(p.cuisines ?? []), ...(p.stayTypes ?? []), ...(p.travelStyles ?? [])].filter(Boolean);
  const aTags = tags(a);
  const bSet = new Set(tags(b).map(norm));
  const aSet = new Set(aTags.map(norm));
  const union = new Set([...aSet, ...bSet]);
  const inCommon = [...new Set(aTags.filter((t) => bSet.has(norm(t))))];
  if (!inCommon.length) return { score: 0, inCommon: [] };
  const overlap = inCommon.length / union.size;
  let score = overlap * 0.7;
  if (a.budgetTier && a.budgetTier === b.budgetTier) score += 0.15;
  if (a.companions && a.companions === b.companions) score += 0.1;
  if (a.pace && a.pace === b.pace) score += 0.05;
  return { score: Math.min(1, Math.round(score * 100) / 100), inCommon: inCommon.slice(0, 3) };
}
