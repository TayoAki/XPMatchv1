import { describe, expect, it } from "vitest";
import type { PlaceFeedback } from "@/lib/feedback/types";
import { reasonChips } from "@/lib/feedback/types";
import { computeTasteProfile, fitsYourTaste, isDisliked, strongSignals, tasteForContext } from "@/lib/feedback/taste";
import { answer, bucketScore, finalPosition, nextOpponent, scoreAt, skip, startInsertion } from "@/lib/ranking";

let n = 0;
function fb(input: Partial<PlaceFeedback> & Pick<PlaceFeedback, "name" | "kind" | "verdict">): PlaceFeedback {
  n += 1;
  return {
    id: `f${n}`,
    placeId: input.placeId ?? `p${n}`,
    reasons: [],
    note: "",
    source: "card",
    createdAt: `2026-09-0${(n % 9) + 1}T00:00:00.000Z`,
    updatedAt: `2026-09-0${(n % 9) + 1}T00:00:00.000Z`,
    ...input,
  };
}

const place = (category: string, priceLevel?: string) => ({ id: "x", name: "x", kind: "restaurant" as const, lat: 0, lng: 0, photos: [], source: "google" as const, category, priceLevel });

describe("computeTasteProfile", () => {
  it("summarizes reasons, ranking, categories and price per domain", () => {
    const profile = computeTasteProfile([
      fb({ name: "Da Enzo", kind: "restaurant", verdict: "loved", reasons: ["Taste", "Value"], score: 9.1, place: place("Trattoria", "$$") }),
      fb({ name: "Roscioli", kind: "restaurant", verdict: "loved", reasons: ["Taste"], score: 8.2, place: place("Italian restaurant", "$$$") }),
      fb({ name: "Tourist Trap", kind: "restaurant", verdict: "disliked", reasons: ["Overpriced", "Touristy"], place: place("Restaurant", "$$") }),
      fb({ name: "Artemide", kind: "hotel", verdict: "fine", reasons: ["Location"] }),
    ]);
    expect(profile.total).toBe(4);
    const food = profile.domains.food!;
    expect(food.count).toBe(3);
    expect(food.liked).toEqual([
      { reason: "Taste", count: 2 },
      { reason: "Value", count: 1 },
    ]);
    expect(food.disliked.map((r) => r.reason)).toEqual(["Overpriced", "Touristy"]);
    expect(food.ranked.map((p) => p.name)).toEqual(["Da Enzo", "Roscioli", "Tourist Trap"]);
    expect(food.categories.map((c) => c.reason)).toEqual(["Italian restaurant", "Trattoria"]);
    expect(food.priceTendency).toBe("$$");
    expect(profile.domains.stays?.ranked[0].verdict).toBe("fine");
    expect(profile.domains.activities).toBeUndefined();
  });

  it("turns repeated reasons into learned preferences", () => {
    const profile = computeTasteProfile([
      fb({ name: "A", kind: "hotel", verdict: "disliked", reasons: ["Noisy"] }),
      fb({ name: "B", kind: "hotel", verdict: "disliked", reasons: ["Noisy", "Dated"] }),
      fb({ name: "C", kind: "hotel", verdict: "loved", reasons: ["Quiet"] }),
    ]);
    expect(strongSignals(profile)).toEqual([{ domain: "stays", polarity: "dislike", statement: "Avoids noisy stays", reason: "Noisy", count: 2 }]);
  });
});

describe("fitsYourTaste", () => {
  const profile = computeTasteProfile([
    fb({ name: "Da Enzo", kind: "restaurant", verdict: "loved", reasons: ["Ambiance"], place: place("Trattoria") }),
    fb({ name: "Big Chain", kind: "hotel", verdict: "disliked", reasons: ["Noisy"] }),
    fb({ name: "Casa Quiet", kind: "hotel", verdict: "loved", reasons: ["Quiet", "Design"] }),
  ]);

  it("matches a loved place's category", () => {
    expect(fitsYourTaste({ kind: "restaurant", name: "Da Teo", category: "trattoria" }, profile)).toBe("Like Da Enzo, which you loved");
    expect(fitsYourTaste({ kind: "restaurant", name: "Da Enzo", category: "Trattoria" }, profile)).toBeNull();
  });

  it("matches a liked reason in the pick's description", () => {
    expect(fitsYourTaste({ kind: "hotel", name: "Hotel X", text: "Boutique, quiet courtyard rooms" }, profile)).toBe("Matches what you like: quiet");
    expect(fitsYourTaste({ kind: "hotel", name: "Hotel Y", text: "Busy street, rooftop bar" }, profile)).toBeNull();
    expect(fitsYourTaste({ kind: "attraction", name: "Colosseum", category: "Ruins" }, profile)).toBeNull();
    expect(fitsYourTaste({ kind: "attraction", name: "Colosseum" }, null)).toBeNull();
  });

  it("knows what the traveler disliked", () => {
    expect(isDisliked("big chain", "hotel", profile)).toBe(true);
    expect(isDisliked("Casa Quiet", "hotel", profile)).toBe(false);
  });

  it("gives the model a compact view", () => {
    const ctx = tasteForContext(profile, []);
    expect(ctx.ratings).toBe(3);
    expect(ctx.summary).toBe("3 reactions across 2 domains");
    expect(ctx.domains.stays.loves).toEqual(["Casa Quiet"]);
    expect(ctx.domains.stays.dislikedReasons).toEqual(["Noisy"]);
    expect(tasteForContext(null, [])).toEqual({ ratings: 0, summary: "No reactions recorded yet", domains: {}, recent: [] });
  });

  it("offers the right chips per verdict", () => {
    expect(reasonChips("hotel", "loved").map((c) => c.label)).toContain("Quiet");
    expect(reasonChips("hotel", "disliked").map((c) => c.label)).toContain("Noisy");
    expect(reasonChips("restaurant", "fine")).toHaveLength(6);
  });
});

describe("ranking", () => {
  const ranked = [
    { id: "a", name: "A", score: 9.5 },
    { id: "b", name: "B", score: 8.8 },
    { id: "c", name: "C", score: 7.9 },
    { id: "d", name: "D", score: 7.1 },
  ];

  it("places the first rated place without questions", () => {
    const s = startInsertion("loved", []);
    expect(s.done).toBe(true);
    expect(nextOpponent(s)).toBeNull();
    expect(scoreAt(s)).toBe(8.9);
    expect(bucketScore("fine")).toBe(5);
  });

  it("binary-inserts with recorded answers", () => {
    let s = startInsertion("loved", ranked);
    expect(nextOpponent(s)?.id).toBe("c");
    s = answer(s, true); // better than C → among A, B
    expect(nextOpponent(s)?.id).toBe("b");
    s = answer(s, false); // worse than B → between B and C
    expect(s.done).toBe(true);
    expect(finalPosition(s)).toBe(2);
    expect(scoreAt(s)).toBe(8.4);
  });

  it("caps questions and interpolates against bucket bounds", () => {
    let s = startInsertion("loved", ranked, 1);
    s = answer(s, true);
    expect(s.done).toBe(true);
    expect(finalPosition(s)).toBe(1);
    expect(scoreAt(s)).toBe(9.2);
    const top = answer(answer(answer(startInsertion("loved", ranked), true), true), true);
    expect(finalPosition(top)).toBe(0);
    expect(scoreAt(top)).toBe(9.8);
    const bottom = answer(answer(answer(startInsertion("loved", ranked), false), false), false);
    expect(finalPosition(bottom)).toBe(4);
    expect(scoreAt(bottom)).toBe(6.9);
  });

  it("settles below the undecided range when the traveler skips", () => {
    const s = skip(startInsertion("fine", [{ id: "x", name: "X", score: 5 }, { id: "y", name: "Y", score: 4 }]));
    expect(s.done).toBe(true);
    expect(finalPosition(s)).toBe(2);
    expect(scoreAt(s)).toBe(3.7);
    const afterOne = skip(answer(startInsertion("fine", [{ id: "x", name: "X", score: 5 }, { id: "y", name: "Y", score: 4 }, { id: "z", name: "Z", score: 3.5 }]), true));
    expect(finalPosition(afterOne)).toBe(1);
    expect(scoreAt(afterOne)).toBe(4.5);
  });
});
