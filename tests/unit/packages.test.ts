import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, type TravelerProfile } from "@/lib/types";
import type { ResolvedPlace } from "@/lib/places/types";
import { scoreMatch, candidateFromPlace } from "@/lib/match";
import { applyConstraints, basedOnFor, variantSpecs, whyFor } from "@/server/packages";
import { catalogKind, inferKind } from "@/lib/places/kind";

const profile: TravelerProfile = {
  ...DEFAULT_PROFILE,
  budgetTier: "mid-range",
  pace: "balanced",
  interests: ["Museums & art", "Nature & hiking"],
  stayTypes: ["Boutique hotel"],
  cuisines: ["Italian", "Japanese"],
};

const place = (over: Partial<ResolvedPlace>): ResolvedPlace => ({
  id: over.id ?? "p",
  name: over.name ?? "Somewhere",
  kind: over.kind ?? "attraction",
  lat: 41.9,
  lng: 12.5,
  photos: [],
  source: "google",
  ...over,
});

describe("applyConstraints", () => {
  it("drops toggled-off facts and shifts the budget one tier, clamped", () => {
    const shifted = applyConstraints(profile, { budgetShift: 1, interestsOff: ["Museums & art"], pace: "relaxed" });
    expect(shifted.budgetTier).toBe("premium");
    expect(shifted.interests).toEqual(["Nature & hiking"]);
    expect(shifted.pace).toBe("relaxed");
    expect(applyConstraints({ ...profile, budgetTier: "luxury" }, { budgetShift: 1 }).budgetTier).toBe("luxury");
    expect(applyConstraints(profile, undefined)).toBe(profile);
  });
});

describe("basedOnFor", () => {
  it("names the profile facts a package is built from", () => {
    expect(basedOnFor(profile)).toEqual(["Boutique hotel", "Museums & art", "Nature & hiking", "Italian", "mid-range budget"]);
  });
});

describe("variantSpecs", () => {
  it("leads the second variant with the second interest and shifts the third when the pace is balanced", () => {
    const specs = variantSpecs(profile, { profile });
    expect(specs.map((s) => s.key)).toEqual(["match", "second", "shift"]);
    expect(specs[1].title).toBe("More nature & hiking");
    expect(specs[1].profile.interests[0]).toBe("Nature & hiking");
    expect(specs[2].title).toBe("Quieter and closer");
    expect(specs[2].things).toBe(2);
  });

  it("moves the budget a notch when the pace is set and no taste tendency differs", () => {
    const specs = variantSpecs({ ...profile, pace: "packed" }, { profile: { ...profile, pace: "packed" } });
    expect(specs[2].title).toBe("A notch up");
    expect(specs[2].profile.budgetTier).toBe("premium");
    expect(specs[0].things).toBe(4);
  });

  it("falls back to local finds when there is no second interest or cuisine", () => {
    const thin = { ...profile, interests: ["Beaches"], cuisines: [] };
    const specs = variantSpecs(thin, { profile: thin });
    expect(specs[1].title).toBe("Local finds");
    expect(specs[1].boost?.(place({ userRatingCount: 300 }))).toBe(8);
    expect(specs[1].boost?.(place({ userRatingCount: 50000 }))).toBe(0);
  });
});

describe("whyFor", () => {
  it("prefers specific reasons over the rating, and falls back to the category", () => {
    const boutique = place({ kind: "hotel", name: "Hotel Artemide", category: "Boutique hotel", priceLevel: "$$", rating: 4.6, userRatingCount: 5000 });
    const match = scoreMatch(candidateFromPlace(boutique), { profile });
    expect(whyFor(match, boutique)).toContain("Boutique hotel");
    const plain = place({ kind: "attraction", name: "A Bridge", category: "Bridge" });
    expect(whyFor(scoreMatch(candidateFromPlace(plain), { profile }), plain)).toBe("Bridge");
  });
});

describe("catalogKind", () => {
  it("stores a place under what its category says, never a destination as anything else", () => {
    expect(catalogKind("hotel", "Italian restaurant")).toBe("restaurant");
    expect(catalogKind("attraction", "Hotel")).toBe("hotel");
    expect(catalogKind("restaurant", undefined)).toBe("restaurant");
    expect(catalogKind("destination", "Hotel")).toBe("destination");
    expect(inferKind("Neighborhood")).toBe("attraction");
  });
});
