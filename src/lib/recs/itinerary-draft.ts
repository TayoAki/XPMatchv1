"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { newStopId } from "@/lib/itinerary";
import { labelFor, type MatchReason, type MatchResult } from "@/lib/match";
import { shortPlaceName } from "@/lib/places/names";
import type { ItineraryDay, Trip, TravelerProfile, TripPlanner } from "@/lib/types";
import type { DraftPick, ItineraryDraft } from "@/server/itineraries";

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
 * The plan with swaps applied (`swaps`: the id of a place in the plan as built → the id of one of
 * its alternates): the swapped pick takes the alternate's place, match and reason and keeps its
 * time, meal and length; its own alternates become the place it replaced plus the others. Day
 * titles and the plan's score follow.
 */
export function applySwaps(draft: ItineraryDraft, swaps: Record<string, string>): ItineraryDraft {
  if (!Object.keys(swaps).length) return draft;
  const swap = <T extends DraftPick>(p: T): T => {
    const to = swaps[p.place.id];
    const alt = to && to !== p.place.id ? p.alternates?.find((a) => a.place.id === to) : undefined;
    if (!alt) return p;
    const replaced: DraftPick = { place: p.place, match: p.match, why: p.why };
    return { ...p, place: alt.place, match: alt.match, why: alt.why, swappedFrom: p.place.id, alternates: [replaced, ...(p.alternates ?? []).filter((a) => a.place.id !== to)] };
  };
  const stay = draft.stay ? swap(draft.stay) : null;
  const days = draft.days.map((d) => {
    const stops = d.stops.map(swap);
    if (stops.every((s, i) => s === d.stops[i])) return d;
    const title = stops
      .filter((s) => s.kind === "attraction")
      .slice(0, 2)
      .map((s) => shortPlaceName(s.place.name))
      .join(" · ");
    return { ...d, stops, title: title || d.title };
  });
  if (stay === draft.stay && days.every((d, i) => d === draft.days[i])) return draft;
  const scores = [...(stay ? [stay.match.score] : []), ...days.flatMap((d) => d.stops.map((s) => s.match.score))];
  const score = scores.length ? Math.max(5, Math.min(99, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length))) : draft.score;
  return { ...draft, stay, days, score };
}

/**
 * Swaps for the places the traveler marked not a fit: each such pick of the plan as built (or
 * the alternate swapped in for it) gives way to its first alternate that is not a miss too.
 */
export function swapsForMisses(draft: ItineraryDraft, swaps: Record<string, string>, missed: ReadonlySet<string>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!missed.size) return out;
  for (const p of draftPicks(draft)) {
    const current = swaps[p.place.id] ?? p.place.id;
    if (!missed.has(current)) continue;
    const next = [p.place.id, ...(p.alternates ?? []).map((a) => a.place.id)].find((id) => !missed.has(id));
    if (next) out[p.place.id] = next;
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
