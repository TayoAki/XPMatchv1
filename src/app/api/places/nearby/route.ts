import { HttpError, json, requireUser, route } from "@/server/http";
import { NEARBY_CATEGORIES, placesProvider, priceLevelsFor, searchNearby, type NearbyCategory, type NearbyFilters } from "@/server/places";

export const dynamic = "force-dynamic";

const PRICE_LEVELS = new Set(["PRICE_LEVEL_INEXPENSIVE", "PRICE_LEVEL_MODERATE", "PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"]);

/**
 * Explore: places around a point.
 * `?lat&lng&category=for-you|restaurants|experiences|stays&q=&price=<budget tier>&levels=<PRICE_LEVEL_…,…>&minRating=4.5&openNow=1`
 */
export const GET = route(async (request) => {
  await requireUser();
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new HttpError(400, "lat and lng are required");
  const category = (url.searchParams.get("category") ?? "for-you") as NearbyCategory;
  if (!NEARBY_CATEGORIES.includes(category)) throw new HttpError(400, "Unknown category");
  const q = url.searchParams.get("q")?.trim().slice(0, 120) || undefined;
  const levels = (url.searchParams.get("levels") ?? "").split(",").filter((l) => PRICE_LEVELS.has(l));
  const minRating = Number(url.searchParams.get("minRating"));
  const filters: NearbyFilters = {
    priceLevels: levels.length ? levels : priceLevelsFor(url.searchParams.get("price")),
    minRating: Number.isFinite(minRating) && minRating > 0 ? Math.min(5, Math.round(minRating * 2) / 2) : undefined,
    openNow: url.searchParams.get("openNow") === "1",
  };
  const items = await searchNearby({ lat, lng }, category, q, 12, filters);
  return json({ items, provider: placesProvider() });
});
