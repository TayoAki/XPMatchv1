import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, type TravelerProfile } from "@/lib/types";
import type { ResolvedPlace } from "@/lib/places/types";
import { candidateFromPlace, scoreMatch } from "@/lib/match";
import { daysFromStay, localCuisine, planItinerary, visitMinutes, type ScoredPools } from "@/server/itineraries";

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
