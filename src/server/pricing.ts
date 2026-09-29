/**
 * What the app pays for, at list price, so the admin page can estimate spend from the calls it
 * records (`src/server/usage.ts`). Google bills a Places call by the most expensive field in its
 * field mask, per 1,000 calls, after a number of free calls per SKU each month. Prices are Google
 * Maps Platform's core services list as used in docs/COGS.md §1 (2026-09-20). These are estimates:
 * the real bill is in the Google Cloud console.
 */

export type GoogleSku =
  | "text_search_ids"
  | "text_search_pro"
  | "text_search_enterprise"
  | "text_search_atmosphere"
  | "nearby_search_pro"
  | "nearby_search_enterprise"
  | "nearby_search_atmosphere"
  | "place_details_ids"
  | "place_details_essentials"
  | "place_details_pro"
  | "place_details_enterprise"
  | "place_details_atmosphere"
  | "place_photos"
  | "dynamic_maps"
  | "compute_routes"
  | "compute_routes_pro";

export interface SkuPrice {
  label: string;
  /** Dollars per 1,000 calls. */
  per1000: number;
  /** Free calls each month; null when the SKU is free without limit. */
  freePerMonth: number | null;
}

export const GOOGLE_PRICES: Record<GoogleSku, SkuPrice> = {
  text_search_ids: { label: "Text Search, IDs only", per1000: 0, freePerMonth: null },
  text_search_pro: { label: "Text Search Pro", per1000: 32, freePerMonth: 5000 },
  text_search_enterprise: { label: "Text Search Enterprise", per1000: 35, freePerMonth: 1000 },
  text_search_atmosphere: { label: "Text Search Enterprise + Atmosphere", per1000: 40, freePerMonth: 1000 },
  nearby_search_pro: { label: "Nearby Search Pro", per1000: 32, freePerMonth: 5000 },
  nearby_search_enterprise: { label: "Nearby Search Enterprise", per1000: 35, freePerMonth: 1000 },
  nearby_search_atmosphere: { label: "Nearby Search Enterprise + Atmosphere", per1000: 40, freePerMonth: 1000 },
  place_details_ids: { label: "Place Details, IDs only", per1000: 0, freePerMonth: null },
  place_details_essentials: { label: "Place Details Essentials", per1000: 5, freePerMonth: 10000 },
  place_details_pro: { label: "Place Details Pro", per1000: 17, freePerMonth: 5000 },
  place_details_enterprise: { label: "Place Details Enterprise", per1000: 20, freePerMonth: 1000 },
  place_details_atmosphere: { label: "Place Details Enterprise + Atmosphere", per1000: 25, freePerMonth: 1000 },
  place_photos: { label: "Place Photos", per1000: 7, freePerMonth: 10000 },
  dynamic_maps: { label: "Dynamic Maps (map loads)", per1000: 7, freePerMonth: 10000 },
  compute_routes: { label: "Compute Routes Essentials", per1000: 5, freePerMonth: 10000 },
  compute_routes_pro: { label: "Compute Routes Pro (over 10 waypoints)", per1000: 10, freePerMonth: 5000 },
};

export const isGoogleSku = (sku: string): sku is GoogleSku => sku in GOOGLE_PRICES;

/* Field tiers, from Google's Places API (New) SKU pages. A field's top-level name decides its tier. */
const IDS = 0;
const ESSENTIALS = 1;
const PRO = 2;
const ENTERPRISE = 3;
const ATMOSPHERE = 4;

const SEARCH_IDS_FIELDS = new Set(["id", "name", "attributions", "nextPageToken"]);
const DETAILS_IDS_FIELDS = new Set(["id", "name", "attributions", "photos", "movedPlace", "movedPlaceId"]);
const ESSENTIALS_FIELDS = new Set([
  "addressComponents",
  "addressDescriptor",
  "adrFormatAddress",
  "formattedAddress",
  "location",
  "plusCode",
  "postalAddress",
  "shortFormattedAddress",
  "types",
  "viewport",
]);
const PRO_FIELDS = new Set([
  "accessibilityOptions",
  "businessStatus",
  "containingPlaces",
  "displayName",
  "googleMapsLinks",
  "googleMapsUri",
  "iconBackgroundColor",
  "iconMaskBaseUri",
  "photos",
  "primaryType",
  "primaryTypeDisplayName",
  "pureServiceAreaBusiness",
  "subDestinations",
  "timeZone",
  "utcOffsetMinutes",
]);
const ENTERPRISE_FIELDS = new Set([
  "currentOpeningHours",
  "currentSecondaryOpeningHours",
  "internationalPhoneNumber",
  "nationalPhoneNumber",
  "priceLevel",
  "priceRange",
  "rating",
  "regularOpeningHours",
  "regularSecondaryOpeningHours",
  "userRatingCount",
  "websiteUri",
]);
const ATMOSPHERE_FIELDS = new Set([
  "allowsDogs",
  "curbsidePickup",
  "delivery",
  "dineIn",
  "editorialSummary",
  "evChargeAmenitySummary",
  "evChargeOptions",
  "fuelOptions",
  "generativeSummary",
  "goodForChildren",
  "goodForGroups",
  "goodForWatchingSports",
  "liveMusic",
  "menuForChildren",
  "neighborhoodSummary",
  "outdoorSeating",
  "parkingOptions",
  "paymentOptions",
  "reservable",
  "restroom",
  "reviews",
  "reviewSummary",
  "routingSummaries",
  "servesBeer",
  "servesBreakfast",
  "servesBrunch",
  "servesCocktails",
  "servesCoffee",
  "servesDessert",
  "servesDinner",
  "servesLunch",
  "servesVegetarianFood",
  "servesWine",
  "takeout",
]);

function fieldTier(field: string, endpoint: "search" | "details"): number {
  const name = field.trim().replace(/^places\./, "").split(".")[0];
  if (!name) return IDS;
  if (name === "*") return ATMOSPHERE;
  if ((endpoint === "search" ? SEARCH_IDS_FIELDS : DETAILS_IDS_FIELDS).has(name)) return IDS;
  // Searches have no Essentials tier: address and location fields bill as Pro there.
  if (ESSENTIALS_FIELDS.has(name)) return endpoint === "search" ? PRO : ESSENTIALS;
  if (PRO_FIELDS.has(name)) return PRO;
  if (ENTERPRISE_FIELDS.has(name)) return ENTERPRISE;
  if (ATMOSPHERE_FIELDS.has(name)) return ATMOSPHERE;
  // A field this list does not know is priced high rather than low, so estimates never undercount.
  return ENTERPRISE;
}

/** The SKU a Places API (New) call bills at, from its URL and field mask. */
export function googleSkuFor(url: string, fieldMask: string): GoogleSku {
  const endpoint = url.includes("places:searchText") ? "text" : url.includes("places:searchNearby") ? "nearby" : "details";
  const tiers = fieldMask
    .split(",")
    .filter((f) => f.trim())
    .map((f) => fieldTier(f, endpoint === "details" ? "details" : "search"));
  const tier = tiers.length ? Math.max(...tiers) : IDS;
  if (endpoint === "text") return tier === IDS ? "text_search_ids" : tier <= PRO ? "text_search_pro" : tier === ENTERPRISE ? "text_search_enterprise" : "text_search_atmosphere";
  if (endpoint === "nearby") return tier <= PRO ? "nearby_search_pro" : tier === ENTERPRISE ? "nearby_search_enterprise" : "nearby_search_atmosphere";
  return (["place_details_ids", "place_details_essentials", "place_details_pro", "place_details_enterprise", "place_details_atmosphere"] as const)[tier];
}

/** A month's calls of one SKU: how many go past the free allowance, what those cost, and what all of them would cost at list price. */
export function monthlyCost(sku: GoogleSku, calls: number): { billable: number; cost: number; listCost: number } {
  const price = GOOGLE_PRICES[sku];
  const billable = price.freePerMonth === null ? 0 : Math.max(0, calls - price.freePerMonth);
  return { billable, cost: (billable * price.per1000) / 1000, listCost: (calls * price.per1000) / 1000 };
}

/**
 * Dollars per million tokens for the default model, used when OpenRouter does not send a call's
 * cost with its usage. A model missing here is recorded with its tokens and no estimate.
 */
export const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
};

export function tokenCost(price: { input: number; output: number } | null, inputTokens: number, outputTokens: number): number {
  if (!price) return 0;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

/** Resend's free plan: emails a month (and at most 100 a day). */
export const EMAIL_FREE_PER_MONTH = 3000;
