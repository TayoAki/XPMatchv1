"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { newStopId } from "@/lib/itinerary";
import { labelFor, type MatchReason, type MatchResult } from "@/lib/match";
import { shortPlaceName } from "@/lib/places/names";
import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { whyFor } from "@/lib/recs/why";
import type { ItineraryDay, Trip, TravelerProfile, TripPlanner } from "@/lib/types";
import type { DraftPick, DraftStop, ItineraryDraft } from "@/server/itineraries";

/**
 * A card's itinerary: the complete plan the server builds for this traveler (see
 * `src/server/itineraries.ts`), loaded once per destination and length for the session and
 * shared by every card that asks for it, and turned into a trip in one step.
 */

const cache = new Map<string, Promise<ItineraryDraft>>();

export function loadItineraryDraft(destination: string, days: number, options: { fresh?: boolean; only?: string[]; exclude?: string[] } = {}): Promise<ItineraryDraft> {
  const only = options.only?.length ? [...options.only].sort() : undefined;
  const exclude = options.exclude?.length ? [...new Set(options.exclude)].sort() : undefined;
  const key = `${destination.trim().toLowerCase()}|${days}|${only?.join(",") ?? ""}|${exclude?.join(",") ?? ""}`;
  if (!options.fresh) {
    const hit = cache.get(key);
    if (hit) return hit;
  }
  const request = api<{ itinerary: ItineraryDraft }>("/api/itineraries", {
    method: "POST",
    json: { destination: destination.trim(), days, ...(only ? { only } : {}), ...(exclude ? { exclude } : {}) },
  })
    .then((res) => res.itinerary)
    .catch((err: unknown) => {
      cache.delete(key);
      throw err;
    });
  cache.set(key, request);
  return request;
}

/** The itinerary for `destination`, or nothing while it is null (a card that is not on screen yet). */
export function useItineraryDraft(destination: string | null, days: number) {
  const [state, setState] = useState<{ key: string; draft: ItineraryDraft | null; error: string | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const fresh = useRef(false);
  const key = destination ? `${destination}|${days}` : null;

  useEffect(() => {
    if (!destination || !key) return;
    let active = true;
    const again = fresh.current;
    fresh.current = false;
    loadItineraryDraft(destination, days, { fresh: again })
      .then((draft) => active && setState({ key, draft, error: null }))
      .catch((err: unknown) => active && setState({ key, draft: null, error: err instanceof Error ? err.message : "Could not build the itinerary" }));
    return () => {
      active = false;
    };
  }, [destination, days, key, attempt]);

  const retry = useCallback(() => {
    fresh.current = true;
    setAttempt((n) => n + 1);
  }, []);

  const ready = !!key && state?.key === key;
  return { draft: ready ? state.draft : null, error: ready ? state.error : null, loading: !!key && !ready, retry };
}

/**
 * The traveler's swaps: the id of a place in the plan as built → what shows in its place, one of
 * its ready alternates or any place of its kind they chose from a list or its own panel.
 */
export type Swaps = Record<string, DraftPick>;

/** How many options a pick offers after a swap: the place it replaced first, then the others. */
const OPTIONS = 3;

const bare = (p: DraftPick): DraftPick => ({ place: p.place, match: p.match, why: p.why });

/**
 * A place chosen for the plan from a list or its own panel, as light as the builder's alternates:
 * one photo, no reviews or map fields (it is saved with the trip as it is).
 */
export function planPick(place: ResolvedPlace, match: MatchResult, kind: PlaceKind = place.kind): DraftPick {
  const { id, name, lat, lng, address, locality, category, rating, userRatingCount, priceLevel, summary, googleMapsUri, websiteUri, types, source } = place;
  return {
    place: {
      id,
      name,
      kind,
      lat,
      lng,
      address,
      locality,
      category,
      rating,
      userRatingCount,
      priceLevel,
      summary,
      googleMapsUri,
      websiteUri,
      types,
      source,
      photos: place.photos?.slice(0, 1) ?? [],
      photoCredits: place.photoCredits?.slice(0, 1),
    },
    match,
    why: whyFor(match, place),
  };
}

/** A day's title from its first two things to do, as the builder names days. */
function dayTitle(stops: DraftStop[], fallback: string): string {
  return (
    stops
      .filter((s) => s.kind === "attraction")
      .slice(0, 2)
      .map((s) => shortPlaceName(s.place.name))
      .join(" · ") || fallback
  );
}

/**
 * The traveler's own order of the plan's stops: for each day (by number), the stops' ids as built
 * (`stopKey`) in the order they want them. A stop can be listed under another day than the one it
 * was built in; days without an entry keep their order.
 */
export type StopOrder = Record<number, string[]>;

/** A stop's id as built, which stays the same through swaps, so a moved stop keeps its slot when it is swapped. */
export const stopKey = (pick: DraftPick): string => pick.swappedFrom ?? pick.place.id;

/** Minutes between two stops, as the builder plans them. */
const GAP_MIN = 20;
const toMinutes = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};
const toHhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/**
 * The plan in the traveler's order. Each day takes the stops its entry lists, then re-times them
 * from the day's first start, back to back with 20 minutes between, a meal never earlier than it
 * was planned for. Days that did not change come back as they were, and the draft itself when none
 * did.
 */
export function applyOrder(draft: ItineraryDraft, order: StopOrder): ItineraryDraft {
  if (!Object.keys(order).length) return draft;
  const byKey = new Map<string, DraftStop>();
  for (const d of draft.days) for (const s of d.stops) byKey.set(stopKey(s), s);
  const placed = new Set<string>();
  const lists = draft.days.map((d) => {
    const stops: DraftStop[] = [];
    for (const key of order[d.day] ?? d.stops.map(stopKey)) {
      const stop = byKey.get(key);
      if (!stop || placed.has(key)) continue;
      placed.add(key);
      stops.push(stop);
    }
    return stops;
  });
  // A stop that no entry lists stays in the day it was built in, at the end.
  draft.days.forEach((d, i) => {
    for (const s of d.stops) {
      if (placed.has(stopKey(s))) continue;
      placed.add(stopKey(s));
      lists[i].push(s);
    }
  });
  let changed = false;
  const days = draft.days.map((d, i) => {
    const stops = lists[i];
    if (stops.length === d.stops.length && stops.every((s, j) => s === d.stops[j])) return d;
    changed = true;
    let at = d.stops.length ? Math.min(...d.stops.map((s) => toMinutes(s.startTime))) : toMinutes(stops[0]?.startTime ?? "09:30");
    const timed = stops.map((s) => {
      const start = s.meal ? Math.max(at, toMinutes(s.startTime)) : at;
      at = start + s.durationMin + GAP_MIN;
      return start === toMinutes(s.startTime) ? s : { ...s, startTime: toHhmm(start) };
    });
    return { ...d, stops: timed, title: timed.length ? dayTitle(timed, d.title) : "Free day" };
  });
  return changed ? { ...draft, days } : draft;
}

/**
 * The order after moving one stop (by `stopKey`) of the plan as shown to a day (by number), at a
 * position in that day's list. The plan's other stops keep their order.
 */
export function moveStopTo(shown: ItineraryDraft, key: string, toDay: number, toIndex: number): StopOrder {
  const lists = new Map(shown.days.map((d) => [d.day, d.stops.map(stopKey)] as const));
  const target = lists.get(toDay);
  const from = [...lists.values()].find((keys) => keys.includes(key));
  if (target && from) {
    from.splice(from.indexOf(key), 1);
    target.splice(Math.max(0, Math.min(toIndex, target.length)), 0, key);
  }
  return Object.fromEntries(lists);
}

/**
 * The plan with swaps applied: the swapped pick takes the chosen place, match and reason and
 * keeps its time, meal and length; its options become the place it replaced (so a swap can be
 * undone) and then its other alternates. Day titles and the plan's score follow.
 */
export function applySwaps(draft: ItineraryDraft, swaps: Swaps): ItineraryDraft {
  if (!Object.keys(swaps).length) return draft;
  const swap = <T extends DraftPick>(p: T): T => {
    const to = swaps[p.place.id];
    if (!to || to.place.id === p.place.id) return p;
    const alternates = [bare(p), ...(p.alternates ?? []).filter((a) => a.place.id !== to.place.id)].slice(0, OPTIONS);
    return { ...p, place: to.place, match: to.match, why: to.why, swappedFrom: p.place.id, alternates };
  };
  const stay = draft.stay ? swap(draft.stay) : null;
  const days = draft.days.map((d) => {
    const stops = d.stops.map(swap);
    if (stops.every((s, i) => s === d.stops[i])) return d;
    return { ...d, stops, title: dayTitle(stops, d.title) };
  });
  if (stay === draft.stay && days.every((d, i) => d === draft.days[i])) return draft;
  const scores = [...(stay ? [stay.match.score] : []), ...days.flatMap((d) => d.stops.map((s) => s.match.score))];
  const score = scores.length ? Math.max(5, Math.min(99, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length))) : draft.score;
  return { ...draft, stay, days, score };
}

/**
 * Swaps for the places the traveler marked not a fit: each such pick of the plan as built (or
 * the place swapped in for it) gives way to the first of its options (the place as built, then
 * its alternates) that is neither a miss nor already elsewhere in the plan.
 */
export function swapsForMisses(draft: ItineraryDraft, swaps: Swaps, missed: ReadonlySet<string>): Swaps {
  const out: Swaps = {};
  if (!missed.size) return out;
  const used = new Set(draftPicks(applySwaps(draft, swaps)).map((p) => p.place.id));
  for (const p of draftPicks(draft)) {
    const current = swaps[p.place.id]?.place.id ?? p.place.id;
    if (!missed.has(current)) continue;
    const next = [bare(p), ...(p.alternates ?? [])].find((o) => !missed.has(o.place.id) && !used.has(o.place.id));
    if (!next) continue;
    out[p.place.id] = next;
    used.add(next.place.id);
  }
  return out;
}

/** Every place the itinerary uses, the stay first. */
export function draftPicks(draft: ItineraryDraft) {
  return [...(draft.stay ? [draft.stay] : []), ...draft.days.flatMap((d) => d.stops)];
}

/**
 * The itinerary's score as a match for the badge: the label for its score and, as the reasons,
 * what a good share of its places have in common ("Matches Museums & art (4 places)").
 */
export function draftMatch(draft: ItineraryDraft): MatchResult {
  const picks = draftPicks(draft);
  const byText = new Map<string, { reason: MatchReason; total: number; count: number }>();
  for (const p of picks) {
    for (const r of p.match.reasons) {
      if (!r.delta) continue;
      const entry = byText.get(r.text) ?? { reason: r, total: 0, count: 0 };
      entry.total += r.delta;
      entry.count += 1;
      byText.set(r.text, entry);
    }
  }
  const shared = Math.max(1, Math.ceil(picks.length / 4));
  const reasons = [...byText.values()]
    .filter((e) => e.count >= shared)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
    .slice(0, 6)
    .map((e) => ({ ...e.reason, text: e.count > 1 ? `${e.reason.text} (${e.count} places)` : e.reason.text, delta: Math.round(e.total / e.count) }));
  return { score: draft.score, label: labelFor(draft.score), reasons, factors: [...new Set(picks.flatMap((p) => p.match.factors))] };
}

/** The trip's days: the stay first on day one, then every stop with its time and why it fits. */
export function draftToDays(draft: ItineraryDraft): ItineraryDay[] {
  return draft.days.map((d, i) => ({
    day: d.day,
    title: d.title,
    stops: [
      ...(i === 0 && draft.stay
        ? [{ id: newStopId(), title: shortPlaceName(draft.stay.place.name), kind: "hotel" as const, place: draft.stay.place, note: `Where you'll stay · ${draft.stay.why}` }]
        : []),
      ...d.stops.map((s) => ({
        id: newStopId(),
        title: shortPlaceName(s.place.name),
        kind: s.kind,
        place: s.place,
        startTime: s.startTime,
        durationMin: s.durationMin,
        note: s.meal ? `${s.meal === "lunch" ? "Lunch" : "Dinner"} · ${s.why}` : s.why,
      })),
    ],
  }));
}

/** What `addTrip` needs to save the itinerary: the chat's dates, travelers and budget when set, the profile's budget otherwise. */
export function draftTripInput(
  draft: ItineraryDraft,
  { name, label, planner, profile }: { name: string; label: string; planner: TripPlanner; profile: TravelerProfile },
): Pick<Trip, "title" | "destination"> & Partial<Pick<Trip, "startDate" | "endDate" | "travelers" | "budgetTier" | "summary" | "itinerary" | "place">> {
  const count = draft.days.length;
  const built = draft.basedOn.length ? ` from ${draft.basedOn.slice(0, 3).join(", ")}` : "";
  return {
    title: `${count} ${count === 1 ? "day" : "days"} in ${name}`,
    destination: label,
    place: draft.destination,
    ...(planner.startDate && planner.endDate ? { startDate: planner.startDate, endDate: planner.endDate } : {}),
    travelers: planner.travelers || undefined,
    budgetTier: planner.budgetTier || profile.budgetTier || undefined,
    summary: `Built for you${built}: ${draft.score}% match.${draft.stay ? ` Staying at ${shortPlaceName(draft.stay.place.name)}.` : ""}`,
    itinerary: draftToDays(draft),
  };
}
