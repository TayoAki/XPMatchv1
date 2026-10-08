import { json, requireUser, route } from "@/server/http";
import { suggestCities, type CityScope } from "@/server/places";

export const dynamic = "force-dynamic";

/** Place suggestions as the traveler types a city ("Atlanta" → Atlanta, Georgia; Atlanta, Kansas …). */
export const GET = route(async (request) => {
  await requireUser();
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const scope: CityScope = url.searchParams.get("scope") === "home" ? "home" : "any";
  if (q.length < 2) return json({ suggestions: [] });
  return json({ suggestions: await suggestCities(q, scope) });
});
