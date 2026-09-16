import { describe, expect, it } from "vitest";
import { calibrationFrom, priceLevelNumber, scoreMatch, statementMatches, type MatchCandidate } from "@/lib/match";
import { DEFAULT_PROFILE, type LearnedPreference, type TravelerProfile } from "@/lib/types";
import type { TasteProfile } from "@/lib/feedback/types";
import { recQuality, type RecFeedback } from "@/lib/recs/types";
import { buildHomeQueries, pickTop } from "@/server/recommend";
import { todaysHours } from "@/lib/places/hours";

const profile: TravelerProfile = {
  ...DEFAULT_PROFILE,
  budgetTier: "mid-range",
  companions: "family",
  interests: ["Museums & art", "Nature & hiking"],
  stayTypes: ["Boutique hotel"],
  stayMustHaves: ["Pool", "Central location"],
  cuisines: ["Italian"],
  dietaryTags: ["Vegetarian"],
};

const rec = (over: Partial<RecFeedback>): RecFeedback => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  placeId: over.placeId ?? "p",
  kind: over.kind ?? "hotel",
  name: over.name ?? "Somewhere",
  context: over.context ?? "chat",
  verdict: over.verdict ?? "up",
  factors: over.factors ?? [],
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: over.updatedAt ?? "2026-09-01T00:00:00Z",
  ...over,
});

describe("match score", () => {
  it("rewards quality and a matching interest with explainable reasons", () => {
    const candidate: MatchCandidate = { kind: "attraction", name: "Galleria Borghese", category: "Art museum", rating: 4.8, userRatingCount: 50000 };
    const result = scoreMatch(candidate, { profile });
    expect(result.reasons.map((r) => r.factor)).toEqual(expect.arrayContaining(["quality", "interest"]));
    expect(result.reasons.find((r) => r.factor === "interest")?.text).toBe("Museums & art");
    expect(result.score).toBe(79);
    expect(result.label).toBe("Good match");
  });

  it("scores price against the budget tier", () => {
    const fit = scoreMatch({ kind: "restaurant", name: "A", priceLevel: "$$" }, { profile });
    const off = scoreMatch({ kind: "restaurant", name: "B", priceLevel: "$$$$" }, { profile });
    expect(fit.reasons.find((r) => r.factor === "price-fit")?.delta).toBe(10);
    expect(off.reasons.find((r) => r.factor === "price-off")?.delta).toBe(-10);
    expect(off.score).toBeLessThan(fit.score);
    expect(priceLevelNumber("Free")).toBe(0);
    expect(priceLevelNumber("$$$")).toBe(3);
    expect(priceLevelNumber("cheap")).toBeNull();
  });

  it("matches stay types, must-haves, cuisines and dietary tags from the text", () => {
    const hotel = scoreMatch({ kind: "hotel", name: "Artemide", text: "Boutique hotel with a rooftop pool in the center" }, { profile });
    expect(hotel.reasons.map((r) => r.text)).toEqual(expect.arrayContaining(["Boutique hotel", "Pool", "Central location"]));
    const trattoria = scoreMatch({ kind: "restaurant", name: "Da Enzo", category: "Trattoria", text: "Great vegetarian pasta options" }, { profile });
    expect(trattoria.reasons.map((r) => r.factor)).toEqual(expect.arrayContaining(["cuisine", "dietary"]));
  });

  it("names a dealbreaker conflict found in the heads-ups and a liked twin from the taste profile", () => {
    const preferences: LearnedPreference[] = [{ id: "1", domain: "stays", polarity: "dealbreaker", statement: "Street noise at night", source: "onboarding", createdAt: "" }];
    const conflict = scoreMatch({ kind: "hotel", name: "Front", tradeoffs: ["Street noise at night in front rooms"] }, { profile, preferences });
    expect(conflict.reasons.find((r) => r.factor === "dealbreaker")?.delta).toBe(-25);
    const clean = scoreMatch({ kind: "hotel", name: "Court", tradeoffs: ["Small elevator"] }, { profile, preferences });
    expect(clean.reasons.some((r) => r.factor === "dealbreaker")).toBe(false);

    const taste: TasteProfile = {
      updatedAt: "",
      total: 1,
      domains: { food: { count: 1, liked: [{ reason: "Ambiance", count: 1 }], disliked: [], categories: [], ranked: [{ placeId: "x", name: "Trattoria Da Enzo al 29", verdict: "loved", category: "Trattoria" }] } },
    };
    const twin = scoreMatch({ kind: "restaurant", name: "Osteria Nuova", category: "Trattoria" }, { profile, taste });
    expect(twin.reasons.find((r) => r.factor === "taste-twin")?.text).toBe("Like Trattoria Da Enzo al 29, which you loved");
  });

  it("remembers a pick the traveler already passed on", () => {
    const recFeedback = [rec({ name: "Hotel de Russie", kind: "hotel", verdict: "down" })];
    const again = scoreMatch({ kind: "hotel", name: "Hotel de Russie", rating: 4.6, userRatingCount: 2000 }, { profile, recFeedback });
    expect(again.reasons.find((r) => r.factor === "passed-before")?.delta).toBe(-30);
    expect(again.label).toBe("Probably not you");
  });

  it("dampens factors that keep misleading the traveler", () => {
    const recFeedback = [rec({ verdict: "down", factors: ["price-fit"] }), rec({ verdict: "down", factors: ["price-fit"] }), rec({ verdict: "down", factors: ["price-fit", "quality"] })];
    expect(calibrationFrom(recFeedback)["price-fit"]).toBe(0.5);
    expect(calibrationFrom(recFeedback).quality).toBeUndefined();
    const scored = scoreMatch({ kind: "restaurant", name: "C", priceLevel: "$$" }, { profile, recFeedback });
    expect(scored.reasons.find((r) => r.factor === "price-fit")?.delta).toBe(5);
  });

  it("matches statements by their content words", () => {
    expect(statementMatches("Street noise at night", "street noise reported at night")).toBe(true);
    expect(statementMatches("Street noise at night", "lively nightlife district")).toBe(false);
    expect(statementMatches("Prefers boutique hotels", "a boutique stay near the piazza")).toBe(true);
  });
});

describe("recommendation quality", () => {
  it("counts hits and misses by kind, context and reason", () => {
    const q = recQuality([
      rec({ verdict: "up", kind: "hotel", context: "chat" }),
      rec({ verdict: "down", kind: "hotel", context: "home", reason: "Too pricey", name: "Miss One", updatedAt: "2026-09-02T00:00:00Z" }),
      rec({ verdict: "down", kind: "restaurant", context: "home", reason: "Too pricey" }),
      rec({ verdict: "up", kind: "attraction", context: "board" }),
    ]);
    expect(q.total).toBe(4);
    expect(q.hitRate).toBe(50);
    expect(q.byKind.hotel).toEqual({ up: 1, down: 1 });
    expect(q.byContext.home).toEqual({ up: 0, down: 2 });
    expect(q.reasons[0]).toEqual({ reason: "Too pricey", count: 2 });
    expect(q.recentMisses[0].name).toBe("Miss One");
    expect(recQuality([]).hitRate).toBeNull();
  });
});

describe("home picks", () => {
  it("builds profile-driven queries with sensible defaults", () => {
    const q = buildHomeQueries(profile);
    expect(q.things.map((t) => t.query)).toEqual(["museums and art galleries", "parks and hiking trails"]);
    expect(q.stays[0]).toMatchObject({ query: "boutique hotels with a pool", kind: "hotel", basedOn: "Boutique hotel" });
    expect(q.stays.some((s) => s.query === "hotels in the center")).toBe(true);
    expect(q.eat.map((e) => e.query)).toEqual(["trattoria", "vegetarian restaurants"]);
    const bare = buildHomeQueries({ ...DEFAULT_PROFILE, travelStyles: ["Culture & history"] });
    expect(bare.things.map((t) => t.query)).toEqual(["historic landmarks and museums", "top things to do"]);
    expect(bare.stays.map((s) => s.query)).toEqual(["well-rated hotels"]);
    expect(bare.eat.map((e) => e.query)).toEqual(["best restaurants"]);
  });

  it("keeps the best three with different categories when it can", () => {
    const place = (id: string, category: string, score: number) => ({
      place: { id, name: id, kind: "attraction" as const, lat: 0, lng: 0, category, photos: [], source: "google" as const },
      match: { score, label: "Good match" as const, reasons: [], factors: [] },
    });
    const picked = pickTop([place("a", "Museum", 90), place("b", "Museum", 85), place("c", "Park", 80), place("d", "Museum", 75), place("e", "Church", 70)]);
    expect(picked.map((p) => p.place.id)).toEqual(["a", "c", "e"]);
    expect(pickTop([place("a", "Museum", 90), place("b", "Museum", 85)]).map((p) => p.place.id)).toEqual(["a", "b"]);
  });
});

describe("stop details", () => {
  it("picks today's line from the weekly hours", () => {
    const monday = new Date("2026-09-14T12:00:00");
    expect(todaysHours(["Monday: 8:30 AM–7:15 PM", "Tuesday: Closed"], monday)).toBe("8:30 AM–7:15 PM");
    expect(todaysHours(["Tuesday: Closed"], monday)).toBeNull();
    expect(todaysHours(undefined, monday)).toBeNull();
  });
});
