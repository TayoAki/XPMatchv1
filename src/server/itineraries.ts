import type { LatLng, ResolvedPlace } from "@/lib/places/types";
import type { TravelerProfile } from "@/lib/types";
import type { MatchInputs, MatchResult } from "@/lib/match";
import { MAX_ITINERARY_DAYS as MAX_DAYS, haversineKm } from "@/lib/itinerary";
import { shortPlaceName } from "@/lib/places/names";
import { basedOnFor, loadPools, scorePool, thingsFor, timeFit, whyFor, WALK_TOLERANCE_KM, type Scored } from "./packages";
import { placesApiKey, resolveDestination } from "./places";

export { MAX_ITINERARY_DAYS as MAX_DAYS, daysFromStay } from "@/lib/itinerary";

/**
 * Itinerary drafts: a complete plan for one destination, built for this traveler from the
 * place catalog with the same pools and scoring as packages. The stay that fits best, the
 * things to do spread over the days by area (as many a day as their pace allows), lunch and
 * dinner near each day's stops, and times set by their day rhythm. Nothing is saved until
 * the traveler makes it their itinerary.
 */

export interface DraftPick {
  place: ResolvedPlace;
  match: MatchResult;
  /** One line on why it fits, from the match reasons. */
  why: string;
}

export interface DraftStop extends DraftPick {
  kind: "attraction" | "restaurant";
  meal?: "lunch" | "dinner";
  startTime: string;
  durationMin: number;
}

export interface DraftDay {
  day: number;
  title: string;
  stops: DraftStop[];
}

export interface ItineraryDraft {
  destination: ResolvedPlace;
  stay: DraftPick | null;
  days: DraftDay[];
  /** Average match of the stay and every stop, 5–99. */
  score: number;
  /** The profile facts it was built from ("Boutique hotel", "Museums & art"). */
  basedOn: string[];
  provider: "google" | "fallback";
  generatedAt: string;
}

export type ScoredPools = Record<"hotel" | "attraction" | "restaurant", Scored[]>;

const START_MIN: Record<TravelerProfile["dayRhythm"], number> = { early: 8 * 60 + 30, balanced: 9 * 60 + 30, late: 10 * 60 + 30 };
const DINNER_MIN: Record<TravelerProfile["dayRhythm"], number> = { early: 18 * 60 + 30, balanced: 19 * 60, late: 20 * 60 };
const LUNCH_MIN = 12 * 60 + 30;
const MEAL_MIN = 75;
const TRAVEL_MIN = 20;

const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const lower = (s: string | undefined) => (s ?? "").toLowerCase();

/** How long a visit takes, from what the place is. */
export function visitMinutes(place: ResolvedPlace): number {
  const text = `${lower(place.category)} ${lower(place.name)}`;
  if (/museum|gallery|palace|castle|zoo|aquarium|theme park|amusement/.test(text)) return 120;
  if (/park|garden|beach|trail|hike|market|neighbo|district|village|old town/.test(text)) return 90;
  if (/viewpoint|tower|observation|church|temple|shrine|cathedral|basilica|monument|square|fountain|bridge/.test(text)) return 60;
  return 90;
}

/** The country's own food, as restaurant categories name it ("Korean barbecue restaurant"). */
const LOCAL_CUISINE: Record<string, string> = {
  "south korea": "korean", korea: "korean", japan: "japanese", china: "chinese", taiwan: "taiwanese", "hong kong": "cantonese",
  thailand: "thai", vietnam: "vietnamese", india: "indian", indonesia: "indonesian", malaysia: "malaysian", philippines: "filipino",
  italy: "italian", france: "french", spain: "spanish", portugal: "portuguese", greece: "greek", turkey: "turkish", türkiye: "turkish",
  germany: "german", austria: "austrian", mexico: "mexican", peru: "peruvian", argentina: "argentinian", brazil: "brazilian",
  morocco: "moroccan", lebanon: "lebanese", ethiopia: "ethiopian", georgia: "georgian",
};
/** Extra points a place to eat gets for serving the local food; enough to win a tie with a good match elsewhere. */
const LOCAL_FOOD_BONUS = 8;

/** The local food word for the destination, from the country at the end of its address ("Seoul, South Korea" → "korean"). */
export function localCuisine(destination: ResolvedPlace): string | null {
  const parts = [destination.address, destination.locality, destination.name].filter(Boolean).join(", ").split(",");
  for (const part of parts.reverse()) {
    const cuisine = LOCAL_CUISINE[part.trim().toLowerCase()];
    if (cuisine) return cuisine;
  }
  return null;
}

/** The name two places share when they are branches of one place ("National Museum of Modern and Contemporary Art, Deoksugung"). */
const sameName = (place: ResolvedPlace) => shortPlaceName(place.name).toLowerCase();

function distanceKm(a: LatLng, b: LatLng): number {
  return Number.isFinite(a.lat) && Number.isFinite(b.lat) ? haversineKm(a, b) : 0;
}

/**
 * Up to `count` of the ranked list: one branch of a place at most, and no more than a third of
 * them (at least two) of one category while other kinds are left.
 */
function diverse(ranked: Scored[], count: number): Scored[] {
  const cap = Math.max(2, Math.ceil(count / 3));
  const perCategory = new Map<string, number>();
  const names = new Set<string>();
  const out: Scored[] = [];
  for (const s of ranked) {
    if (out.length >= count) break;
    const cat = lower(s.place.category);
    if (names.has(sameName(s.place)) || (cat && (perCategory.get(cat) ?? 0) >= cap)) continue;
    out.push(s);
    names.add(sameName(s.place));
    if (cat) perCategory.set(cat, (perCategory.get(cat) ?? 0) + 1);
  }
  for (const s of ranked) {
    if (out.length >= count) break;
    if (!out.includes(s) && !names.has(sameName(s.place))) {
      out.push(s);
      names.add(sameName(s.place));
    }
  }
  return out;
}

/**
 * Splits the chosen things to do into `dayCount` days by area: each day starts from a seed as far
 * as possible from the other days' seeds (the best place seeds day one), then every other place
 * joins the nearest day that still has room. Days come out best first.
 */
function groupByArea(chosen: Scored[], dayCount: number, perDay: number): Scored[][] {
  if (dayCount <= 1) return [chosen];
  const seeds: Scored[] = [chosen[0]];
  while (seeds.length < dayCount) {
    let best: Scored | null = null;
    let bestDistance = -1;
    for (const s of chosen) {
      if (seeds.includes(s)) continue;
      const nearest = Math.min(...seeds.map((seed) => distanceKm(seed.place, s.place)));
      if (nearest > bestDistance) {
        best = s;
        bestDistance = nearest;
      }
    }
    if (!best) break;
    seeds.push(best);
  }
  const groups = seeds.map((seed) => [seed]);
  const capacity = Math.max(perDay, Math.ceil(chosen.length / groups.length));
  for (const s of chosen) {
    if (seeds.includes(s)) continue;
    const order = groups
      .map((group, i) => ({ i, km: distanceKm(group[0].place, s.place) }))
      .sort((a, b) => a.km - b.km);
    const target = order.find((o) => groups[o.i].length < capacity) ?? order[0];
    groups[target.i].push(s);
  }
  const best = (group: Scored[]) => Math.max(...group.map((s) => s.match.score));
  return groups.sort((a, b) => best(b) - best(a));
}

/** The day's order: nearest next place, starting from the stay. */
function orderRoute(group: Scored[], start: LatLng): Scored[] {
  const left = [...group];
  const route: Scored[] = [];
  let at = start;
  while (left.length) {
    left.sort((a, b) => distanceKm(at, a.place) - distanceKm(at, b.place));
    const next = left.shift()!;
    route.push(next);
    at = next.place;
  }
  return route;
}

/**
 * The best place to eat near `near` that is not taken yet (nor a branch of one taken): the local
 * food gets a nudge, a second very expensive meal the same day counts against it.
 */
function mealNear(eats: Scored[], near: LatLng, used: Set<string>, pricyToday: boolean, local: string | null): Scored | null {
  let best: Scored | null = null;
  let bestValue = -Infinity;
  for (const s of eats) {
    if (used.has(s.place.id) || used.has(`name:${sameName(s.place)}`)) continue;
    const km = distanceKm(near, s.place);
    const localBonus = local && `${lower(s.place.category)} ${lower(s.place.name)}`.includes(local) ? LOCAL_FOOD_BONUS : 0;
    const value = s.match.score + localBonus - 3 * Math.max(0, km - 1) - (pricyToday && s.place.priceLevel === "$$$$" ? 8 : 0);
    if (value > bestValue) {
      best = s;
      bestValue = value;
    }
  }
  return best;
}

/**
 * The plan itself, from pools already scored for this traveler (exported for tests): the stay,
 * the days with their stops and times, and the overall score.
 */
export function planItinerary(scored: ScoredPools, destination: ResolvedPlace, profile: TravelerProfile, wantedDays: number): Pick<ItineraryDraft, "stay" | "days" | "score"> {
  const pick = (s: Scored): DraftPick => ({ place: s.place, match: s.match, why: whyFor(s.match, s.place) });
  const rhythm = profile.dayRhythm in START_MIN ? profile.dayRhythm : "balanced";

  // The stay: the best match, with a little credit for being central.
  const stayValue = (s: Scored) => s.match.score + timeFit(profile, s.place) - 2 * Math.max(0, distanceKm(destination, s.place) - 3);
  const stay = [...scored.hotel].sort((a, b) => stayValue(b) - stayValue(a))[0] ?? null;
  const anchor: LatLng = stay?.place ?? destination;

  // Things to do: the best for this traveler within reach of the stay, a mix of kinds.
  const reach = (WALK_TOLERANCE_KM[profile.walking] ?? 2) * 2.5;
  const thingValue = (s: Scored) => s.match.score + timeFit(profile, s.place) - Math.min(25, 2 * Math.max(0, distanceKm(anchor, s.place) - reach));
  const perDay = thingsFor(profile.pace);
  const want = Math.max(1, Math.min(MAX_DAYS, Math.round(wantedDays) || 3));
  const chosen = diverse([...scored.attraction].sort((a, b) => thingValue(b) - thingValue(a)), want * perDay);
  const eats = scored.restaurant;
  const dayCount = chosen.length ? Math.min(want, chosen.length) : Math.min(want, Math.ceil(eats.length / 2));
  if (!dayCount) return { stay: stay ? pick(stay) : null, days: [], score: stay ? Math.max(5, Math.min(99, stay.match.score)) : 0 };
  const groups = chosen.length ? groupByArea(chosen, dayCount, perDay) : Array.from({ length: dayCount }, () => [] as Scored[]);

  // Dinner every day while the pool lasts; lunch too when there are enough places to eat.
  const lunches = Math.max(0, Math.min(dayCount, eats.length - dayCount));
  const usedMeals = new Set<string>();
  const local = localCuisine(destination);
  const days: DraftDay[] = groups.map((group, index) => {
    const route = orderRoute(group, anchor);
    const morning = route.slice(0, Math.ceil(route.length / 2));
    const afternoon = route.slice(morning.length);
    const stops: DraftStop[] = [];
    let pricy = false;
    const eat = (s: Scored | null, meal: "lunch" | "dinner", at: number) => {
      if (!s) return;
      usedMeals.add(s.place.id);
      usedMeals.add(`name:${sameName(s.place)}`);
      pricy = pricy || s.place.priceLevel === "$$$$";
      stops.push({ ...pick(s), kind: "restaurant", meal, startTime: hhmm(at), durationMin: MEAL_MIN });
    };
    const visit = (s: Scored, at: number) => {
      const minutes = visitMinutes(s.place);
      stops.push({ ...pick(s), kind: "attraction", startTime: hhmm(at), durationMin: minutes });
      return at + minutes + TRAVEL_MIN;
    };

    let t = START_MIN[rhythm];
    for (const s of morning) t = visit(s, t);
    if (index < lunches) {
      const lunchAt = Math.max(t, LUNCH_MIN);
      eat(mealNear(eats, morning[morning.length - 1]?.place ?? afternoon[0]?.place ?? anchor, usedMeals, pricy, local), "lunch", lunchAt);
      t = lunchAt + MEAL_MIN + TRAVEL_MIN;
    }
    for (const s of afternoon) t = visit(s, t);
    eat(mealNear(eats, route[route.length - 1]?.place ?? anchor, usedMeals, pricy, local), "dinner", Math.max(t, DINNER_MIN[rhythm]));

    const title = route.slice(0, 2).map((s) => shortPlaceName(s.place.name)).join(" · ") || "Eat your way around";
    return { day: index + 1, title, stops };
  });

  const all = [...(stay ? [stay.match.score] : []), ...days.flatMap((d) => d.stops.map((s) => s.match.score))];
  const score = all.length ? Math.max(5, Math.min(99, Math.round(all.reduce((a, b) => a + b, 0) / all.length))) : 0;
  return { stay: stay ? pick(stay) : null, days, score };
}

/**
 * Builds the draft for a destination from the catalog (seeding a thin city first, as packages do).
 * With `only`, the plan uses just those places (a package the traveler already shaped).
 */
export async function buildItineraryDraft(query: string, inputs: MatchInputs, days: number, only?: string[]): Promise<ItineraryDraft | null> {
  const destination = await resolveDestination(query);
  if (!destination) return null;
  const pools = await loadPools(destination, inputs.profile);
  if (only?.length) {
    const keep = new Set(only);
    for (const kind of ["hotel", "attraction", "restaurant"] as const) pools[kind] = pools[kind].filter((p) => keep.has(p.id));
  }
  const none = new Set<string>();
  const scored: ScoredPools = {
    hotel: scorePool(pools.hotel, inputs, none, []),
    attraction: scorePool(pools.attraction, inputs, none, []),
    restaurant: scorePool(pools.restaurant, inputs, none, []),
  };
  return {
    destination,
    ...planItinerary(scored, destination, inputs.profile, days),
    basedOn: basedOnFor(inputs.profile),
    provider: placesApiKey() ? "google" : "fallback",
    generatedAt: new Date().toISOString(),
  };
}
