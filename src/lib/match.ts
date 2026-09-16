import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import type { LearnedPreference, PreferenceDomain, TravelerProfile } from "@/lib/types";
import { DOMAIN_OF_KIND, type TasteProfile } from "@/lib/feedback/types";
import type { RecFeedback } from "@/lib/recs/types";
import { CUISINES, DIETARY_TAGS, INTERESTS, STAY_MUST_HAVES, STAY_TYPES, matchingOptions, type ProfileOption } from "@/lib/profile/options";

/**
 * Match score: how well one recommendation fits this traveler, from the deep
 * profile, learned preferences, the taste profile and their thumbs on earlier
 * picks. Deterministic and explainable: every point comes with a reason the
 * badge can show, and the factors that fired are stored with the traveler's
 * thumbs so factors that keep misleading them lose weight (calibration).
 */

export interface MatchCandidate {
  kind: PlaceKind;
  name?: string;
  /** Google's primary type ("Italian restaurant") or the card's category / cuisine / style. */
  category?: string;
  /** "$" … "$$$$" or "Free" (Google price level) — the card's price tier works too. */
  priceLevel?: string;
  rating?: number;
  userRatingCount?: number;
  /** Free text: amenities, style, cuisine, description, why it fits, editorial summary. */
  text?: string;
  tradeoffs?: string[];
}

export type MatchFactor =
  | "quality"
  | "few-reviews"
  | "low-rating"
  | "price-fit"
  | "price-near"
  | "price-off"
  | "interest"
  | "style"
  | "stay-type"
  | "must-have"
  | "stay-note"
  | "cuisine"
  | "dietary"
  | "adventurous"
  | "family"
  | "couple"
  | "taste-twin"
  | "taste-reason"
  | "taste-dislike"
  | "pref-like"
  | "pref-dislike"
  | "dealbreaker"
  | "tradeoffs"
  | "passed-before";

export interface MatchReason {
  factor: MatchFactor;
  text: string;
  delta: number;
}

export type MatchLabel = "Great match" | "Good match" | "Worth a look" | "Probably not you";

export interface MatchResult {
  /** 5–99. */
  score: number;
  label: MatchLabel;
  reasons: MatchReason[];
  /** Factors that fired, positive and negative, for the thumbs record. */
  factors: MatchFactor[];
}

export interface MatchInputs {
  profile: TravelerProfile;
  taste?: TasteProfile | null;
  preferences?: LearnedPreference[];
  recFeedback?: RecFeedback[];
}

export const BASE_SCORE = 55;

const STYLE_KEYWORDS: Record<string, string[]> = {
  "Food & drink": ["food", "restaurant", "market", "wine", "bar", "cafe", "café", "trattoria", "bistro"],
  "Culture & history": ["museum", "historic", "historical", "landmark", "ruin", "castle", "cathedral", "church", "basilica", "monument", "gallery", "theater", "theatre"],
  "Outdoors & hiking": ["park", "hiking", "trail", "nature", "garden", "mountain", "lake", "waterfall", "national park"],
  Beaches: ["beach", "seaside", "coast", "cove"],
  Nightlife: ["bar", "club", "nightlife", "cocktail", "pub", "lounge", "music"],
  "Art & design": ["art", "gallery", "design", "architecture", "studio"],
  "Family friendly": ["family", "kid", "children", "zoo", "aquarium", "amusement", "playground"],
  Luxury: ["luxury", "five-star", "5-star", "resort", "fine dining", "spa", "michelin"],
  "Budget travel": ["budget", "cheap", "affordable", "value", "hostel", "street food", "free"],
  "Road trips": ["scenic", "drive", "coast", "national park", "viewpoint"],
  Photography: ["viewpoint", "scenic", "sunset", "panorama", "lookout", "landmark"],
  Wellness: ["spa", "wellness", "thermal", "bath", "sauna", "yoga", "retreat"],
};

const BUDGET_LEVEL: Record<TravelerProfile["budgetTier"], number> = { budget: 1, "mid-range": 2, premium: 3, luxury: 4 };
const BUDGET_LABEL: Record<TravelerProfile["budgetTier"], string> = { budget: "budget", "mid-range": "mid-range", premium: "premium", luxury: "luxury" };

const STOPWORDS = new Set([
  "with", "that", "this", "from", "have", "without", "near", "very", "more", "less", "than", "into", "your", "their", "they", "what", "when", "over", "only",
  "like", "likes", "love", "loves", "prefer", "prefers", "avoid", "avoids", "needs", "need", "value", "values", "cares", "about", "hotel", "hotels", "place",
  "places", "stay", "stays", "trip", "trips", "food", "restaurant", "restaurants", "some", "every", "always", "never", "good", "great", "well", "much",
]);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9$ ]+/g, " ").replace(/\s+/g, " ").trim();

function contentTokens(statement: string): string[] {
  return [...new Set(norm(statement).split(" ").filter((w) => w.length >= 4 && !STOPWORDS.has(w)))];
}

/** True when at least half of a statement's content words appear in the text. */
export function statementMatches(statement: string, text: string): boolean {
  const tokens = contentTokens(statement);
  if (!tokens.length) return false;
  const hits = tokens.filter((t) => text.includes(t)).length;
  return hits / tokens.length >= 0.5;
}

export function priceLevelNumber(level?: string): number | null {
  if (!level) return null;
  const t = level.trim();
  if (/^free$/i.test(t)) return 0;
  const m = t.match(/^\$+$/);
  return m ? Math.min(4, t.length) : null;
}

function compact(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 0 }).format(n);
}

const KIND_DOMAIN: Record<PlaceKind, PreferenceDomain> = { hotel: "stays", restaurant: "food", attraction: "activities", destination: "general" };

/**
 * Per-factor weights learned from thumbs: a factor that fired on picks the
 * traveler thumbed down more than up is dampened (down to 0.4), one that keeps
 * being right is boosted (up to 1.4). Needs three judgments per factor.
 */
export function calibrationFrom(recFeedback: RecFeedback[] | undefined): Partial<Record<MatchFactor, number>> {
  const out: Partial<Record<MatchFactor, number>> = {};
  if (!recFeedback?.length) return out;
  const counts = new Map<string, { up: number; down: number }>();
  for (const f of recFeedback) {
    for (const factor of f.factors) {
      const c = counts.get(factor) ?? { up: 0, down: 0 };
      if (f.verdict === "up") c.up += 1;
      else c.down += 1;
      counts.set(factor, c);
    }
  }
  for (const [factor, c] of counts) {
    const n = c.up + c.down;
    if (n < 3) continue;
    out[factor as MatchFactor] = Math.max(0.4, Math.min(1.4, 0.5 + c.up / n));
  }
  return out;
}

function labelFor(score: number): MatchLabel {
  if (score >= 80) return "Great match";
  if (score >= 65) return "Good match";
  if (score >= 50) return "Worth a look";
  return "Probably not you";
}

function chosen(options: ProfileOption[], labels: string[]): ProfileOption[] {
  const set = new Set(labels.map((l) => l.toLowerCase()));
  return options.filter((o) => set.has(o.label.toLowerCase()));
}

export function scoreMatch(candidate: MatchCandidate, inputs: MatchInputs): MatchResult {
  const { profile } = inputs;
  const calibration = calibrationFrom(inputs.recFeedback);
  const reasons: MatchReason[] = [];
  const add = (factor: MatchFactor, text: string, delta: number) => {
    const weight = delta > 0 ? (calibration[factor] ?? 1) : 1;
    reasons.push({ factor, text, delta: Math.round(delta * weight) });
  };
  const text = norm([candidate.category ?? "", candidate.text ?? "", candidate.name ?? ""].join(" "));
  const tradeoffText = norm((candidate.tradeoffs ?? []).join(" "));
  const kind = candidate.kind;

  // Quality: Google's rating and how many people stand behind it.
  if (candidate.rating !== undefined) {
    const count = candidate.userRatingCount ?? 0;
    const who = count ? ` by ${compact(count)} people` : "";
    if (candidate.rating >= 4.6 && count >= 200) add("quality", `Rated ${candidate.rating.toFixed(1)}${who}`, 12);
    else if (candidate.rating >= 4.3) add("quality", `Rated ${candidate.rating.toFixed(1)}${who}`, 7);
    else if (candidate.rating < 4.0) add("low-rating", `Rated ${candidate.rating.toFixed(1)}${who}`, -8);
    if (count > 0 && count < 50) add("few-reviews", "Few reviews yet", -3);
  }

  // Price against the budget tier.
  const level = priceLevelNumber(candidate.priceLevel);
  if (level !== null && level > 0) {
    const expected = BUDGET_LEVEL[profile.budgetTier];
    const diff = level - expected;
    const tier = "$".repeat(level);
    if (diff === 0) add("price-fit", `${tier} fits your ${BUDGET_LABEL[profile.budgetTier]} budget`, 10);
    else if (diff === -1) add("price-near", `${tier}, a notch below your usual`, 4);
    else if (diff === 1) add("price-near", `${tier}, a notch above your usual`, 0);
    else if (diff >= 2) add("price-off", `${tier}: pricier than your usual`, -10);
    else add("price-off", `${tier}: cheaper than your usual`, -4);
  } else if (level === 0 && kind === "attraction") {
    add("price-fit", "Free to visit", 3);
  }

  // Interests, styles, stay types, cuisines: what the traveler told us they like.
  if (kind === "attraction" || kind === "destination") {
    const hits = chosen(INTERESTS, profile.interests).filter((o) => o.keywords.some((k) => text.includes(k)));
    hits.slice(0, 2).forEach((o, i) => add("interest", o.label, i === 0 ? 12 : 6));
    const styles = profile.travelStyles.filter((s) => (STYLE_KEYWORDS[s] ?? []).some((k) => text.includes(k)));
    if (!hits.length) styles.slice(0, 2).forEach((s) => add("style", s, 6));
  }
  if (kind === "hotel") {
    const types = chosen(STAY_TYPES, profile.stayTypes).filter((o) => o.keywords.some((k) => text.includes(k)));
    if (types.length) add("stay-type", types[0].label, 10);
    const musts = chosen(STAY_MUST_HAVES, profile.stayMustHaves).filter((o) => o.keywords.some((k) => text.includes(k)));
    musts.slice(0, 3).forEach((o) => add("must-have", o.label, 4));
    if (profile.accommodation.trim() && statementMatches(profile.accommodation, text)) add("stay-note", `Matches "${profile.accommodation.trim()}"`, 4);
    const styles = profile.travelStyles.filter((s) => (s === "Luxury" || s === "Budget travel" || s === "Wellness") && (STYLE_KEYWORDS[s] ?? []).some((k) => text.includes(k)));
    if (!types.length) styles.slice(0, 1).forEach((s) => add("style", s, 6));
  }
  if (kind === "restaurant") {
    const cuisines = chosen(CUISINES, profile.cuisines).filter((o) => o.keywords.some((k) => text.includes(k)));
    if (cuisines.length) add("cuisine", cuisines[0].label, 12);
    const tags = chosen(DIETARY_TAGS, profile.dietaryTags).filter((o) => o.keywords.some((k) => text.includes(k)));
    if (tags.length) add("dietary", `${tags[0].label} options mentioned`, 6);
    else if (profile.dietary.trim() && statementMatches(profile.dietary, text)) add("dietary", `Mentions "${profile.dietary.trim()}"`, 5);
    if (profile.foodAdventure === "adventurous" && /street food|market|stall|hole in the wall|no menu|locals/.test(text)) add("adventurous", "The kind of local spot you go for", 4);
    if (!cuisines.length && profile.travelStyles.includes("Food & drink") && matchingOptions(CUISINES, text).length) add("style", "Food & drink", 4);
  }

  // Who they travel with.
  if (profile.companions === "family" && /\b(kid|kids|family|children|child|playground|stroller)\b/.test(text)) add("family", "Good for the kids", 6);
  if (profile.companions === "partner" && /\b(romantic|sunset|rooftop|candlelit|intimate|couples)\b/.test(text)) add("couple", "Made for two", 4);

  // Taste profile: loved twins and disliked patterns.
  const summary = inputs.taste?.domains[DOMAIN_OF_KIND[kind]];
  if (summary) {
    const self = norm(candidate.name ?? "");
    const cat = candidate.category ? norm(candidate.category) : "";
    const twin = cat ? summary.ranked.find((p) => p.verdict === "loved" && p.category && norm(p.category) === cat && norm(p.name) !== self) : undefined;
    if (twin) add("taste-twin", `Like ${twin.name}, which you loved`, 10);
    else if (cat) {
      const foe = summary.ranked.find((p) => p.verdict === "disliked" && p.category && norm(p.category) === cat && norm(p.name) !== self);
      if (foe) add("taste-dislike", `Same type as ${foe.name}, not for you`, -8);
    }
    const liked = summary.liked.find((r) => text.includes(norm(r.reason)));
    if (liked && !twin) add("taste-reason", `Matches what you like: ${liked.reason.toLowerCase()}`, 4);
  }

  // Learned preferences: likes, dislikes and dealbreakers in this domain.
  const domain = KIND_DOMAIN[kind];
  for (const p of inputs.preferences ?? []) {
    if (p.tripId) continue;
    if (p.domain !== domain && p.domain !== "general") continue;
    if (p.polarity === "dealbreaker") {
      if (tradeoffText && statementMatches(p.statement, tradeoffText)) add("dealbreaker", `Conflicts with a dealbreaker: ${p.statement}`, -25);
      continue;
    }
    if (!statementMatches(p.statement, text)) continue;
    if (p.polarity === "like") add("pref-like", p.statement, 5);
    else add("pref-dislike", p.statement, -8);
  }

  // Honest heads-ups on the card cost a little each.
  const tradeoffCount = (candidate.tradeoffs ?? []).filter((t) => t && t.trim()).length;
  if (tradeoffCount) add("tradeoffs", `${tradeoffCount} heads-up${tradeoffCount === 1 ? "" : "s"}`, -4 * Math.min(3, tradeoffCount));

  // Already thumbed down.
  if (candidate.name && inputs.recFeedback?.some((f) => f.verdict === "down" && f.kind === kind && norm(f.name) === norm(candidate.name ?? ""))) {
    add("passed-before", "You passed on this before", -30);
  }

  const raw = BASE_SCORE + reasons.reduce((sum, r) => sum + r.delta, 0);
  const score = Math.max(5, Math.min(99, Math.round(raw)));
  const ordered = [...reasons].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return { score, label: labelFor(score), reasons: ordered, factors: [...new Set(reasons.map((r) => r.factor))] };
}

/** A resolved Google place as a match candidate. */
export function candidateFromPlace(place: ResolvedPlace, extraText?: string): MatchCandidate {
  return {
    kind: place.kind,
    name: place.name,
    category: place.category,
    priceLevel: place.priceLevel,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    text: [place.summary ?? "", place.category ?? "", extraText ?? ""].filter(Boolean).join(" "),
  };
}

/** Stable key for a thumbs record: the Google place id, or a name slug. */
export function recKey(name: string, place?: Pick<ResolvedPlace, "id" | "source"> | null): string {
  if (place && place.source === "google") return place.id;
  return `name:${name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80)}`;
}
