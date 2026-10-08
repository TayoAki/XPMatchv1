import type { TravelerProfile } from "@/lib/types";
import { BUDGET_OPTIONS, COMPANION_OPTIONS, CUISINES, DIETARY_TAGS, INTERESTS, LOYALTY_PROGRAMS, SPLURGE_OPTIONS, STAY_TYPES, offered } from "@/lib/profile/options";

/**
 * The onboarding quiz: four sections of questions. The typed screens show them, the voice
 * interview asks them and records the answers into the same fields, and both write the
 * traveler's profile.
 */

export type QuizSection = "style" | "stays" | "food" | "wrap";

/** The profile fields the quiz fills. */
export type QuizField = "companions" | "budgetTier" | "splurges" | "stayTypes" | "loyaltyPrograms" | "cuisines" | "dietaryTags" | "interests" | "notes";

export interface QuizOption {
  /** What is stored ("partner", "premium", "Boutique hotels"). */
  value: string;
  label: string;
  /** "$$$" before a budget label. */
  sign?: string;
}

export interface QuizQuestion {
  field: QuizField;
  /** The argument name the voice interview's record_answers tool uses for this question. */
  arg: string;
  prompt: string;
  kind: "single" | "multi" | "text";
  options: QuizOption[];
  /** Offers "Other" with the traveler's own words. */
  other: boolean;
}

export interface QuizStep {
  key: QuizSection;
  title: string;
  subtitle?: string;
  /** The photo beside the questions. */
  image: string;
  questions: QuizQuestion[];
}

const labelled = (labels: readonly string[]): QuizOption[] => labels.map((label) => ({ value: label, label }));

export const QUIZ: QuizStep[] = [
  {
    key: "style",
    title: "Tell me a bit about your travel style.",
    subtitle: "Share what’s important to you when traveling.",
    image: "/onboarding/style.webp",
    questions: [
      { field: "companions", arg: "companions", prompt: "Who do you usually travel with?", kind: "single", options: COMPANION_OPTIONS.map((o) => ({ value: o.value, label: o.label })), other: false },
      { field: "budgetTier", arg: "budget", prompt: "What best describes your typical travel budget?", kind: "single", options: BUDGET_OPTIONS.map((o) => ({ value: o.value, label: o.label, sign: o.sign })), other: false },
      { field: "splurges", arg: "splurges", prompt: "What types of things do you sometimes splurge on?", kind: "multi", options: labelled(SPLURGE_OPTIONS), other: true },
    ],
  },
  {
    key: "stays",
    title: "Let’s go a little deeper on how you stay.",
    image: "/onboarding/stays.webp",
    questions: [
      { field: "stayTypes", arg: "accommodation", prompt: "What’s your usual accommodation style?", kind: "multi", options: labelled(offered(STAY_TYPES)), other: true },
      { field: "loyaltyPrograms", arg: "loyalty", prompt: "Are you a member of any loyalty programs?", kind: "multi", options: labelled(offered(LOYALTY_PROGRAMS)), other: true },
    ],
  },
  {
    key: "food",
    title: "Share a bit about your food preferences",
    image: "/onboarding/food.webp",
    questions: [
      { field: "cuisines", arg: "restaurants", prompt: "What kinds of restaurants do you like?", kind: "multi", options: labelled(offered(CUISINES)), other: true },
      { field: "dietaryTags", arg: "dietary", prompt: "Do you have any dietary restrictions I should know about?", kind: "multi", options: labelled(offered(DIETARY_TAGS)), other: true },
    ],
  },
  {
    key: "wrap",
    title: "Wrapping up",
    image: "/onboarding/wrap.webp",
    questions: [
      { field: "interests", arg: "weekends", prompt: "How do you like to have fun on the weekends?", kind: "multi", options: labelled(offered(INTERESTS)), other: true },
      { field: "notes", arg: "notes", prompt: "Anything to clarify or final things I should know as your personal travel assistant?", kind: "text", options: [], other: false },
    ],
  },
];

export const QUIZ_QUESTIONS: QuizQuestion[] = QUIZ.flatMap((s) => s.questions);

export const sectionOf = (field: QuizField): QuizSection => QUIZ.find((s) => s.questions.some((q) => q.field === field))!.key;

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** How people say an answer out loud, per question: what was heard → the option's value. */
const SAID: Partial<Record<QuizField, Record<string, string>>> = {
  companions: { alone: "solo", "by myself": "solo", wife: "partner", husband: "partner", girlfriend: "partner", boyfriend: "partner", spouse: "partner", kids: "family", children: "family" },
  budgetTier: { cheap: "budget", affordable: "budget", moderate: "mid-range", "mid range": "mid-range", sensible: "mid-range", "high end": "premium", fancy: "premium" },
  splurges: { hotels: "Stay", hotel: "Stay", stays: "Stay", accommodation: "Stay", food: "Restaurants", dining: "Restaurants", activities: "Experiences", tours: "Experiences" },
  stayTypes: { "b b": "Bed & breakfasts", bnb: "Bed & breakfasts", airbnb: "Short-term rentals", vrbo: "Short-term rentals", "vacation rentals": "Short-term rentals", apartments: "Short-term rentals", camping: "Campgrounds", glamping: "Campgrounds", "all inclusive": "Resorts", "cheap hotels": "Budget-friendly hotels", "budget hotels": "Budget-friendly hotels", "5 star": "Luxury hotels", "five star": "Luxury hotels" },
  cuisines: { pubs: "Pub / tavern food", taverns: "Pub / tavern food", vegan: "Vegetarian / vegan eateries", vegetarian: "Vegetarian / vegan eateries", cafes: "Cafes/bistros", bistros: "Cafes/bistros", "food trucks": "Food trucks", "street food": "Local street food" },
  dietaryTags: { lactose: "Dairy-free", "lactose intolerant": "Dairy-free", "no dairy": "Dairy-free", celiac: "Gluten-free", "no gluten": "Gluten-free" },
  interests: { hiking: "Outdoors", nature: "Outdoors", parks: "Outdoors", concerts: "Live music", music: "Live music", spa: "Wellness & spa", spas: "Wellness & spa", gym: "Fitness", "working out": "Fitness", museums: "Art & museums", galleries: "Art & museums", clubs: "Bars & nightlife", bars: "Bars & nightlife", theater: "Movies & theater", movies: "Movies & theater", sports: "Sports games", comedy: "Comedy shows" },
};

/**
 * The option a spoken or typed answer means: exact label or value, a common way of saying it, a
 * label that starts with it, contains it or is contained in it, then a common way of saying it
 * inside a longer answer ("with my wife").
 */
export function matchOption(question: QuizQuestion, answer: string): QuizOption | null {
  const a = squash(answer);
  if (!a) return null;
  const byValue = (value: string) => question.options.find((o) => o.value === value) ?? null;
  const exact = question.options.find((o) => squash(o.label) === a || squash(o.value) === a);
  if (exact) return exact;
  const said = SAID[question.field] ?? {};
  if (said[a]) return byValue(said[a]);
  const words = (o: QuizOption) => squash(o.label);
  const close = question.options.find((o) => words(o).startsWith(a) || (a.length >= 4 && words(o).includes(a)) || (words(o).length >= 4 && a.includes(words(o))));
  if (close) return close;
  const padded = ` ${a} `;
  const phrase = Object.keys(said)
    .sort((x, y) => y.length - x.length)
    .find((k) => padded.includes(` ${k} `));
  return phrase ? byValue(said[phrase]) : null;
}

/** An answer in the traveler's own words ("Other"), tidied and kept short. */
export function ownWords(answer: string): string {
  const t = answer.replace(/\s+/g, " ").trim().slice(0, 40);
  return t ? t[0].toUpperCase() + t.slice(1) : "";
}

const asList = (value: unknown): string[] => (Array.isArray(value) ? value : typeof value === "string" ? value.split(/,|\band\b/) : []).map((v) => String(v).trim()).filter(Boolean);

/**
 * Applies what the voice interview recorded (record_answers arguments) to the profile. Single
 * answers must name an option; multi answers replace the question's list, each value mapped to
 * an option or kept in the traveler's words; notes replace the notes.
 */
export function applyRecordedAnswers(profile: TravelerProfile, args: Record<string, unknown>): { profile: TravelerProfile; changed: QuizField[] } {
  let next = profile;
  const changed: QuizField[] = [];
  for (const q of QUIZ_QUESTIONS) {
    if (!(q.arg in args)) continue;
    const raw = args[q.arg];
    if (q.kind === "text") {
      if (typeof raw !== "string") continue;
      next = { ...next, notes: raw.trim().slice(0, 2000) };
      changed.push(q.field);
    } else if (q.kind === "single") {
      const option = typeof raw === "string" ? matchOption(q, raw) : null;
      if (!option) continue;
      next = { ...next, [q.field]: option.value };
      changed.push(q.field);
    } else {
      const values: string[] = [];
      for (const answer of asList(raw)) {
        const value = matchOption(q, answer)?.value ?? (q.other ? ownWords(answer) : "");
        if (value && !values.some((v) => v.toLowerCase() === value.toLowerCase())) values.push(value);
      }
      next = { ...next, [q.field]: values.slice(0, 12) };
      changed.push(q.field);
    }
  }
  return { profile: next, changed };
}

/** The current answers in the words the interview uses, for the tool's reply ("so far: Couple, Upscale, …"). */
export function answersSummary(profile: TravelerProfile, fields: QuizField[] = QUIZ_QUESTIONS.map((q) => q.field)): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const q of QUIZ_QUESTIONS) {
    if (!fields.includes(q.field)) continue;
    const value = profile[q.field];
    if (q.kind === "single") out[q.arg] = q.options.find((o) => o.value === value)?.label ?? String(value);
    else if (q.kind === "multi") out[q.arg] = (value as string[]).map((v) => q.options.find((o) => o.value === v)?.label ?? v);
    else out[q.arg] = String(value ?? "");
  }
  return out;
}
