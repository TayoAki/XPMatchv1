import type { CatalogStats } from "@/lib/admin/types";
import type { LatLng, PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { catalogKind } from "@/lib/places/kind";
import { normalizeName, pickCatalogMatch } from "@/lib/places/names";
import { queryAll, queryOne } from "./db";
import { jsonb } from "./models";

/**
 * The place catalog: every place Google has ever returned to us, stored once and
 * served to everyone. Lookups go alias → fuzzy name match → (free) IDs-only search
 * → Place Details only for a genuinely new id. Place ids are ours to keep; the rest
 * of Google's fields are refreshed when a place is shown and older than 30 days.
 * Every function here fails soft: a catalog problem never breaks a lookup.
 */

/** Google allows caching place content for up to 30 days. */
export const CATALOG_FRESH_MS = 30 * 24 * 3600_000;
/** How far around a destination "in this city" reaches. */
export const POOL_RADIUS_KM = 25;

export interface CatalogPlace {
  place: ResolvedPlace;
  /** Epoch ms of the last Google fetch. */
  fetchedAt: number;
}

interface PlaceRow extends Record<string, unknown> {
  place_id: string;
  kind: string;
  data: unknown;
  google_fetched_at: unknown;
}

const SELECT = "place_id, kind, data, google_fetched_at";

function warn(what: string, err: unknown) {
  console.warn(`[catalog] ${what}:`, err instanceof Error ? err.message : err);
}

function rowToPlace(row: PlaceRow): CatalogPlace | null {
  const place = jsonb<ResolvedPlace>(row.data);
  if (!place || typeof place.lat !== "number") return null;
  const at = new Date(String(row.google_fetched_at)).getTime();
  return { place: { ...place, kind: row.kind as PlaceKind }, fetchedAt: Number.isFinite(at) ? at : 0 };
}

export function isCatalogFresh(hit: CatalogPlace): boolean {
  return Date.now() - hit.fetchedAt < CATALOG_FRESH_MS;
}

export async function getCatalogPlace(id: string): Promise<CatalogPlace | null> {
  if (!id || id.startsWith("est:")) return null;
  try {
    const row = await queryOne<PlaceRow>(`SELECT ${SELECT} FROM places WHERE place_id = $1`, [id]);
    return row ? rowToPlace(row) : null;
  } catch (err) {
    warn("read failed", err);
    return null;
  }
}

/** Places by id, in the order asked for (ids without a row are skipped). */
export async function getCatalogPlaces(ids: string[]): Promise<CatalogPlace[]> {
  const wanted = ids.filter((id) => id && !id.startsWith("est:"));
  if (!wanted.length) return [];
  try {
    const rows = await queryAll<PlaceRow>(`SELECT ${SELECT} FROM places WHERE place_id = ANY($1::text[])`, [wanted]);
    const byId = new Map(rows.map((row) => [row.place_id, rowToPlace(row)] as const));
    return wanted.map((id) => byId.get(id)).filter((p): p is CatalogPlace => !!p);
  } catch (err) {
    warn("read failed", err);
    return [];
  }
}

/** Stores or refreshes Google places (estimates are never stored). */
export async function upsertPlaces(places: ResolvedPlace[], destinationId?: string | null): Promise<void> {
  const real = places.filter((p) => p.source === "google" && p.id && !p.id.startsWith("est:"));
  if (!real.length) return;
  const dest = destinationId && !destinationId.startsWith("est:") ? destinationId : null;
  try {
    for (const place of real) {
      // Stored under what its category says it is (a list search for hotels can return a bar next door).
      const kind = catalogKind(place.kind, place.category);
      await queryAll(
        `INSERT INTO places (place_id, kind, name, name_norm, locality, destination_id, lat, lng, data, google_fetched_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, now(), now())
         ON CONFLICT (place_id) DO UPDATE SET
           kind = EXCLUDED.kind, name = EXCLUDED.name, name_norm = EXCLUDED.name_norm, locality = EXCLUDED.locality,
           destination_id = COALESCE(EXCLUDED.destination_id, places.destination_id),
           lat = EXCLUDED.lat, lng = EXCLUDED.lng, data = EXCLUDED.data, google_fetched_at = now(), updated_at = now()`,
        [place.id, kind, place.name, normalizeName(place.name), place.locality ?? null, dest, place.lat, place.lng, JSON.stringify({ ...place, kind })],
      );
    }
  } catch (err) {
    warn("write failed", err);
  }
}

const aliasKey = (query: string) => normalizeName(query).slice(0, 200);

/** The place a query resolved to before, for this kind and destination. */
export async function findAlias(query: string, kind: PlaceKind, destinationId: string): Promise<CatalogPlace | null> {
  const alias = aliasKey(query);
  if (!alias) return null;
  try {
    const row = await queryOne<PlaceRow>(
      `SELECT p.place_id, p.kind, p.data, p.google_fetched_at
         FROM place_aliases a JOIN places p ON p.place_id = a.place_id
        WHERE a.alias = $1 AND a.kind = $2 AND a.destination_id = $3`,
      [alias, kind, destinationId],
    );
    if (!row) return null;
    void queryAll("UPDATE place_aliases SET hits = hits + 1, updated_at = now() WHERE alias = $1 AND kind = $2 AND destination_id = $3", [alias, kind, destinationId]).catch(() => undefined);
    return rowToPlace(row);
  } catch (err) {
    warn("alias read failed", err);
    return null;
  }
}

export async function saveAlias(query: string, kind: PlaceKind, destinationId: string, placeId: string, source: "lookup" | "fuzzy" | "user"): Promise<void> {
  const alias = aliasKey(query);
  if (!alias || !placeId || placeId.startsWith("est:")) return;
  try {
    await queryAll(
      `INSERT INTO place_aliases (alias, kind, destination_id, place_id, source) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (alias, kind, destination_id) DO UPDATE SET place_id = EXCLUDED.place_id, hits = place_aliases.hits + 1, updated_at = now()`,
      [alias, kind, destinationId, placeId, source],
    );
  } catch (err) {
    warn("alias write failed", err);
  }
}

function boundingBox(center: LatLng, radiusKm: number) {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.max(0.2, Math.cos((center.lat * Math.PI) / 180)));
  return { south: center.lat - dLat, north: center.lat + dLat, west: center.lng - dLng, east: center.lng + dLng };
}

/** Every stored place of a kind around a point, most-rated first. */
export async function catalogPool(center: LatLng, kind: PlaceKind, radiusKm = POOL_RADIUS_KM, limit = 400): Promise<CatalogPlace[]> {
  const box = boundingBox(center, radiusKm);
  try {
    const rows = await queryAll<PlaceRow>(
      `SELECT ${SELECT} FROM places
        WHERE kind = $1 AND lat BETWEEN $2 AND $3 AND lng BETWEEN $4 AND $5
        ORDER BY COALESCE((data->>'userRatingCount')::numeric, 0) DESC
        LIMIT $6`,
      [kind, box.south, box.north, box.west, box.east, limit],
    );
    return rows.map(rowToPlace).filter((p): p is CatalogPlace => !!p);
  } catch (err) {
    warn("pool read failed", err);
    return [];
  }
}

/** A stored place whose name matches the query, near the destination. */
export async function fuzzyCatalogMatch(query: string, kind: PlaceKind, center: LatLng): Promise<CatalogPlace | null> {
  const pool = await catalogPool(center, kind);
  if (!pool.length) return null;
  const candidates = pool.map((hit) => ({ id: hit.place.id, nameNorm: normalizeName(hit.place.name), userRatingCount: hit.place.userRatingCount, hit }));
  return pickCatalogMatch(query, candidates)?.hit ?? null;
}

/* ------------------------- shared caches ------------------------- */

export async function getSearchCache(key: string, maxAgeMs: number): Promise<ResolvedPlace[] | null> {
  try {
    const row = await queryOne<{ place_ids: unknown; fetched_at: unknown }>("SELECT place_ids, fetched_at FROM search_cache WHERE key = $1", [key]);
    if (!row) return null;
    const age = Date.now() - new Date(String(row.fetched_at)).getTime();
    if (!(age < maxAgeMs)) return null;
    const ids = jsonb<string[]>(row.place_ids) ?? [];
    const places = await getCatalogPlaces(ids);
    // A cached list is only good when every place is still in the catalog.
    return places.length === ids.length ? places.map((p) => p.place) : null;
  } catch (err) {
    warn("search cache read failed", err);
    return null;
  }
}

export async function setSearchCache(key: string, places: ResolvedPlace[]): Promise<void> {
  const ids = places.filter((p) => p.source === "google").map((p) => p.id);
  try {
    await queryAll(
      `INSERT INTO search_cache (key, place_ids, fetched_at) VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET place_ids = EXCLUDED.place_ids, fetched_at = now()`,
      [key, JSON.stringify(ids)],
    );
  } catch (err) {
    warn("search cache write failed", err);
  }
}

export async function getPhotoUrl(key: string, maxAgeMs: number): Promise<string | null> {
  try {
    const row = await queryOne<{ uri: string; fetched_at: unknown }>("SELECT uri, fetched_at FROM photo_urls WHERE key = $1", [key]);
    if (!row) return null;
    const age = Date.now() - new Date(String(row.fetched_at)).getTime();
    return age < maxAgeMs ? row.uri : null;
  } catch (err) {
    warn("photo cache read failed", err);
    return null;
  }
}

export async function setPhotoUrl(key: string, uri: string): Promise<void> {
  try {
    await queryAll(
      `INSERT INTO photo_urls (key, uri, fetched_at) VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET uri = EXCLUDED.uri, fetched_at = now()`,
      [key, uri],
    );
  } catch (err) {
    warn("photo cache write failed", err);
  }
}

export async function loadCatalogStats(): Promise<CatalogStats> {
  const n = (v: unknown) => Number(v ?? 0) || 0;
  try {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT (SELECT count(*) FROM places) AS places,
              (SELECT count(*) FROM places WHERE kind = 'destination') AS destinations,
              (SELECT count(*) FROM place_aliases) AS aliases,
              (SELECT COALESCE(sum(hits), 0) FROM place_aliases) AS alias_hits`,
    );
    return { places: n(row?.places), destinations: n(row?.destinations), aliases: n(row?.aliases), aliasHits: n(row?.alias_hits) };
  } catch (err) {
    warn("stats failed", err);
    return { places: 0, destinations: 0, aliases: 0, aliasHits: 0 };
  }
}
