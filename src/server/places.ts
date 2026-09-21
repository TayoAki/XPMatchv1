import { findCity } from "@/lib/places/gazetteer";
import { isLocality } from "@/lib/places/kind";
import type { LatLng, PhotoCredit, PlaceKind, ResolvedPlace } from "@/lib/places/types";
import {
  findAlias,
  fuzzyCatalogMatch,
  getCatalogPlace,
  getPhotoUrl,
  getSearchCache,
  isCatalogFresh,
  saveAlias,
  setPhotoUrl,
  setSearchCache,
  upsertPlaces,
  type CatalogPlace,
} from "./catalog";

/**
 * Server-side place resolution. Uses the Google Places API (New) when a key is
 * configured and degrades to Open-Meteo geocoding / a small gazetteer so the
 * map still works (with estimated pins) without one.
 */

/** Google Places API (New) base; overridable so tests can run against a stub server. */
const PLACES_BASE = (process.env.PLACES_BASE_URL?.trim() || "https://places.googleapis.com/v1").replace(/\/$/, "");

/**
 * List-search mask (Explore, home picks, seeding): what a card, a pin and the match score need.
 * No editorial summary: that one field moved every search to the Enterprise + Atmosphere tier;
 * the place sheet still gets it from Place Details.
 */
const SEARCH_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.viewport",
  "places.rating",
  "places.userRatingCount",
  "places.primaryTypeDisplayName",
  "places.photos.name",
  "places.photos.authorAttributions",
  "places.googleMapsUri",
  "places.websiteUri",
  "places.priceLevel",
  "places.types",
].join(",");

/** The same fields for one place by id (Place Details), fetched only when a lookup finds a new id. */
const CARD_DETAIL_FIELDS = SEARCH_FIELDS.split(",")
  .map((f) => f.replace(/^places\./, ""))
  .join(",");

/** A Text Search that asks for ids only is free without limit. */
const IDS_ONLY_FIELDS = "places.id";

/**
 * Details field mask: everything the sheet shows plus the evidence the review Q&A,
 * comparison and heads-up features read (Google's review summary, attributes).
 */
const DETAIL_FIELDS = [
  "id",
  "types",
  "displayName",
  "formattedAddress",
  "addressComponents",
  "location",
  "viewport",
  "rating",
  "userRatingCount",
  "primaryTypeDisplayName",
  "photos.name",
  "photos.authorAttributions",
  "editorialSummary",
  "googleMapsUri",
  "websiteUri",
  "priceLevel",
  "regularOpeningHours.weekdayDescriptions",
  "internationalPhoneNumber",
  "reviews",
  "reviewSummary",
  "generativeSummary",
  "allowsDogs",
  "goodForChildren",
  "goodForGroups",
  "liveMusic",
  "menuForChildren",
  "outdoorSeating",
  "reservable",
  "restroom",
  "servesVegetarianFood",
  "servesBreakfast",
  "servesBrunch",
  "servesLunch",
  "servesDinner",
  "takeout",
  "delivery",
  "dineIn",
  "accessibilityOptions",
  "parkingOptions",
  "paymentOptions",
].join(",");

export interface GooglePlace {
  id: string;
  types?: string[];
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: { longText?: string; shortText?: string; types?: string[] }[];
  location?: { latitude: number; longitude: number };
  viewport?: { low: { latitude: number; longitude: number }; high: { latitude: number; longitude: number } };
  rating?: number;
  userRatingCount?: number;
  primaryTypeDisplayName?: { text?: string };
  photos?: { name: string; authorAttributions?: { displayName?: string; uri?: string; photoUri?: string }[] }[];
  editorialSummary?: { text?: string };
  googleMapsUri?: string;
  websiteUri?: string;
  priceLevel?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  internationalPhoneNumber?: string;
  reviewSummary?: { text?: { text?: string } };
  generativeSummary?: { overview?: { text?: string } };
  reviews?: {
    rating?: number;
    relativePublishTimeDescription?: string;
    text?: { text?: string };
    originalText?: { text?: string };
    authorAttribution?: { displayName?: string; photoUri?: string };
  }[];
}

export function placesApiKey(): string | undefined {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined;
}

export function placesProvider(): "google" | "fallback" {
  return placesApiKey() ? "google" : "fallback";
}

const PRICE_LEVEL: Record<string, string> = {
  PRICE_LEVEL_FREE: "Free",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
};

export function photoProxyUrl(photoName: string, width = 800): string {
  return `/api/places/photo?name=${encodeURIComponent(photoName)}&w=${width}`;
}

function localityOf(place: GooglePlace): string | undefined {
  const comps = place.addressComponents ?? [];
  const pick = (...types: string[]) =>
    comps.find((c) => c.types?.some((t) => types.includes(t)))?.longText;
  const city = pick("locality", "postal_town", "administrative_area_level_3", "sublocality_level_1");
  const region = pick("administrative_area_level_1");
  const country = pick("country");
  const parts = [city, region ?? country].filter((p, i, arr) => p && arr.indexOf(p) === i);
  return parts.length ? parts.join(", ") : undefined;
}

/** The first author Google lists for a photo, with the profile link when there is one. */
function photoCreditOf(photo: NonNullable<GooglePlace["photos"]>[number]): PhotoCredit {
  const author = photo.authorAttributions?.find((a) => a.displayName?.trim());
  return { name: author?.displayName?.trim() || "Google user", ...(author?.uri ? { uri: author.uri } : {}) };
}

export function toResolved(place: GooglePlace, kind: PlaceKind): ResolvedPlace | null {
  if (!place.location) return null;
  const photos = (place.photos ?? []).slice(0, 6);
  return {
    id: place.id,
    name: place.displayName?.text ?? "Unknown place",
    kind,
    lat: place.location.latitude,
    lng: place.location.longitude,
    address: place.formattedAddress,
    locality: localityOf(place),
    category: place.primaryTypeDisplayName?.text,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    priceLevel: place.priceLevel ? PRICE_LEVEL[place.priceLevel] ?? undefined : undefined,
    summary: place.editorialSummary?.text,
    photos: photos.map((p) => photoProxyUrl(p.name)),
    ...(photos.length ? { photoCredits: photos.map(photoCreditOf) } : {}),
    googleMapsUri: place.googleMapsUri,
    websiteUri: place.websiteUri,
    viewport: place.viewport
      ? {
          north: place.viewport.high.latitude,
          east: place.viewport.high.longitude,
          south: place.viewport.low.latitude,
          west: place.viewport.low.longitude,
        }
      : undefined,
    types: place.types?.slice(0, 12),
    source: "google",
  };
}

/** A list search for restaurants or sights never returns the city itself (a locality is a destination). */
const notLocality = (p: ResolvedPlace) => !isLocality(p.types);

async function googleFetch<T>(url: string, init: RequestInit, fieldMask: string): Promise<T> {
  const key = placesApiKey();
  if (!key) throw new Error("No Google Places API key configured");
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": fieldMask,
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Places API ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/* ---------------------------- caching ---------------------------- */

const searchCache = new Map<string, Promise<ResolvedPlace | null>>();
const MAX_CACHE = 500;

function remember<T>(cache: Map<string, Promise<T>>, key: string, make: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit) return hit;
  const p = make().catch((err) => {
    cache.delete(key);
    throw err;
  });
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
  cache.set(key, p);
  return p;
}

/* ------------------------ google + catalog ------------------------ */

/** One place by id with the card mask (Place Details, Enterprise tier). */
async function fetchCardDetails(id: string, kind: PlaceKind): Promise<ResolvedPlace | null> {
  const raw = await googleFetch<GooglePlace>(`${PLACES_BASE}/places/${encodeURIComponent(id)}`, { method: "GET" }, CARD_DETAIL_FIELDS);
  return toResolved(raw, kind);
}

/** A catalog hit as the caller's kind, refreshed from Google when older than 30 days. */
async function freshen(hit: CatalogPlace, kind: PlaceKind): Promise<ResolvedPlace> {
  const place = { ...hit.place, kind };
  if (isCatalogFresh(hit) || !placesApiKey()) return place;
  try {
    const fresh = await fetchCardDetails(hit.place.id, kind);
    if (fresh) {
      await upsertPlaces([fresh]);
      return fresh;
    }
  } catch (err) {
    console.warn("[places] refresh failed, serving the stored copy:", err instanceof Error ? err.message : err);
  }
  return place;
}

const aliasDestination = (destination: ResolvedPlace | null | undefined) => (destination && destination.source === "google" ? destination.id : "");

/** The catalog's answer for a query: a remembered alias, else a stored place whose name matches, near the destination. */
async function catalogLookup(query: string, kind: PlaceKind, destination: ResolvedPlace | null | undefined): Promise<ResolvedPlace | null> {
  const destId = aliasDestination(destination);
  const alias = await findAlias(query, kind, destId);
  if (alias) return freshen(alias, kind);
  if (kind !== "destination" && destination) {
    const fuzzy = await fuzzyCatalogMatch(query, kind, destination);
    if (fuzzy) {
      await saveAlias(query, kind, destId, fuzzy.place.id, "fuzzy");
      return freshen(fuzzy, kind);
    }
  }
  return null;
}

/**
 * Google's answer for a query: a free ids-only Text Search, then the catalog by id, and
 * Place Details only for an id we have never stored.
 */
async function googleResolve(query: string, kind: PlaceKind, destination?: ResolvedPlace): Promise<ResolvedPlace | null> {
  const body: Record<string, unknown> = { textQuery: query, maxResultCount: 1, languageCode: "en" };
  if (destination && kind !== "destination") {
    body.locationBias = { circle: { center: { latitude: destination.lat, longitude: destination.lng }, radius: 40000 } };
  }
  const data = await googleFetch<{ places?: { id?: string }[] }>(`${PLACES_BASE}/places:searchText`, { method: "POST", body: JSON.stringify(body) }, IDS_ONLY_FIELDS);
  const id = data.places?.[0]?.id;
  if (!id) return null;
  const known = await getCatalogPlace(id);
  if (known) return freshen(known, kind);
  const place = await fetchCardDetails(id, kind);
  if (place) await upsertPlaces([place], kind === "destination" ? place.id : aliasDestination(destination) || null);
  return place;
}

/* --------------------------- fallbacks --------------------------- */

async function openMeteoGeocode(query: string): Promise<ResolvedPlace | null> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.split(",")[0])}&count=1&language=en&format=json`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: { name: string; latitude: number; longitude: number; country?: string; admin1?: string }[];
    };
    const hit = data.results?.[0];
    if (!hit) return null;
    return {
      id: `est:${hit.name.toLowerCase().replace(/\s+/g, "-")}`,
      name: hit.name,
      kind: "destination",
      lat: hit.latitude,
      lng: hit.longitude,
      locality: [hit.admin1, hit.country].filter(Boolean).join(", "),
      photos: [],
      source: "estimate",
    };
  } catch {
    return null;
  }
}

function gazetteerPlace(query: string): ResolvedPlace | null {
  const city = findCity(query);
  if (!city) return null;
  return {
    id: `est:${city.name.toLowerCase().replace(/\s+/g, "-")}`,
    name: city.name,
    kind: "destination",
    lat: city.lat,
    lng: city.lng,
    locality: city.country,
    photos: [],
    source: "estimate",
  };
}

/** Deterministic pseudo-random offset so estimated pins spread around the city center. */
function jitter(seed: string, center: LatLng, kind: PlaceKind): LatLng {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  const a = ((h % 3600) / 3600) * Math.PI * 2;
  const r = 0.006 + ((h >>> 8) % 1000) / 1000 * (kind === "attraction" ? 0.03 : 0.02);
  return { lat: center.lat + Math.sin(a) * r, lng: center.lng + (Math.cos(a) * r) / Math.cos((center.lat * Math.PI) / 180) };
}

/* ----------------------------- api ------------------------------ */

export async function resolveDestination(query: string): Promise<ResolvedPlace | null> {
  const key = `dest|${query.trim().toLowerCase()}`;
  return remember(searchCache, key, async () => {
    const stored = await catalogLookup(query, "destination", null);
    if (stored) return stored;
    if (placesApiKey()) {
      try {
        const hit = await googleResolve(query, "destination");
        if (hit) {
          await saveAlias(query, "destination", "", hit.id, "lookup");
          return hit;
        }
      } catch (err) {
        console.warn("[places] destination search failed, using fallback:", err instanceof Error ? err.message : err);
      }
    }
    return (await openMeteoGeocode(query)) ?? gazetteerPlace(query);
  });
}

export async function resolvePointOfInterest(
  query: string,
  kind: PlaceKind,
  destination: ResolvedPlace | null,
): Promise<ResolvedPlace | null> {
  const key = `poi|${kind}|${query.trim().toLowerCase()}|${destination?.id ?? ""}`;
  return remember(searchCache, key, async () => {
    const stored = await catalogLookup(query, kind, destination);
    if (stored) return stored;
    if (placesApiKey()) {
      try {
        const hit = await googleResolve(query, kind, destination ?? undefined);
        if (hit) {
          await saveAlias(query, kind, aliasDestination(destination), hit.id, "lookup");
          return hit;
        }
      } catch (err) {
        console.warn("[places] search failed, using estimate:", err instanceof Error ? err.message : err);
      }
    }
    if (!destination) return null;
    const pos = jitter(query, destination, kind);
    return {
      id: `est:${kind}:${query.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: query.split(",")[0].trim(),
      kind,
      lat: pos.lat,
      lng: pos.lng,
      locality: destination.name,
      photos: [],
      source: "estimate",
    };
  });
}

/** Raw Place Details with the full field mask; `place-facts.ts` caches and shapes it. */
export async function fetchGooglePlaceDetails(id: string): Promise<GooglePlace | null> {
  if (!placesApiKey() || id.startsWith("est:")) return null;
  return googleFetch<GooglePlace>(`${PLACES_BASE}/places/${encodeURIComponent(id)}`, { method: "GET" }, DETAIL_FIELDS);
}

/* ----------------------------- nearby ----------------------------- */

export type NearbyCategory = "for-you" | "restaurants" | "experiences" | "stays";
export const NEARBY_CATEGORIES: NearbyCategory[] = ["for-you", "restaurants", "experiences", "stays"];

// Primary types only: a supermarket with a bakery counter must not show up under Restaurants.
const NEARBY_TYPES: Record<Exclude<NearbyCategory, "for-you">, { types: string[]; kind: PlaceKind }> = {
  restaurants: { types: ["restaurant", "cafe", "bar", "coffee_shop", "brunch_restaurant", "fine_dining_restaurant", "wine_bar"], kind: "restaurant" },
  experiences: {
    types: ["tourist_attraction", "museum", "park", "art_gallery", "historical_landmark", "amusement_park", "zoo", "aquarium", "performing_arts_theater", "hiking_area", "botanical_garden", "national_park"],
    kind: "attraction",
  },
  stays: { types: ["hotel", "motel", "resort_hotel", "bed_and_breakfast", "inn", "hostel", "extended_stay_hotel", "guest_house", "lodging"], kind: "hotel" },
};

const NEARBY_FIELDS = SEARCH_FIELDS;
const NEARBY_RADIUS_M = 25000;
const NEARBY_TTL_MS = 10 * 60_000;
/** How long a list search (Explore, home picks) is served from the shared cache in Postgres. */
const LIST_CACHE_MS = 24 * 60 * 60_000;

/** Cache key for a list search: the area is rounded to about a kilometer so neighbors share it. */
function listKey(scope: string, kind: string, query: string, center: LatLng, limit: number, filters: NearbyFilters): string {
  const f = `${(filters.priceLevels ?? []).join("+")}|${filters.minRating ?? ""}|${filters.openNow ? "open" : ""}`;
  return `${scope}|${kind}|${query.trim().toLowerCase()}|${f}|${center.lat.toFixed(2)}|${center.lng.toFixed(2)}|${limit}`;
}
const nearbyCache = new Map<string, { at: number; promise: Promise<ResolvedPlace[]> }>();

const present = (p: ResolvedPlace | null): p is ResolvedPlace => p !== null;

async function googleNearby(center: LatLng, types: string[], kind: PlaceKind, limit: number): Promise<ResolvedPlace[]> {
  const data = await googleFetch<{ places?: GooglePlace[] }>(
    `${PLACES_BASE}/places:searchNearby`,
    {
      method: "POST",
      body: JSON.stringify({
        includedPrimaryTypes: types,
        maxResultCount: Math.min(Math.max(limit, 1), 20),
        rankPreference: "POPULARITY",
        languageCode: "en",
        locationRestriction: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius: NEARBY_RADIUS_M } },
      }),
    },
    NEARBY_FIELDS,
  );
  return (data.places ?? []).map((p) => toResolved(p, kind)).filter(present).filter(notLocality);
}

/** Filters Places Text Search applies server-side (from Explore's parsed query or the traveler's budget). */
export interface NearbyFilters {
  priceLevels?: string[];
  /** 0-5 in half steps. */
  minRating?: number;
  openNow?: boolean;
}

async function googleTextMany(query: string, kind: PlaceKind, center: LatLng, limit: number, filters: NearbyFilters = {}): Promise<ResolvedPlace[]> {
  const data = await googleFetch<{ places?: GooglePlace[] }>(
    `${PLACES_BASE}/places:searchText`,
    {
      method: "POST",
      body: JSON.stringify({
        textQuery: query,
        pageSize: Math.min(Math.max(limit, 1), 20),
        languageCode: "en",
        locationBias: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius: NEARBY_RADIUS_M } },
        ...(filters.priceLevels?.length ? { priceLevels: filters.priceLevels } : {}),
        ...(filters.minRating ? { minRating: filters.minRating } : {}),
        ...(filters.openNow ? { openNow: true } : {}),
      }),
    },
    NEARBY_FIELDS,
  );
  return (data.places ?? []).map((p) => toResolved(p, kind)).filter(present).filter(notLocality);
}

/** Several places for a free-text query near a point (the home picks build profile-driven queries with it). */
export async function searchTextPlaces(query: string, kind: PlaceKind, center: LatLng, limit = 8, filters: NearbyFilters = {}): Promise<ResolvedPlace[]> {
  if (!placesApiKey()) return [];
  const key = listKey("text", kind, query, center, limit, filters);
  // "Open now" changes by the hour, so it never comes from the day-long cache.
  const cached = filters.openNow ? null : await getSearchCache(key, LIST_CACHE_MS);
  if (cached) return cached.map((p) => ({ ...p, kind }));
  const places = await googleTextMany(query, kind, center, limit, filters);
  await upsertPlaces(places);
  if (!filters.openNow) await setSearchCache(key, places);
  return places;
}

function interleave(a: ResolvedPlace[], b: ResolvedPlace[]): ResolvedPlace[] {
  const out: ResolvedPlace[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    for (const p of [a[i], b[i]]) {
      if (p && !seen.has(p.id)) {
        seen.add(p.id);
        out.push(p);
      }
    }
  }
  return out;
}

/**
 * Places around a point for the Explore page. Category tabs use Nearby Search (by type,
 * ranked by popularity); a free-text query uses Text Search biased to the area.
 * Results are cached for ten minutes per area/category/query.
 */
/** Google price levels for a traveler budget tier (Text Search only). */
export function priceLevelsFor(budgetTier?: string | null): string[] | undefined {
  switch (budgetTier) {
    case "budget":
      return ["PRICE_LEVEL_INEXPENSIVE", "PRICE_LEVEL_MODERATE"];
    case "mid-range":
      return ["PRICE_LEVEL_MODERATE", "PRICE_LEVEL_EXPENSIVE"];
    case "premium":
      return ["PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"];
    case "luxury":
      return ["PRICE_LEVEL_VERY_EXPENSIVE", "PRICE_LEVEL_EXPENSIVE"];
    default:
      return undefined;
  }
}

const CATEGORY_TEXT: Record<NearbyCategory, string> = { "for-you": "things to do and restaurants", restaurants: "restaurants", experiences: "things to do", stays: "hotels" };

export async function searchNearby(
  center: LatLng,
  category: NearbyCategory,
  query?: string,
  limit = 12,
  filters: NearbyFilters = {},
): Promise<ResolvedPlace[]> {
  if (!placesApiKey()) return [];
  const q = query?.trim().toLowerCase() ?? "";
  // Price levels are reliable for restaurants; hotels rarely carry them, so they only apply there.
  const effective: NearbyFilters = {
    priceLevels: category === "restaurants" || (category === "for-you" && q) ? filters.priceLevels : undefined,
    minRating: filters.minRating,
    openNow: filters.openNow,
  };
  const hasFilters = !!(effective.priceLevels?.length || effective.minRating || effective.openNow);
  const key = `${category}|${q}|${(effective.priceLevels ?? []).join("+")}|${effective.minRating ?? ""}|${effective.openNow ? "open" : ""}|${center.lat.toFixed(3)}|${center.lng.toFixed(3)}|${limit}`;
  const hit = nearbyCache.get(key);
  if (hit && Date.now() - hit.at < NEARBY_TTL_MS) return hit.promise;
  const fetchFresh = async (): Promise<ResolvedPlace[]> => {
    if (q || hasFilters) {
      // Free text or filters: Text Search understands both; category tabs without either use the cheaper Nearby Search.
      const kind: PlaceKind = category === "restaurants" ? "restaurant" : category === "stays" ? "hotel" : "attraction";
      return googleTextMany(q || CATEGORY_TEXT[category], kind, center, limit, effective);
    }
    if (category === "for-you") {
      const [experiences, restaurants] = await Promise.all([
        googleNearby(center, NEARBY_TYPES.experiences.types, "attraction", Math.ceil(limit / 2)),
        googleNearby(center, NEARBY_TYPES.restaurants.types, "restaurant", Math.floor(limit / 2)),
      ]);
      return interleave(experiences, restaurants);
    }
    const cfg = NEARBY_TYPES[category];
    return googleNearby(center, cfg.types, cfg.kind, limit);
  };
  const promise = (async () => {
    const dbKey = listKey("nearby", category, q, center, limit, effective);
    const cached = effective.openNow ? null : await getSearchCache(dbKey, LIST_CACHE_MS);
    if (cached) return cached;
    const places = await fetchFresh();
    await upsertPlaces(places);
    if (!effective.openNow) await setSearchCache(dbKey, places);
    return places;
  })().catch((err: unknown) => {
    nearbyCache.delete(key);
    throw err;
  });
  if (nearbyCache.size >= 300) nearbyCache.delete(nearbyCache.keys().next().value as string);
  nearbyCache.set(key, { at: Date.now(), promise });
  return promise;
}

const photoUriCache = new Map<string, { uri: string; at: number }>();
const PHOTO_URI_TTL_MS = 2 * 60 * 60_000;
/** The shared copy in Postgres outlives a process; a URL that stopped working is refreshed by the photo route. */
const PHOTO_URL_DB_TTL_MS = 24 * 60 * 60_000;

function rememberPhotoUri(cacheKey: string, uri: string) {
  if (photoUriCache.size >= 2000) photoUriCache.delete(photoUriCache.keys().next().value as string);
  photoUriCache.set(cacheKey, { uri, at: Date.now() });
}

/** Resolves a Places photo reference to its googleusercontent URL: process cache, then the shared table, then Google. */
export async function resolvePhotoUri(photoName: string, width: number, fresh = false): Promise<string | null> {
  const key = placesApiKey();
  if (!key) return null;
  const px = Math.min(Math.max(width, 100), 1600);
  const cacheKey = `${photoName}|${px}`;
  const hit = photoUriCache.get(cacheKey);
  if (hit && !fresh && Date.now() - hit.at < PHOTO_URI_TTL_MS) return hit.uri;
  if (!fresh) {
    const stored = await getPhotoUrl(cacheKey, PHOTO_URL_DB_TTL_MS);
    if (stored) {
      rememberPhotoUri(cacheKey, stored);
      return stored;
    }
  }
  const url = `${PLACES_BASE}/${photoName}/media?maxWidthPx=${px}&skipHttpRedirect=true&key=${key}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const data = (await res.json()) as { photoUri?: string };
  if (!data.photoUri) return null;
  rememberPhotoUri(cacheKey, data.photoUri);
  await setPhotoUrl(cacheKey, data.photoUri);
  return data.photoUri;
}
