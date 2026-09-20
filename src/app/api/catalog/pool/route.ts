import { catalogPool } from "@/server/catalog";
import { HttpError, json, requireUser, route } from "@/server/http";
import { resolveDestination } from "@/server/places";

export const dynamic = "force-dynamic";

/**
 * What the catalog already holds for a destination, trimmed for the model's context: the
 * assistant prefers these exact names, so its cards resolve without Google.
 */
export const GET = route(async (request) => {
  await requireUser();
  const destination = new URL(request.url).searchParams.get("destination")?.trim() ?? "";
  if (!destination || destination.length > 160) throw new HttpError(400, "destination is required");
  const place = await resolveDestination(destination);
  if (!place) return json({ destination, places: [] });
  const [hotels, attractions, restaurants] = await Promise.all([
    catalogPool(place, "hotel", 25, 12),
    catalogPool(place, "attraction", 25, 16),
    catalogPool(place, "restaurant", 25, 12),
  ]);
  const trim = (hit: { place: { name: string; kind: string; category?: string; priceLevel?: string; rating?: number } }) => ({
    name: hit.place.name,
    kind: hit.place.kind,
    category: hit.place.category ?? "",
    price: hit.place.priceLevel ?? "",
    rating: hit.place.rating ?? null,
  });
  return json({ destination: place.name, places: [...hotels, ...attractions, ...restaurants].map(trim) }, { headers: { "Cache-Control": "private, max-age=300" } });
});
