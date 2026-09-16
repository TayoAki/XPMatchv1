import { describe, expect, it } from "vitest";
import { parseSearch } from "@/lib/search-parser";

describe("parseSearch", () => {
  it("pulls price, rating and open-now out of the text and keeps vibe words", () => {
    const parsed = parseSearch("cheap sushi open now 4.5+ cozy");
    expect(parsed.query).toBe("sushi cozy");
    expect(parsed.priceLevels).toEqual(["PRICE_LEVEL_INEXPENSIVE", "PRICE_LEVEL_MODERATE"]);
    expect(parsed.minRating).toBe(4.5);
    expect(parsed.openNow).toBe(true);
    expect(parsed.chips.map((c) => c.label)).toEqual(["Inexpensive", "4.5★ and up", "Open now", "Cozy"]);
    expect(parsed.chips.find((c) => c.label === "Cozy")?.applied).toBe(false);
  });

  it("maps 'under $30' to price levels and leaves the rest as the query", () => {
    const parsed = parseSearch("quiet rooftop bar under $30");
    expect(parsed.query).toBe("quiet rooftop bar");
    expect(parsed.priceLevels).toEqual(["PRICE_LEVEL_INEXPENSIVE", "PRICE_LEVEL_MODERATE"]);
    expect(parsed.chips[0]).toEqual({ label: "Under $30", applied: true });
  });

  it("treats 'best' as a rating filter and strips filler", () => {
    const parsed = parseSearch("best tacos near me");
    expect(parsed.query).toBe("tacos");
    expect(parsed.minRating).toBe(4.5);
  });

  it("rounds star thresholds to half steps and keeps 'open late' in the text", () => {
    const parsed = parseSearch("upscale italian 4.2 stars and up open late");
    expect(parsed.minRating).toBe(4);
    expect(parsed.priceLevels).toEqual(["PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"]);
    expect(parsed.query).toBe("italian open late");
    expect(parsed.openNow).toBeUndefined();
  });

  it("returns no chips for a plain query", () => {
    const parsed = parseSearch("coffee");
    expect(parsed.query).toBe("coffee");
    expect(parsed.chips).toEqual([]);
  });
});
