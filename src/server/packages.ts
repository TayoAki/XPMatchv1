import type { LatLng, PlaceKind, ResolvedPlace } from "@/lib/places/types";
import type { BudgetTier, Pace, TravelerProfile } from "@/lib/types";
import { candidateFromPlace, scoreMatch, type MatchInputs, type MatchResult } from "@/lib/match";
import { haversineKm } from "@/lib/itinerary";
import { CUISINES, INTERESTS, optionByLabel } from "@/lib/profile/options";
import { catalogPool } from "./catalog";
import { placesApiKey, resolveDestination, searchTextPlaces } from "./places";
import { buildHomeQueries } from "./recommend";
import { SEED_QUERIES } from "./seed";

/**
 * Packages: one personalized set for a destination (a stay, things to do, places to
 * eat) assembled from the place catalog and scored for this traveler. Three variants
 * come from the same pool under different objectives; every slot keeps two alternates
 * so a swap never needs a search. Google is only touched to seed a thin city.
 */

export type PackageVariantKey = "match" | "second" | "shift";
export type PackageSlotKind = Exclude<PlaceKind, "destination">;

export interface PackagePick {
  place: ResolvedPlace;
  match: MatchResult;
  /** One line on why it is in the package, from the match reasons. */
  why: string;
}

export interface PackageItem extends PackagePick {
  slot: string;
  kind: PackageSlotKind;
  locked: boolean;
  alternates: PackagePick[];
}

export interface PackageVariant {
  key: PackageVariantKey;
  title: string;
  subtitle: string;
  /** Average item score, 5–99. */
  score: number;
  items: PackageItem[];
}

export interface PackageConstraints {
  budgetShift?: -1 | 0 | 1;
  pace?: Pace;
  /** Keep things to do and places to eat within a walk of the stay. */
  walkable?: boolean;
  interestsOff?: string[];
  stayTypesOff?: string[];
  cuisinesOff?: string[];
  /** Place categories the traveler does not want in this package ("Museum"). */
  categoriesOff?: string[];
}

export interface PackageRequest {
  destination: string;
  /** Place ids that must stay in their slot. */
  locks?: string[];
  /** Place ids swapped away or marked not for me. */
  excluded?: string[];
  constraints?: PackageConstraints;
}

export interface PackageResult {
  destination: ResolvedPlace;
  /** The profile facts the package was built from ("Boutique hotel", "Museums & art"). */
  basedOn: string[];
  variants: PackageVariant[];
  poolSize: Record<PackageSlotKind, number>;
  provider: "google" | "fallback";
  generatedAt: string;
}

const KINDS: PackageSlotKind[] = ["hotel", "attraction", "restaurant"];
/** Below this many stored places of a kind, the city gets seeded before building. */
const MIN_POOL = 12;
const BUDGETS: BudgetTier[] = ["budget", "mid-range", "premium", "luxury"];
export const WALK_TOLERANCE_KM: Record<TravelerProfile["walking"], number> = { lots: 3, moderate: 2, little: 1 };
const MORNING = /\b(cafe|café|coffee|bakery|market|viewpoint|park|garden|museum|gallery|breakfast|brunch)\b/i;
const EVENING = /\b(bar|nightlife|cocktail|wine|jazz|club|pub|lounge|late)\b/i;

export interface Scored {
  place: ResolvedPlace;
  match: MatchResult;
}

interface VariantSpec {
  key: PackageVariantKey;
  title: string;
  subtitle: string;
  profile: TravelerProfile;
  things: number;
  /** Extra points for places this variant leans into. */
  boost?: (place: ResolvedPlace) => number;
  /** Tighter radius around the stay, in km. */
  radiusKm?: number;
}

export function thingsFor(pace: Pace): number {
  return pace === "relaxed" ? 2 : pace === "packed" ? 4 : 3;
}

const lower = (s: string | undefined) => (s ?? "").toLowerCase();
const placeText = (p: ResolvedPlace) => lower([p.name, p.category, p.summary].filter(Boolean).join(" "));

/** The profile the package is scored against: the traveler's, minus toggled-off facts, shifted by the chips. */
export function applyConstraints(profile: TravelerProfile, c: PackageConstraints | undefined): TravelerProfile {
  if (!c) return profile;
  const drop = (list: string[], off?: string[]) => (off?.length ? list.filter((l) => !off.some((o) => o.toLowerCase() === l.toLowerCase())) : list);
  const tierIndex = Math.max(0, Math.min(BUDGETS.length - 1, BUDGETS.indexOf(profile.budgetTier) + (c.budgetShift ?? 0)));
  return {
    ...profile,
    interests: drop(profile.interests, c.interestsOff),
    stayTypes: drop(profile.stayTypes, c.stayTypesOff),
    cuisines: drop(profile.cuisines, c.cuisinesOff),
    budgetTier: BUDGETS[tierIndex],
    pace: c.pace ?? profile.pace,
  };
}

export function basedOnFor(profile: TravelerProfile): string[] {
  const out = [...profile.stayTypes.slice(0, 1), ...profile.interests.slice(0, 2), ...profile.cuisines.slice(0, 1)];
  out.push(`${profile.budgetTier} budget`);
  return [...new Set(out)];
}

/** One line for the card from the strongest positive reasons; quality is the fallback. */
export function whyFor(match: MatchResult, place: ResolvedPlace): string {
  const positive = match.reasons.filter((r) => r.delta > 0);
  const specific = positive.filter((r) => r.factor !== "quality").slice(0, 2).map((r) => r.text);
  if (specific.length) return specific.join(" · ");
  const quality = positive.find((r) => r.factor === "quality");
  if (quality) return quality.text;
  return [place.category, place.priceLevel].filter(Boolean).join(" · ") || "A solid pick here";
}

async function seedKind(destination: ResolvedPlace, kind: PackageSlotKind, profile: TravelerProfile): Promise<void> {
  const rows = buildHomeQueries(profile);
  const own = (kind === "hotel" ? rows.stays : kind === "restaurant" ? rows.eat : rows.things).map((r) => ({ query: r.query, filters: r.filters }));
  const generic = SEED_QUERIES.filter((q) => q.kind === kind)
    .slice(0, 3)
    .map((q) => ({ query: q.query, filters: undefined }));
  const queries = [...own, ...generic].filter((q, i, arr) => arr.findIndex((o) => o.query === q.query) === i);
  await Promise.all(
    queries.map((q) =>
      searchTextPlaces(`${q.query} in ${destination.name}`, kind, destination, 20, q.filters ?? {}).catch((err: unknown) => {
        console.warn("[packages] seed search failed:", err instanceof Error ? err.message : err);
        return [] as ResolvedPlace[];
      }),
    ),
  );
}

export async function loadPools(destination: ResolvedPlace, profile: TravelerProfile): Promise<Record<PackageSlotKind, ResolvedPlace[]>> {
  const read = async (kind: PackageSlotKind) => (await catalogPool(destination, kind)).map((hit) => ({ ...hit.place, kind }));
  const pools = {} as Record<PackageSlotKind, ResolvedPlace[]>;
  for (const kind of KINDS) pools[kind] = await read(kind);
  if (placesApiKey()) {
    const thin = KINDS.filter((kind) => pools[kind].length < MIN_POOL);
    if (thin.length) {
      await Promise.all(thin.map((kind) => seedKind(destination, kind, profile)));
      for (const kind of thin) pools[kind] = await read(kind);
    }
  }
  return pools;
}

function passesFloor(place: ResolvedPlace, profile: TravelerProfile): boolean {
  if (place.rating === undefined) return true;
  const lenient = place.kind === "restaurant" && profile.foodAdventure === "adventurous";
  return place.rating >= 4.0 && ((place.userRatingCount ?? 0) >= 50 || lenient);
}

export function scorePool(pool: ResolvedPlace[], inputs: MatchInputs, excluded: Set<string>, categoriesOff: string[]): Scored[] {
  const off = categoriesOff.map((c) => c.toLowerCase());
  const kept = pool.filter((p) => !excluded.has(p.id) && !off.some((c) => lower(p.category).includes(c)));
  const scored = kept.map((place) => ({ place, match: scoreMatch(candidateFromPlace(place), inputs) }));
  const hard = scored.filter((s) => !s.match.factors.includes("passed-before") && !s.match.factors.includes("dealbreaker") && !s.match.factors.includes("taste-dislike"));
  const floored = hard.filter((s) => passesFloor(s.place, inputs.profile));
  const list = floored.length >= 6 ? floored : hard;
  return list.sort((a, b) => b.match.score - a.match.score || (b.place.userRatingCount ?? 0) - (a.place.userRatingCount ?? 0));
}

function coherence(anchor: LatLng | null, place: ResolvedPlace, tolerance: number): number {
  if (!anchor) return 0;
  const km = haversineKm(anchor, place);
  if (km > 12) return -25;
  if (km <= tolerance) return 0;
  return Math.max(-15, -3 * (km - tolerance));
}

export function timeFit(profile: TravelerProfile, place: ResolvedPlace): number {
  const text = placeText(place);
  if (profile.dayRhythm === "early" && MORNING.test(text)) return 3;
  if (profile.dayRhythm === "late" && EVENING.test(text)) return 3;
  return 0;
}

function objective(s: Scored, spec: VariantSpec, anchor: LatLng | null, tolerance: number): number {
  return s.match.score + (spec.boost?.(s.place) ?? 0) + coherence(anchor, s.place, tolerance) + timeFit(spec.profile, s.place);
}

function rank(list: Scored[], spec: VariantSpec, anchor: LatLng | null, tolerance: number): Scored[] {
  return [...list].sort((a, b) => objective(b, spec, anchor, tolerance) - objective(a, spec, anchor, tolerance));
}

/** Picks `count` places from a ranked list: locked ones first, then the best with a different category each. */
function pickMany(ranked: Scored[], count: number, locks: Set<string>, used: Set<string>, spreadPrice: boolean): Scored[] {
  const out: Scored[] = [];
  const categories = new Set<string>();
  const take = (s: Scored) => {
    out.push(s);
    used.add(s.place.id);
    if (s.place.category) categories.add(lower(s.place.category));
  };
  for (const s of ranked) if (locks.has(s.place.id) && !used.has(s.place.id) && out.length < count) take(s);
  const window = ranked.filter((s) => !used.has(s.place.id)).slice(0, 12);
  for (const s of window) {
    if (out.length >= count) break;
    const cat = lower(s.place.category);
    const sameCategory = cat && categories.has(cat) && window.some((o) => !used.has(o.place.id) && o !== s && !categories.has(lower(o.place.category)));
    const pricey = spreadPrice && s.place.priceLevel === "$$$$" && out.some((o) => o.place.priceLevel === "$$$$") && window.some((o) => !used.has(o.place.id) && o !== s && o.place.priceLevel !== "$$$$");
    if (sameCategory || pricey) continue;
    take(s);
  }
  for (const s of ranked) {
    if (out.length >= count) break;
    if (!used.has(s.place.id)) take(s);
  }
  return out;
}

function toItem(s: Scored, slot: string, kind: PackageSlotKind, locked: boolean, alternates: Scored[]): PackageItem {
  const pick = (x: Scored): PackagePick => ({ place: x.place, match: x.match, why: whyFor(x.match, x.place) });
  return { ...pick(s), slot, kind, locked, alternates: alternates.map(pick) };
}

function assemble(spec: VariantSpec, scored: Record<PackageSlotKind, Scored[]>, destination: ResolvedPlace, locks: Set<string>, walkable: boolean): PackageVariant {
  const used = new Set<string>();
  const baseTolerance = WALK_TOLERANCE_KM[spec.profile.walking] ?? 2;
  const tolerance = spec.radiusKm ?? (walkable ? Math.min(baseTolerance, 1.5) : baseTolerance);

  const stays = rank(scored.hotel, spec, null, tolerance);
  const [stay] = pickMany(stays, 1, locks, used, false);
  const anchor: LatLng | null = stay?.place ?? destination;

  const things = rank(scored.attraction, spec, anchor, tolerance);
  const picksThings = pickMany(things, spec.things, locks, used, false);
  const eats = rank(scored.restaurant, spec, anchor, tolerance);
  const picksEats = pickMany(eats, 3, locks, used, true);

  const alternatesFor = (ranked: Scored[]) => ranked.filter((s) => !used.has(s.place.id)).slice(0, 2);
  const items: PackageItem[] = [];
  if (stay) items.push(toItem(stay, "stay", "hotel", locks.has(stay.place.id), alternatesFor(stays)));
  picksThings.forEach((s, i) => items.push(toItem(s, `do-${i + 1}`, "attraction", locks.has(s.place.id), alternatesFor(things))));
  picksEats.forEach((s, i) => items.push(toItem(s, `eat-${i + 1}`, "restaurant", locks.has(s.place.id), alternatesFor(eats))));

  const score = items.length ? Math.round(items.reduce((sum, it) => sum + it.match.score, 0) / items.length) : 0;
  return { key: spec.key, title: spec.title, subtitle: spec.subtitle, score: Math.max(5, Math.min(99, score)), items };
}

function keywordBoost(labels: string[], options: typeof INTERESTS, points: number): (place: ResolvedPlace) => number {
  const keywords = labels.flatMap((l) => optionByLabel(options, l)?.keywords ?? []);
  if (!keywords.length) return () => 0;
  return (place) => (keywords.some((k) => placeText(place).includes(k)) ? points : 0);
}

/** The three objectives: pure match, the traveler's second interest leading, and a pace or budget shift. */
export function variantSpecs(profile: TravelerProfile, inputs: MatchInputs): VariantSpec[] {
  const things = thingsFor(profile.pace);
  const specs: VariantSpec[] = [{ key: "match", title: "Your match", subtitle: "The best fit across everything you told us", profile, things }];

  const secondInterest = profile.interests[1];
  const secondCuisine = profile.cuisines[1];
  if (secondInterest) {
    specs.push({
      key: "second",
      title: `More ${secondInterest.toLowerCase()}`,
      subtitle: `Leans into ${secondInterest} for the things to do`,
      profile: { ...profile, interests: [secondInterest, ...profile.interests.filter((i) => i !== secondInterest)] },
      things,
      boost: keywordBoost([secondInterest], INTERESTS, 12),
    });
  } else if (secondCuisine) {
    specs.push({
      key: "second",
      title: `More ${secondCuisine.toLowerCase()}`,
      subtitle: `Leans into ${secondCuisine} for the places to eat`,
      profile: { ...profile, cuisines: [secondCuisine, ...profile.cuisines.filter((c) => c !== secondCuisine)] },
      things,
      boost: keywordBoost([secondCuisine], CUISINES, 12),
    });
  } else {
    specs.push({
      key: "second",
      title: "Local finds",
      subtitle: "Well-loved places with fewer crowds",
      profile,
      things,
      boost: (place) => ((place.userRatingCount ?? 0) >= 50 && (place.userRatingCount ?? 0) < 2000 ? 8 : 0),
    });
  }

  const tendency = inputs.taste?.domains.food?.priceTendency ?? inputs.taste?.domains.stays?.priceTendency;
  const stated = BUDGETS.indexOf(profile.budgetTier);
  const tendencyIndex = tendency ? Math.max(0, Math.min(3, tendency.length - 1)) : -1;
  if (profile.pace === "balanced") {
    specs.push({ key: "shift", title: "Quieter and closer", subtitle: "Fewer stops, all within a short walk of the stay", profile: { ...profile, pace: "relaxed" }, things: 2, radiusKm: 1.5 });
  } else if (tendencyIndex >= 0 && tendencyIndex !== stated) {
    const shifted = BUDGETS[tendencyIndex];
    specs.push({
      key: "shift",
      title: tendencyIndex < stated ? "Easier on the budget" : "A notch up",
      subtitle: `Priced like the places you loved (${shifted})`,
      profile: { ...profile, budgetTier: shifted },
      things,
    });
  } else if (stated < BUDGETS.length - 1) {
    specs.push({ key: "shift", title: "A notch up", subtitle: `One tier above your usual (${BUDGETS[stated + 1]})`, profile: { ...profile, budgetTier: BUDGETS[stated + 1] }, things });
  } else {
    specs.push({ key: "shift", title: "Easier on the budget", subtitle: `One tier below your usual (${BUDGETS[stated - 1]})`, profile: { ...profile, budgetTier: BUDGETS[stated - 1] }, things });
  }
  return specs;
}

/** Builds the three package variants for a destination from the catalog (seeding the city when it is thin). */
export async function buildPackages(request: PackageRequest, inputs: MatchInputs): Promise<PackageResult | null> {
  const destination = await resolveDestination(request.destination);
  if (!destination) return null;
  const constraints = request.constraints ?? {};
  const profile = applyConstraints(inputs.profile, constraints);
  const scoringInputs: MatchInputs = { ...inputs, profile };
  const pools = await loadPools(destination, profile);
  const excluded = new Set(request.excluded ?? []);
  const locks = new Set(request.locks ?? []);
  const scored = {} as Record<PackageSlotKind, Scored[]>;
  for (const kind of KINDS) scored[kind] = scorePool(pools[kind], scoringInputs, excluded, constraints.categoriesOff ?? []);
  const variants = variantSpecs(profile, scoringInputs).map((spec) => {
    // A variant with its own profile re-scores the pool so its reasons match its objective.
    const own = spec.profile === profile ? scored : (Object.fromEntries(KINDS.map((kind) => [kind, scorePool(pools[kind], { ...scoringInputs, profile: spec.profile }, excluded, constraints.categoriesOff ?? [])])) as Record<PackageSlotKind, Scored[]>);
    return assemble(spec, own, destination, locks, !!constraints.walkable);
  });
  return {
    destination,
    basedOn: basedOnFor(profile),
    variants,
    poolSize: { hotel: pools.hotel.length, attraction: pools.attraction.length, restaurant: pools.restaurant.length },
    provider: placesApiKey() ? "google" : "fallback",
    generatedAt: new Date().toISOString(),
  };
}
