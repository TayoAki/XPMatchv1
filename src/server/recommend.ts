import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import type { TravelerProfile } from "@/lib/types";
import { candidateFromPlace, scoreMatch, type MatchInputs, type MatchResult } from "@/lib/match";
import { CUISINES, INTERESTS, STAY_MUST_HAVES, STAY_TYPES, optionByLabel } from "@/lib/profile/options";
import { placesApiKey, priceLevelsFor, resolveDestination, searchTextPlaces, type NearbyFilters } from "./places";

/**
 * Home picks: "For you in Rome" as three rows of three, built from the deep
 * profile. Each row runs a few profile-driven Places Text Searches, scores every
 * candidate with the match model and keeps the best three (different categories
 * where possible). Candidates are cached per query and place for six hours;
 * scoring runs fresh per request so thumbs and reactions show right away.
 */

export type HomeRowKey = "things" | "stays" | "eat";

export interface HomePick {
  place: ResolvedPlace;
  match: MatchResult;
}

export interface HomeRow {
  key: HomeRowKey;
  title: string;
  /** The profile facts the queries came from ("Museums & art", "Boutique hotel"). */
  basedOn: string[];
  items: HomePick[];
}

export interface HomePicks {
  destination: ResolvedPlace;
  rows: HomeRow[];
  provider: "google" | "fallback";
  generatedAt: string;
}

export interface RowQuery {
  query: string;
  kind: PlaceKind;
  basedOn?: string;
  filters?: NearbyFilters;
}

const STYLE_QUERY: Record<string, string> = {
  "Food & drink": "food markets and food tours",
  "Culture & history": "historic landmarks and museums",
  "Outdoors & hiking": "parks and hikes",
  Beaches: "beaches",
  Nightlife: "nightlife",
  "Art & design": "art galleries and design",
  "Family friendly": "family activities",
  Luxury: "luxury experiences",
  "Budget travel": "free things to do",
  "Road trips": "scenic day trips",
  Photography: "scenic viewpoints",
  Wellness: "spas and wellness",
};

const uniq = (values: string[]) => [...new Set(values)];

/** The Places queries behind each row, from the profile (exported for tests). */
export function buildHomeQueries(profile: TravelerProfile): Record<HomeRowKey, RowQuery[]> {
  const things: RowQuery[] = [];
  for (const label of profile.interests) {
    const option = optionByLabel(INTERESTS, label);
    if (option?.query) things.push({ query: option.query, kind: "attraction", basedOn: option.label });
    if (things.length >= 3) break;
  }
  if (things.length < 2) {
    for (const style of profile.travelStyles) {
      const q = STYLE_QUERY[style];
      if (q && !things.some((t) => t.query === q)) things.push({ query: q, kind: "attraction", basedOn: style });
      if (things.length >= 3) break;
    }
  }
  if (things.length < 2) things.push({ query: "top things to do", kind: "attraction" });

  const stays: RowQuery[] = [];
  const musts = profile.stayMustHaves.map((l) => optionByLabel(STAY_MUST_HAVES, l)).filter((o): o is NonNullable<typeof o> => !!o);
  const withMust = (q: string) => {
    const pool = musts.find((m) => m.label === "Pool");
    const breakfast = musts.find((m) => m.label === "Breakfast included");
    if (pool) return `${q} with a pool`;
    if (breakfast) return `${q} with breakfast included`;
    return q;
  };
  for (const label of profile.stayTypes) {
    const option = optionByLabel(STAY_TYPES, label);
    if (option?.query) stays.push({ query: withMust(option.query), kind: "hotel", basedOn: option.label });
    if (stays.length >= 2) break;
  }
  if (!stays.length) {
    const tier = profile.budgetTier === "luxury" || profile.budgetTier === "premium" ? "boutique and luxury hotels" : profile.budgetTier === "budget" ? "well-rated affordable hotels" : "well-rated hotels";
    stays.push({ query: withMust(tier), kind: "hotel", basedOn: `${profile.budgetTier} budget` });
  }
  if (musts.some((m) => m.label === "Central location" || m.label === "Walkable area")) stays.push({ query: "hotels in the center", kind: "hotel", basedOn: "Central location" });

  const eat: RowQuery[] = [];
  const priceLevels = priceLevelsFor(profile.budgetTier);
  for (const label of profile.cuisines) {
    const option = optionByLabel(CUISINES, label);
    if (option?.query) eat.push({ query: option.query, kind: "restaurant", basedOn: option.label, filters: { priceLevels } });
    if (eat.length >= 3) break;
  }
  const veg = profile.dietaryTags.find((t) => t === "Vegetarian" || t === "Vegan");
  if (veg) eat.push({ query: `${veg.toLowerCase()} restaurants`, kind: "restaurant", basedOn: veg });
  if (eat.length < 2) eat.push({ query: profile.travelStyles.includes("Food & drink") ? "restaurants locals love" : "best restaurants", kind: "restaurant", filters: { priceLevels } });

  return { things: uniq(things.map((t) => t.query)).map((q) => things.find((t) => t.query === q)!), stays: uniq(stays.map((s) => s.query)).map((q) => stays.find((s) => s.query === q)!), eat: uniq(eat.map((e) => e.query)).map((q) => eat.find((e) => e.query === q)!) };
}

import { inferKind } from "@/lib/places/kind";

export { inferKind };

const ROW_TITLE: Record<HomeRowKey, (destination: string) => string> = {
  things: (d) => `Things to do in ${d}`,
  stays: (d) => `Where to stay in ${d}`,
  eat: (d) => `Where to eat in ${d}`,
};

const CANDIDATE_TTL_MS = 6 * 60 * 60_000;
const candidateCache = new Map<string, { at: number; promise: Promise<ResolvedPlace[]> }>();

function candidates(row: RowQuery, destination: ResolvedPlace): Promise<ResolvedPlace[]> {
  const key = `${row.kind}|${row.query}|${(row.filters?.priceLevels ?? []).join("+")}|${destination.lat.toFixed(3)},${destination.lng.toFixed(3)}`;
  const hit = candidateCache.get(key);
  if (hit && Date.now() - hit.at < CANDIDATE_TTL_MS) return hit.promise;
  const promise = searchTextPlaces(`${row.query} in ${destination.name}`, row.kind, destination, 8, row.filters ?? {}).catch((err: unknown) => {
    candidateCache.delete(key);
    console.warn("[recommend] search failed:", err instanceof Error ? err.message : err);
    return [] as ResolvedPlace[];
  });
  if (candidateCache.size >= 500) candidateCache.delete(candidateCache.keys().next().value as string);
  candidateCache.set(key, { at: Date.now(), promise });
  return promise;
}

/** Best three of a row: highest score first, a different category for the second and third when the pool allows it. */
export function pickTop(scored: HomePick[], count = 3): HomePick[] {
  const sorted = [...scored].sort((a, b) => b.match.score - a.match.score || (b.place.userRatingCount ?? 0) - (a.place.userRatingCount ?? 0));
  const out: HomePick[] = [];
  const categories = new Set<string>();
  for (const pick of sorted) {
    const cat = (pick.place.category ?? "").toLowerCase();
    if (out.length && cat && categories.has(cat) && sorted.some((p) => !out.includes(p) && p !== pick && !categories.has((p.place.category ?? "").toLowerCase()))) continue;
    out.push(pick);
    if (cat) categories.add(cat);
    if (out.length >= count) break;
  }
  for (const pick of sorted) {
    if (out.length >= count) break;
    if (!out.includes(pick)) out.push(pick);
  }
  return out;
}

export async function homePicks(destinationQuery: string, inputs: MatchInputs): Promise<HomePicks | null> {
  const destination = await resolveDestination(destinationQuery);
  if (!destination) return null;
  const queries = buildHomeQueries(inputs.profile);
  const provider = placesApiKey() ? "google" : "fallback";
  const rows: HomeRow[] = [];
  for (const key of ["things", "stays", "eat"] as HomeRowKey[]) {
    const rowQueries = queries[key];
    const lists = provider === "google" ? await Promise.all(rowQueries.map((q) => candidates(q, destination))) : [];
    const seen = new Set<string>();
    const scored: HomePick[] = [];
    const rowKind: PlaceKind = key === "things" ? "attraction" : key === "stays" ? "hotel" : "restaurant";
    for (const list of lists) {
      for (const place of list) {
        if (seen.has(place.id) || place.kind === "destination") continue;
        // Text Search answers with whatever matched the words; keep only what Google's own type agrees
        // with, and nothing without a type at all (a locality such as the city itself).
        if (!place.category) continue;
        const inferred = inferKind(place.category);
        if (inferred && inferred !== rowKind) continue;
        seen.add(place.id);
        scored.push({ place, match: scoreMatch(candidateFromPlace(place), inputs) });
      }
    }
    rows.push({ key, title: ROW_TITLE[key](destination.name), basedOn: uniq(rowQueries.map((q) => q.basedOn ?? "").filter(Boolean)), items: pickTop(scored, 6) });
  }
  return { destination, rows, provider, generatedAt: new Date().toISOString() };
}
