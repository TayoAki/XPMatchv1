import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, type TravelerProfile } from "@/lib/types";
import { MAX_ACCURACY_M, SIMILAR_AT, checkInProblem, checkInRadiusMeters, formatDistance, haversineMeters, impossibleTravel, reviewerName, travelerSimilarity } from "@/lib/reviews";

const traveler = (over: Partial<TravelerProfile>): TravelerProfile => ({ ...DEFAULT_PROFILE, ...over });

describe("reviewerName", () => {
  it("shows a first name and a last initial, a single name whole", () => {
    expect(reviewerName("Tayo Akigbogun")).toBe("Tayo A.");
    expect(reviewerName("  Mary  Jane  watson ")).toBe("Mary W.");
    expect(reviewerName("Cher")).toBe("Cher");
    expect(reviewerName("   ")).toBe("Traveler");
  });
});

describe("check-ins", () => {
  it("needs to be closer to a building than to a park", () => {
    expect(checkInRadiusMeters("hotel")).toBe(150);
    expect(checkInRadiusMeters("restaurant")).toBe(120);
    expect(checkInRadiusMeters("attraction", "Museum")).toBe(250);
    expect(checkInRadiusMeters("attraction", "Park")).toBe(600);
    expect(checkInRadiusMeters("attraction", "Piazza")).toBe(600);
  });

  it("refuses a rough reading, a far one, and gives the reading's own uncertainty up to 100 m", () => {
    expect(checkInProblem(10, MAX_ACCURACY_M + 1, 150)).toBe("imprecise");
    expect(checkInProblem(10, Number.NaN, 150)).toBe("imprecise");
    expect(checkInProblem(140, 20, 150)).toBeNull();
    expect(checkInProblem(165, 20, 150)).toBeNull();
    expect(checkInProblem(175, 20, 150)).toBe("far");
    expect(checkInProblem(245, 150, 150)).toBeNull();
    expect(checkInProblem(255, 150, 150)).toBe("far");
  });

  it("measures distance on the globe and says it in round numbers", () => {
    const d = haversineMeters({ lat: 41.9007, lng: 12.4921 }, { lat: 41.8902, lng: 12.4922 });
    expect(d).toBeGreaterThan(1150);
    expect(d).toBeLessThan(1190);
    expect(formatDistance(d)).toBe("about 1.2 km");
    expect(formatDistance(420)).toBe("about 400 m");
    expect(formatDistance(10)).toBe("about 50 m");
    expect(formatDistance(23_400)).toBe("about 23 km");
  });

  it("flags two check-ins only a plane faster than any could connect", () => {
    const rome = { lat: 41.9, lng: 12.49 };
    const tokyo = { lat: 35.68, lng: 139.76 };
    const at = new Date("2026-09-01T10:00:00Z");
    const hours = (h: number) => new Date(at.getTime() + h * 3_600_000);
    expect(impossibleTravel({ ...rome, at }, { ...tokyo, at: hours(1) })).toBe(true);
    expect(impossibleTravel({ ...rome, at }, { ...tokyo, at: hours(14) })).toBe(false);
    // Across town, however soon, is always possible.
    expect(impossibleTravel({ ...rome, at }, { lat: 41.95, lng: 12.5, at: hours(0) })).toBe(false);
  });
});

describe("travelerSimilarity", () => {
  it("counts what two travelers like in common, plus the same budget, company and pace", () => {
    const a = traveler({ interests: ["Museums & art", "History & architecture"], cuisines: ["Italian"] });
    const same = travelerSimilarity(a, traveler({ interests: ["museums & art", "History & architecture"], cuisines: ["Italian"] }));
    expect(same.score).toBe(1);
    expect(same.inCommon).toEqual(["Museums & art", "History & architecture", "Italian"]);
    const some = travelerSimilarity(a, traveler({ interests: ["Museums & art", "Nightlife"], cuisines: ["Japanese"] }));
    expect(some.score).toBeGreaterThanOrEqual(SIMILAR_AT);
    expect(some.inCommon).toEqual(["Museums & art"]);
  });

  it("never calls travelers alike on defaults alone", () => {
    expect(travelerSimilarity(traveler({}), traveler({})).score).toBe(0);
    const apart = travelerSimilarity(traveler({ interests: ["Nightlife"] }), traveler({ interests: ["Hiking"] }));
    expect(apart.score).toBe(0);
    expect(apart.score).toBeLessThan(SIMILAR_AT);
  });

  it("needs more in common when budget, company and pace differ", () => {
    const a = traveler({ interests: ["Museums & art", "Nightlife", "Beaches"], cuisines: ["Italian"] });
    const b = traveler({ interests: ["Museums & art", "Hiking", "Shopping"], cuisines: ["Thai"], budgetTier: "luxury", companions: "solo", pace: "packed" });
    expect(travelerSimilarity(a, b).score).toBeLessThan(SIMILAR_AT);
  });
});
