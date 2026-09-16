import { HttpError, json, requireUser, route } from "@/server/http";
import { NEARBY_CATEGORIES, placesProvider, priceLevelsFor, searchNearby, type NearbyCategory } from "@/server/places";

export const dynamic = "force-dynamic";

/** Explore: places around a point. `?lat&lng&category=for-you|restaurants|experiences|stays&q=` */
export const GET = route(async (request) => {
  await requireUser();
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new HttpError(400, "lat and lng are required");
  const category = (url.searchParams.get("category") ?? "for-you") as NearbyCategory;
  if (!NEARBY_CATEGORIES.includes(category)) throw new HttpError(400, "Unknown category");
  const q = url.searchParams.get("q")?.trim().slice(0, 120) || undefined;
  const priceLevels = priceLevelsFor(url.searchParams.get("price"));
  const items = await searchNearby({ lat, lng }, category, q, 12, priceLevels);
  return json({ items, provider: placesProvider() });
});
