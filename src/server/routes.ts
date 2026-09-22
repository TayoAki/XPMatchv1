import { estimateLeg, type LatLngLike, type TravelLeg } from "@/lib/itinerary";
import { placesApiKey } from "./places";
import { recordCall } from "./api-spend";

/**
 * Travel legs between consecutive stops of a day. With a Google key (and
 * unless ROUTES_API_ENABLED=0) the Routes API answers with real distances and
 * durations for the chosen mode; otherwise, or on any failure, the
 * straight-line estimate from `src/lib/itinerary.ts` stands in, labeled as
 * such. Results are cached per mode and rounded coordinates for a day.
 */

export type TravelMode = "walk" | "drive" | "transit";
export const TRAVEL_MODES: TravelMode[] = ["walk", "drive", "transit"];

export interface RouteLeg extends TravelLeg {
  source: "routes" | "estimate";
}

const ROUTES_BASE = (process.env.ROUTES_BASE_URL?.trim() || "https://routes.googleapis.com").replace(/\/$/, "");
const GOOGLE_MODE: Record<TravelMode, string> = { walk: "WALK", drive: "DRIVE", transit: "TRANSIT" };
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_POINTS = 26;

export function routesEnabled(): boolean {
  return !!placesApiKey() && process.env.ROUTES_API_ENABLED !== "0";
}

const round = (n: number) => Math.round(n * 1e5) / 1e5;
const cacheKey = (mode: TravelMode, points: LatLngLike[]) => `${mode}|${points.map((p) => `${round(p.lat)},${round(p.lng)}`).join(";")}`;

interface CacheEntry {
  at: number;
  legs: Promise<RouteLeg[]>;
}

const cache = new Map<string, CacheEntry>();

/** "1234s" or "1234.5s" from the Routes API. */
export function parseDuration(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = value.match(/^(\d+(?:\.\d+)?)s$/);
  return m ? Number(m[1]) : null;
}

interface RoutesResponse {
  routes?: { legs?: { distanceMeters?: number; duration?: string }[] }[];
}

/** Legs of one Routes API answer, in order; null when the shape is not usable. */
export function parseRoutesResponse(data: RoutesResponse, expectedLegs: number, mode: TravelMode): RouteLeg[] | null {
  const legs = data.routes?.[0]?.legs;
  if (!Array.isArray(legs) || legs.length !== expectedLegs) return null;
  const out: RouteLeg[] = [];
  for (const leg of legs) {
    const seconds = parseDuration(leg.duration);
    const meters = typeof leg.distanceMeters === "number" ? leg.distanceMeters : null;
    if (seconds === null || meters === null) return null;
    out.push({ km: Math.round(meters / 100) / 10, minutes: Math.max(1, Math.round(seconds / 60)), mode: mode === "walk" ? "walk" : "drive", source: "routes" });
  }
  return out;
}

function estimates(points: LatLngLike[], mode: TravelMode): RouteLeg[] {
  const legs: RouteLeg[] = [];
  for (let i = 1; i < points.length; i++) {
    const est = estimateLeg(points[i - 1], points[i]);
    legs.push({ ...est, mode: mode === "walk" ? "walk" : mode === "drive" ? "drive" : est.mode, source: "estimate" });
  }
  return legs;
}

async function computeRoutes(points: LatLngLike[], mode: TravelMode): Promise<RouteLeg[] | null> {
  const key = placesApiKey();
  if (!key) return null;
  const toWaypoint = (p: LatLngLike) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });
  const body: Record<string, unknown> = {
    origin: toWaypoint(points[0]),
    destination: toWaypoint(points[points.length - 1]),
    travelMode: GOOGLE_MODE[mode],
    units: "METRIC",
    languageCode: "en",
  };
  if (points.length > 2) body.intermediates = points.slice(1, -1).map(toWaypoint);
  if (mode === "drive") body.routingPreference = "TRAFFIC_UNAWARE";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    recordCall("routes_essentials");
    const res = await fetch(`${ROUTES_BASE}/directions/v2:computeRoutes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "routes.legs.distanceMeters,routes.legs.duration" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[routes] computeRoutes ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    return parseRoutesResponse((await res.json()) as RoutesResponse, points.length - 1, mode);
  } catch (err) {
    console.warn("[routes] computeRoutes failed:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Real legs when possible; transit is asked one leg at a time because the API does not route transit through intermediates. */
async function realLegs(points: LatLngLike[], mode: TravelMode): Promise<RouteLeg[] | null> {
  if (mode !== "transit") return computeRoutes(points, mode);
  const legs: RouteLeg[] = [];
  for (let i = 1; i < points.length; i++) {
    const leg = await computeRoutes([points[i - 1], points[i]], mode);
    if (!leg) return null;
    legs.push(leg[0]);
  }
  return legs;
}

export async function computeLegs(points: LatLngLike[], mode: TravelMode): Promise<{ legs: RouteLeg[]; source: "routes" | "estimate" | "mixed" }> {
  const trimmed = points.slice(0, MAX_POINTS);
  if (trimmed.length < 2) return { legs: [], source: "estimate" };
  if (!routesEnabled()) return { legs: estimates(trimmed, mode), source: "estimate" };
  const key = cacheKey(mode, trimmed);
  const now = Date.now();
  const hit = cache.get(key);
  let promise: Promise<RouteLeg[]>;
  if (hit && now - hit.at < CACHE_TTL_MS) {
    promise = hit.legs;
  } else {
    promise = realLegs(trimmed, mode).then((legs) => legs ?? estimates(trimmed, mode));
    cache.set(key, { at: now, legs: promise });
    if (cache.size > 2000) cache.delete(cache.keys().next().value as string);
  }
  const legs = await promise;
  if (legs.every((l) => l.source === "estimate")) cache.delete(key);
  const source = legs.every((l) => l.source === "routes") ? "routes" : legs.every((l) => l.source === "estimate") ? "estimate" : "mixed";
  return { legs, source };
}
