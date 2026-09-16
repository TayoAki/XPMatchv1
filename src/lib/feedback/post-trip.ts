import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import type { Trip, TripDetail } from "@/lib/types";
import { feedbackKey, type PlaceFeedback } from "./types";

/** A place the traveler can rate after a trip: an idea or a scheduled stop with a resolved pin. */
export interface RatingCandidate {
  key: string;
  name: string;
  kind: PlaceKind;
  place: ResolvedPlace;
  destination: string;
}

const RATING_WINDOW_DAYS = 45;

/** True from the day after the trip's end date, for about six weeks. */
export function tripEnded(trip: Pick<Trip, "endDate">, now = new Date()): boolean {
  if (!trip.endDate) return false;
  const end = new Date(`${trip.endDate}T23:59:59`);
  if (Number.isNaN(end.getTime())) return false;
  const age = (now.getTime() - end.getTime()) / 86400000;
  return age > 0 && age <= RATING_WINDOW_DAYS;
}

/** Unique placed ideas and stops of a trip, in itinerary order first, minus the ones already rated. */
export function ratingCandidates(trip: TripDetail, feedback: PlaceFeedback[] = []): RatingCandidate[] {
  const seen = new Set<string>();
  const rated = new Set(feedback.map((f) => f.placeId));
  const out: RatingCandidate[] = [];
  const push = (name: string, place: ResolvedPlace | undefined) => {
    if (!place || place.kind === "destination") return;
    const key = feedbackKey(name, place);
    if (seen.has(key) || rated.has(key)) return;
    seen.add(key);
    out.push({ key, name: place.name || name, kind: place.kind, place, destination: trip.destination });
  };
  for (const day of trip.itinerary) for (const stop of day.stops) push(stop.title, stop.place);
  for (const item of trip.items) if (item.kind !== "media") push(item.title, item.place);
  return out;
}

/** Trips worth a "How was it?" prompt: ended recently, with something to rate, not dismissed. */
export function tripsToRate(trips: Trip[], dismissed: Set<string>, now = new Date()): Trip[] {
  return trips.filter((t) => tripEnded(t, now) && !dismissed.has(t.id));
}
