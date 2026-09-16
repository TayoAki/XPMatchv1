import type { PlaceKind, ResolveRequest, ResolveResponse } from "@/lib/places/types";
import { placesProvider, resolveDestination, resolvePointOfInterest } from "@/server/places";
import { getSessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";

const KINDS: PlaceKind[] = ["destination", "hotel", "restaurant", "attraction"];

/**
 * Resolves a destination plus up to 12 recommended places to map coordinates
 * (and ratings/photos when Google Places is configured).
 */
export async function POST(request: Request) {
  if (!(await getSessionUser())) return Response.json({ error: "Please sign in" }, { status: 401 });
  let body: ResolveRequest;
  try {
    body = (await request.json()) as ResolveRequest;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const items = (Array.isArray(body.items) ? body.items : [])
    .filter((i) => i && typeof i.key === "string" && typeof i.query === "string" && KINDS.includes(i.kind))
    .slice(0, 12)
    .map((i) => ({ ...i, query: i.query.slice(0, 160) }));

  if (process.env.PLACES_DEBUG) {
    console.log("[places] resolve", JSON.stringify({ destination: body.destination, items: items.map((i) => `${i.kind}:${i.query}`) }));
  }
  const destination = body.destination?.trim() ? await resolveDestination(body.destination.trim().slice(0, 120)) : null;

  const resolved = await Promise.all(
    items.map(async (item) => {
      const place =
        item.kind === "destination"
          ? await resolveDestination(item.query)
          : await resolvePointOfInterest(item.query, item.kind, destination);
      return { key: item.key, place };
    }),
  );

  const payload: ResolveResponse = { destination, items: resolved, provider: placesProvider() };
  return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
}
