import { describe, expect, it } from "vitest";
import { classifyPlacesCall, SKU_LABELS, SKU_PRICE_PER_1000, type Sku } from "@/server/api-spend";

/**
 * The field mask is what decides Google's billing tier, so these assertions pin the
 * classifier to the masks `src/server/places.ts` actually sends. If a mask changes and
 * the tier moves, one of these fails rather than the bill quietly going up.
 */

const SEARCH_MASK = [
  "places.id",
  "places.displayName",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.websiteUri",
].join(",");

const CARD_DETAIL_MASK = SEARCH_MASK.split(",")
  .map((f) => f.replace(/^places\./, ""))
  .join(",");

const DETAIL_MASK = [CARD_DETAIL_MASK, "editorialSummary", "reviews", "reviewSummary"].join(",");

const TEXT_SEARCH = "https://places.googleapis.com/v1/places:searchText";
const NEARBY = "https://places.googleapis.com/v1/places:searchNearby";
const DETAILS = "https://places.googleapis.com/v1/places/ChIJabc123";

describe("classifyPlacesCall", () => {
  it("bills an ids-only Text Search as the free tier", () => {
    expect(classifyPlacesCall(TEXT_SEARCH, "places.id")).toBe("text_search_ids_only");
    expect(SKU_PRICE_PER_1000.text_search_ids_only).toBe(0);
  });

  it("ignores whitespace when spotting the ids-only mask", () => {
    expect(classifyPlacesCall(TEXT_SEARCH, " places.id ")).toBe("text_search_ids_only");
  });

  it("bills a Text Search that asks for rating or price at Enterprise", () => {
    expect(classifyPlacesCall(TEXT_SEARCH, SEARCH_MASK)).toBe("text_search_enterprise");
  });

  it("bills a Nearby Search at Enterprise", () => {
    expect(classifyPlacesCall(NEARBY, SEARCH_MASK)).toBe("nearby_search_enterprise");
  });

  it("bills the card detail mask at Enterprise, not Atmosphere", () => {
    // The card mask deliberately drops editorialSummary; that one field moves the tier.
    expect(classifyPlacesCall(DETAILS, CARD_DETAIL_MASK)).toBe("place_details_enterprise");
  });

  it("bills the place-sheet mask at Enterprise + Atmosphere", () => {
    expect(classifyPlacesCall(DETAILS, DETAIL_MASK)).toBe("place_details_atmosphere");
  });

  it.each(["editorialSummary", "reviews", "reviewSummary"])("treats %s as an atmosphere field", (field) => {
    expect(classifyPlacesCall(DETAILS, `id,displayName,${field}`)).toBe("place_details_atmosphere");
  });

  it("does not mistake a lookalike field name for an atmosphere field", () => {
    expect(classifyPlacesCall(DETAILS, "id,userRatingCount,generativeSummary")).toBe("place_details_enterprise");
  });
});

describe("the SKU price table", () => {
  it("prices every SKU it labels", () => {
    const skus = Object.keys(SKU_PRICE_PER_1000) as Sku[];
    for (const sku of skus) expect(SKU_LABELS[sku]).toBeTruthy();
    expect(Object.keys(SKU_LABELS).sort()).toEqual(skus.sort());
  });

  it("keeps atmosphere dearer than plain details, and details dearer than photos", () => {
    expect(SKU_PRICE_PER_1000.place_details_atmosphere).toBeGreaterThan(SKU_PRICE_PER_1000.place_details_enterprise);
    expect(SKU_PRICE_PER_1000.place_details_enterprise).toBeGreaterThan(SKU_PRICE_PER_1000.place_photos);
  });
});
