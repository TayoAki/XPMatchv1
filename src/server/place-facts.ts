import type { PlaceDetails, PlaceKind, PlaceReview } from "@/lib/places/types";
import type { PlaceFacts } from "@/lib/places/facts";
import { attributesFrom } from "@/lib/places/evidence";
import { queryAll, queryOne } from "./db";
import { jsonb } from "./models";
import { fetchGooglePlaceDetails, photoProxyUrl, placesApiKey, toResolved, type GooglePlace } from "./places";

/**
 * Place-facts layer: one Place Details call per place per 30 days, shared by
 * every user and every feature that needs evidence (sheet, review Q&A,
 * comparison, heads-ups). Stored in Postgres; a per-process memo dedupes
 * concurrent loads.
 */

export interface StoredPlace {
  details: PlaceDetails;
  facts: PlaceFacts;
}

/** Google allows caching place content for up to 30 days. */
const FRESH_MS = 30 * 24 * 3600_000;
const inflight = new Map<string, Promise<StoredPlace | null>>();

function kindFromTypes(types: string[] | undefined, hint?: PlaceKind): PlaceKind {
  if (hint) return hint;
  const t = new Set(types ?? []);
  if (t.has("locality") || t.has("administrative_area_level_1") || t.has("country")) return "destination";
  if ([...t].some((x) => /lodging|hotel|motel|resort|hostel|guest_house|inn/.test(x))) return "hotel";
  if ([...t].some((x) => /restaurant|food|cafe|bar|bakery|meal/.test(x))) return "restaurant";
  return "attraction";
}

function toStored(place: GooglePlace, id: string, hint?: PlaceKind): StoredPlace | null {
  const kind = kindFromTypes(place.types, hint);
  const base = toResolved(place, kind);
  if (!base) return null;
  const reviews: PlaceReview[] = (place.reviews ?? []).slice(0, 5).map((r) => ({
    author: r.authorAttribution?.displayName ?? "Google user",
    authorPhoto: r.authorAttribution?.photoUri,
    rating: r.rating,
    text: r.text?.text ?? r.originalText?.text ?? "",
    relativeTime: r.relativePublishTimeDescription,
  }));
  const details: PlaceDetails = {
    ...base,
    photos: (place.photos ?? []).slice(0, 10).map((p) => photoProxyUrl(p.name, 1200)),
    reviews,
    openingHours: place.regularOpeningHours?.weekdayDescriptions,
    phone: place.internationalPhoneNumber,
  };
  const facts: PlaceFacts = {
    placeId: id,
    kind,
    name: base.name,
    reviews,
    reviewSummary: place.reviewSummary?.text?.text,
    generativeSummary: place.generativeSummary?.overview?.text,
    attributes: attributesFrom(place as unknown as Record<string, unknown>),
    openingHours: place.regularOpeningHours?.weekdayDescriptions,
    websiteUri: place.websiteUri,
    phone: place.internationalPhoneNumber,
    fetchedAt: new Date().toISOString(),
  };
  return { details, facts };
}

async function fetchAndStore(id: string, hint?: PlaceKind): Promise<StoredPlace | null> {
  const place = await fetchGooglePlaceDetails(id);
  if (!place) return null;
  const stored = toStored(place, id, hint);
  if (!stored) return null;
  await queryAll(
    `INSERT INTO place_facts (place_id, kind, name, facts, fetched_at) VALUES ($1, $2, $3, $4::jsonb, now())
     ON CONFLICT (place_id) DO UPDATE SET kind = EXCLUDED.kind, name = EXCLUDED.name, facts = EXCLUDED.facts, fetched_at = now()`,
    [id, stored.facts.kind, stored.facts.name, JSON.stringify(stored)],
  );
  return stored;
}

/** Details plus evidence for a place id; fresh from Google at most once per 30 days. */
export async function loadPlace(id: string, hint?: PlaceKind): Promise<StoredPlace | null> {
  if (!placesApiKey() || !id || id.startsWith("est:")) return null;
  const pending = inflight.get(id);
  if (pending) return pending;
  const task = (async () => {
    const row = await queryOne<{ facts: unknown; fetched_at: unknown }>("SELECT facts, fetched_at FROM place_facts WHERE place_id = $1", [id]);
    const stored = row ? jsonb<StoredPlace>(row.facts) ?? null : null;
    const age = row ? Date.now() - new Date(String(row.fetched_at)).getTime() : Infinity;
    if (stored && age < FRESH_MS) return stored;
    try {
      return (await fetchAndStore(id, hint ?? stored?.facts.kind)) ?? stored;
    } catch (err) {
      if (stored) {
        console.warn("[places] details refresh failed, serving the cached copy:", err instanceof Error ? err.message : err);
        return stored;
      }
      throw err;
    }
  })().finally(() => inflight.delete(id));
  inflight.set(id, task);
  return task;
}

export async function getPlaceDetails(id: string): Promise<PlaceDetails | null> {
  return (await loadPlace(id))?.details ?? null;
}

export async function getPlaceFacts(id: string, hint?: PlaceKind): Promise<PlaceFacts | null> {
  return (await loadPlace(id, hint))?.facts ?? null;
}
