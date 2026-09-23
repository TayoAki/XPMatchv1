import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, type TravelerProfile } from "@/lib/types";
import type { ResolvedPlace } from "@/lib/places/types";
import { candidateFromPlace, scoreMatch } from "@/lib/match";
import { daysFromStay, localCuisine, planItinerary, visitMinutes, type ItineraryDraft, type ScoredPools } from "@/server/itineraries";
import { applyOrder, applySwaps, draftPicks, moveStopTo, planPick, stopKey, swapsForMisses } from "@/lib/recs/itinerary-draft";

const profile: TravelerProfile = { ...DEFAULT_PROFILE, pace: "balanced", dayRhythm: "balanced", walking: "moderate" };
const destination: ResolvedPlace = { id: "city", name: "Rome", kind: "destination", lat: 41.9, lng: 12.5, photos: [], source: "google" };

let n = 0;
function scored(kind: ResolvedPlace["kind"], score: number, lat: number, lng: number, over: Partial<ResolvedPlace> = {}) {
  n += 1;
  const place: ResolvedPlace = { id: `${kind}-${n}`, name: `${kind} ${n}`, kind, lat, lng, photos: [], source: "google", category: `${kind} type ${n}`, ...over };
  return { place, match: { ...scoreMatch(candidateFromPlace(place), { profile }), score } };
}

/** Two areas about 3 km apart, a stay in the first. */
function pools(): ScoredPools {
  return {
    hotel: [scored("hotel", 80, 41.9, 12.5), scored("hotel", 70, 41.95, 12.6)],
    attraction: [
      scored("attraction", 90, 41.9, 12.5),
      scored("attraction", 85, 41.901, 12.501),
      scored("attraction", 84, 41.9, 12.502),
      scored("attraction", 83, 41.87, 12.47),
      scored("attraction", 82, 41.871, 12.471),
      scored("attraction", 81, 41.87, 12.472),
    ],
    restaurant: [scored("restaurant", 88, 41.9, 12.501), scored("restaurant", 86, 41.87, 12.471), scored("restaurant", 80, 41.9, 12.5), scored("restaurant", 78, 41.871, 12.47)],
  };
}

describe("planItinerary", () => {
  it("builds the days from the stay, the things to do by pace and a dinner every day, each place once", () => {
    const plan = planItinerary(pools(), destination, profile, 2);
    expect(plan.stay?.place.name).toBe("hotel 1");
    expect(plan.days).toHaveLength(2);
    const ids = plan.days.flatMap((d) => d.stops.map((s) => s.place.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const day of plan.days) {
      expect(day.stops.filter((s) => s.kind === "attraction").length).toBeLessThanOrEqual(3);
      expect(day.stops.filter((s) => s.meal === "dinner")).toHaveLength(1);
      expect(day.title.length).toBeGreaterThan(0);
    }
    expect(plan.score).toBeGreaterThan(70);
  });

  it("keeps each area on its own day and starts with the best one", () => {
    const plan = planItinerary(pools(), destination, profile, 2);
    const areaOf = (lat: number) => (lat > 41.885 ? "north" : "south");
    for (const day of plan.days) {
      const areas = new Set(day.stops.filter((s) => s.kind === "attraction").map((s) => areaOf(s.place.lat)));
      expect(areas.size).toBe(1);
    }
    expect(plan.days[0].stops.some((s) => s.match.score === 90)).toBe(true);
  });

  it("sets times by the day rhythm, lunch between the visits and dinner last", () => {
    const early = planItinerary(pools(), destination, { ...profile, dayRhythm: "early" }, 2);
    const first = early.days[0].stops;
    expect(first[0].startTime).toBe("08:30");
    expect(first[first.length - 1].meal).toBe("dinner");
    expect(first[first.length - 1].startTime >= "18:30").toBe(true);
    const lunch = first.find((s) => s.meal === "lunch");
    if (lunch) expect(lunch.startTime >= "12:30").toBe(true);
    const times = first.map((s) => s.startTime);
    expect([...times].sort()).toEqual(times);
  });

  it("gives dinners first when there are not enough places to eat for lunch too", () => {
    const p = pools();
    p.restaurant = p.restaurant.slice(0, 2);
    const plan = planItinerary(p, destination, profile, 2);
    expect(plan.days.flatMap((d) => d.stops).filter((s) => s.meal === "lunch")).toHaveLength(0);
    expect(plan.days.flatMap((d) => d.stops).filter((s) => s.meal === "dinner")).toHaveLength(2);
  });

  it("relaxed pace means fewer stops a day; a thin pool means fewer days", () => {
    const relaxed = planItinerary(pools(), destination, { ...profile, pace: "relaxed" }, 3);
    for (const day of relaxed.days) expect(day.stops.filter((s) => s.kind === "attraction").length).toBeLessThanOrEqual(2);
    const thin = pools();
    thin.attraction = thin.attraction.slice(0, 2);
    expect(planItinerary(thin, destination, profile, 5).days).toHaveLength(2);
  });

  it("takes one branch of a place, not two with the same name", () => {
    const p = pools();
    p.attraction = [
      scored("attraction", 90, 41.9, 12.5, { name: "National Museum of Modern and Contemporary Art, Deoksugung" }),
      scored("attraction", 89, 41.9, 12.501, { name: "National Museum of Modern and Contemporary Art, Seoul" }),
      scored("attraction", 70, 41.9, 12.502),
    ];
    const names = planItinerary(p, destination, profile, 1).days.flatMap((d) => d.stops.filter((s) => s.kind === "attraction").map((s) => s.place.name));
    expect(names.filter((n) => n.startsWith("National Museum"))).toHaveLength(1);
  });

  it("nudges the meals toward the local food", () => {
    const seoul: ResolvedPlace = { ...destination, name: "Seoul", address: "Seoul, South Korea", lat: 37.56, lng: 126.98 };
    const p: ScoredPools = {
      hotel: [scored("hotel", 80, 37.56, 126.98)],
      attraction: [scored("attraction", 80, 37.56, 126.98)],
      restaurant: [scored("restaurant", 86, 37.56, 126.981, { category: "Italian restaurant" }), scored("restaurant", 80, 37.561, 126.98, { category: "Korean barbecue restaurant" })],
    };
    // The Italian place scores higher, but in Seoul the Korean one is picked first (lunch here).
    const meals = planItinerary(p, seoul, profile, 1).days[0].stops.filter((s) => s.meal);
    expect(meals.map((s) => s.place.category)).toEqual(["Korean barbecue restaurant", "Italian restaurant"]);
    const austell: ResolvedPlace = { ...seoul, name: "Austell", address: "Austell, GA, USA" };
    const plain = planItinerary(p, austell, profile, 1).days[0].stops.filter((s) => s.meal);
    expect(plain[0].place.category).toBe("Italian restaurant");
    expect(localCuisine(seoul)).toBe("korean");
    expect(localCuisine({ ...destination, address: "Austell, GA, USA" })).toBeNull();
  });

  it("has no days when there is nothing to do or eat", () => {
    const plan = planItinerary({ hotel: [], attraction: [], restaurant: [] }, destination, profile, 3);
    expect(plan.days).toEqual([]);
    expect(plan.stay).toBeNull();
  });
});

describe("swaps", () => {
  /** A one-day plan with a spare hotel, as the client gets it. */
  function draft(): ItineraryDraft {
    const p = pools();
    p.hotel.push(scored("hotel", 60, 41.9, 12.5));
    return { ...planItinerary(p, destination, profile, 1), destination, basedOn: [], provider: "google", generatedAt: "2026-09-01T00:00:00Z" };
  }

  it("gives the stay and every stop ready alternates the plan does not use, one photo each", () => {
    const plan = draft();
    const picks = draftPicks(plan);
    const used = new Set(picks.map((p) => p.place.id));
    expect(plan.stay?.alternates?.map((a) => a.place.kind)).toEqual(["hotel", "hotel"]);
    for (const pick of picks) {
      expect(pick.alternates?.length).toBeGreaterThan(0);
      expect(pick.alternates!.length).toBeLessThanOrEqual(3);
      for (const alt of pick.alternates!) {
        expect(used.has(alt.place.id)).toBe(false);
        expect(alt.place.kind).toBe(pick.place.kind);
        expect(alt.place.photos.length).toBeLessThanOrEqual(1);
      }
    }
  });

  it("puts a swapped-in place where the pick was and keeps the one it replaced as an option", () => {
    const plan = draft();
    const stop = plan.days[0].stops.find((s) => s.kind === "attraction")!;
    const to = stop.alternates![0];
    const swapped = applySwaps(plan, { [stop.place.id]: to });
    const now = swapped.days[0].stops.find((s) => s.startTime === stop.startTime)!;
    expect(now.place.id).toBe(to.place.id);
    expect(now.swappedFrom).toBe(stop.place.id);
    expect(now.durationMin).toBe(stop.durationMin);
    expect(now.alternates?.[0].place.id).toBe(stop.place.id);
    expect(now.alternates?.some((a) => a.place.id === to.place.id)).toBe(false);
    expect(now.alternates!.length).toBeLessThanOrEqual(3);
    // The rest of the plan is untouched, and swapping back is the plan as built.
    expect(swapped.stay).toBe(plan.stay);
    expect(applySwaps(plan, { [stop.place.id]: stop })).toBe(plan);
    expect(applySwaps(plan, {})).toBe(plan);
  });

  it("takes any place of the kind chosen from a list, light enough to save with the trip", () => {
    const plan = draft();
    const stay = plan.stay!;
    const elsewhere = scored("hotel", 77, 41.91, 12.49, { name: "Hotel Elsewhere", photos: ["/p/1", "/p/2", "/p/3"] });
    const pick = planPick({ ...elsewhere.place, reviews: [{ author: "A", text: "Great" }] } as ResolvedPlace, elsewhere.match, "hotel");
    expect(pick.place.photos).toEqual(["/p/1"]);
    expect("reviews" in pick.place).toBe(false);
    expect(pick.why.length).toBeGreaterThan(0);
    const swapped = applySwaps(plan, { [stay.place.id]: pick });
    expect(swapped.stay?.place.name).toBe("Hotel Elsewhere");
    expect(swapped.stay?.swappedFrom).toBe(stay.place.id);
    // The stay it replaced leads its options, which stay at three.
    expect(swapped.stay?.alternates?.[0].place.id).toBe(stay.place.id);
    expect(swapped.stay?.alternates).toHaveLength(3);
  });

  it("swaps a place marked not a fit for its first option that is neither a miss nor elsewhere in the plan", () => {
    const plan = draft();
    const stay = plan.stay!;
    const [first, second] = stay.alternates!;
    expect(swapsForMisses(plan, {}, new Set())).toEqual({});
    expect(swapsForMisses(plan, {}, new Set([stay.place.id]))[stay.place.id].place.id).toBe(first.place.id);
    expect(swapsForMisses(plan, {}, new Set([stay.place.id, first.place.id]))[stay.place.id].place.id).toBe(second.place.id);
    // A miss on the place swapped in goes back to the one it replaced.
    expect(swapsForMisses(plan, { [stay.place.id]: first }, new Set([first.place.id]))[stay.place.id].place.id).toBe(stay.place.id);
    // With every option a miss, the plan keeps what it has.
    expect(swapsForMisses(plan, {}, new Set([stay.place.id, ...stay.alternates!.map((a) => a.place.id)]))).toEqual({});
    // An option another stop already took is passed over.
    const [a, b] = plan.days[0].stops.filter((s) => s.kind === "attraction");
    const shared = a.alternates![0];
    const out = swapsForMisses(plan, { [b.place.id]: shared }, new Set([a.place.id]));
    expect(out[a.place.id].place.id).toBe(a.alternates![1].place.id);
  });
});

describe("reordering", () => {
  /** A two-day plan, as the client gets it, with a spare thing to do so stops have alternates. */
  function draft(): ItineraryDraft {
    const p = pools();
    p.attraction.push(scored("attraction", 60, 41.9, 12.503));
    return { ...planItinerary(p, destination, profile, 2), destination, basedOn: [], provider: "google", generatedAt: "2026-09-01T00:00:00Z" };
  }
  const keys = (plan: ItineraryDraft, day: number) => plan.days.find((d) => d.day === day)!.stops.map(stopKey);
  const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

  it("moves a stop within its day and re-times the day from its first start, 20 minutes between", () => {
    const plan = draft();
    const day = plan.days[0];
    const [a, b] = day.stops;
    const order = moveStopTo(plan, stopKey(b), 1, 0);
    expect(order[1].slice(0, 2)).toEqual([stopKey(b), stopKey(a)]);
    const moved = applyOrder(plan, order);
    const stops = moved.days[0].stops;
    expect(stops[0].place.id).toBe(b.place.id);
    expect(stops[0].startTime).toBe(day.stops[0].startTime);
    expect(stops[1].startTime).toBe(
      `${String(Math.floor((minutes(stops[0].startTime) + stops[0].durationMin + 20) / 60)).padStart(2, "0")}:${String((minutes(stops[0].startTime) + stops[0].durationMin + 20) % 60).padStart(2, "0")}`,
    );
    // Times still run forward, and the other day is untouched.
    const times = stops.map((s) => s.startTime);
    expect([...times].sort()).toEqual(times);
    expect(moved.days[1]).toBe(plan.days[1]);
  });

  it("never puts a meal earlier than it was planned for", () => {
    const plan = draft();
    const dinner = plan.days[0].stops.find((s) => s.meal === "dinner")!;
    const moved = applyOrder(plan, moveStopTo(plan, stopKey(dinner), 1, 0));
    const first = moved.days[0].stops[0];
    expect(first.place.id).toBe(dinner.place.id);
    expect(first.startTime).toBe(dinner.startTime);
    // What follows the dinner starts after it.
    expect(minutes(moved.days[0].stops[1].startTime)).toBeGreaterThanOrEqual(minutes(dinner.startTime) + dinner.durationMin + 20);
  });

  it("moves a stop to another day, and the day it left keeps its order", () => {
    const plan = draft();
    const [a] = plan.days[0].stops;
    const moved = applyOrder(plan, moveStopTo(plan, stopKey(a), 2, 0));
    expect(keys(moved, 2)[0]).toBe(stopKey(a));
    expect(keys(moved, 1)).toEqual(keys(plan, 1).slice(1));
    expect(moved.days[1].stops[0].startTime).toBe(plan.days[1].stops[0].startTime);
    // Every place is still in the plan once, and the score is the same.
    const ids = moved.days.flatMap((d) => d.stops.map((s) => s.place.id));
    expect(new Set(ids).size).toBe(plan.days.flatMap((d) => d.stops).length);
    expect(moved.score).toBe(plan.score);
  });

  it("keeps a moved stop's place when it is swapped, and a swapped one where it was moved", () => {
    const plan = draft();
    const stop = plan.days[0].stops.find((s) => s.kind === "attraction")!;
    const to = stop.alternates![0];
    const order = moveStopTo(plan, stopKey(stop), 2, 0);
    const shown = applyOrder(applySwaps(plan, { [stop.place.id]: to }), order);
    expect(shown.days[1].stops[0].place.id).toBe(to.place.id);
    expect(stopKey(shown.days[1].stops[0])).toBe(stop.place.id);
  });

  it("returns the plan itself when the order changes nothing, and names an emptied day a free day", () => {
    const plan = draft();
    expect(applyOrder(plan, {})).toBe(plan);
    expect(applyOrder(plan, { 1: keys(plan, 1), 2: keys(plan, 2) })).toBe(plan);
    // A key that is not in the plan is ignored; a stop no day lists stays in its own day, at the end.
    const [first, ...rest] = keys(plan, 1);
    const partial = applyOrder(plan, { 1: [...rest, "nowhere"] });
    expect(keys(partial, 1)).toEqual([...rest, first]);
    let emptied = plan;
    for (const key of keys(plan, 1)) emptied = applyOrder(plan, moveStopTo(emptied, key, 2, 99));
    expect(emptied.days[0].stops).toHaveLength(0);
    expect(emptied.days[0].title).toBe("Free day");
  });
});

describe("daysFromStay", () => {
  it("reads the suggested stay", () => {
    expect(daysFromStay("3–4 nights")).toBe(3);
    expect(daysFromStay("2 days")).toBe(2);
    expect(daysFromStay("a week")).toBe(7);
    expect(daysFromStay("a long weekend")).toBe(3);
    expect(daysFromStay("weekend")).toBe(2);
    expect(daysFromStay("10 days")).toBe(7);
    expect(daysFromStay(undefined)).toBe(3);
  });
});

describe("visitMinutes", () => {
  it("gives museums longer than viewpoints", () => {
    expect(visitMinutes({ ...destination, kind: "attraction", category: "Art museum" })).toBe(120);
    expect(visitMinutes({ ...destination, kind: "attraction", category: "Observation deck", name: "N Seoul Tower" })).toBe(60);
  });
});
