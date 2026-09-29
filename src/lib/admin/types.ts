/** Whether a traveler has been through the setup wizard (the "quiz") and how far. */
export type QuizStatus = "completed" | "skipped" | "not-started";

/** One row of the admin members roster: who signed up and how engaged they are. */
export interface AdminUser {
  id: string;
  name: string;
  handle: string;
  email: string;
  /** ISO timestamp the account was created. */
  signedUpAt: string;
  /** true once the wizard has been finished or skipped. */
  onboarded: boolean;
  /** completed = finished the wizard with real answers; skipped = dismissed it; not-started = never opened. */
  quiz: QuizStatus;
  homeCity: string;
  /** How many interests the traveler picked (a quick read on how filled-in the profile is). */
  interests: number;
  /** ISO timestamp of the most recent sign-in or edit, null if only the sign-up is on record. */
  lastActiveAt: string | null;
  trips: number;
  chats: number;
  saved: number;
}

/** One answer option and how many onboarded travelers chose it. */
export interface QuizAnswer {
  label: string;
  count: number;
}

/** Quiz answers aggregated across every onboarded profile, keyed by profile field. */
export type QuizAnswers = Record<string, QuizAnswer[]>;

/** Display names for the aggregated quiz fields, in the order the admin page shows them. */
export const QUIZ_FIELD_LABELS: { key: string; label: string }[] = [
  { key: "interests", label: "Interests" },
  { key: "travelStyles", label: "Travel style" },
  { key: "budgetTier", label: "Budget" },
  { key: "stayTypes", label: "Stay types" },
  { key: "stayMustHaves", label: "Must-haves" },
  { key: "cuisines", label: "Cuisines" },
  { key: "dietaryTags", label: "Dietary needs" },
  { key: "foodAdventure", label: "Food adventure" },
  { key: "companions", label: "Travels with" },
  { key: "pace", label: "Pace" },
  { key: "dayRhythm", label: "Day rhythm" },
  { key: "walking", label: "Walking" },
  { key: "transport", label: "Transport" },
  { key: "flightPreference", label: "Flights" },
];

/** Beta numbers shown on the admin page: who signed up and what they have made so far. */
/** The place catalog: places stored once and served to everyone, and how often lookups were answered from it. */
export interface CatalogStats {
  places: number;
  destinations: number;
  aliases: number;
  aliasHits: number;
}

/** Package numbers: how many were shown, what travelers did with them, how many became trips. */
export interface PackageStats {
  shown: number;
  travelers: number;
  swaps: number;
  locks: number;
  thumbsUp: number;
  thumbsDown: number;
  trips: number;
  /** 0–100 slots left untouched, null before any package was shown. */
  keepRate: number | null;
  /** 0–100 packages turned into a trip, null before any was shown. */
  tripRate: number | null;
  variants: { variant: string; count: number }[];
}

export interface BetaStats {
  users: number;
  usersLast7Days: number;
  usersLast24Hours: number;
  /** ISO timestamp of the newest account, null before the first sign-up. */
  lastSignupAt: string | null;
  /** Sign-ups per UTC day over the last 14 days, oldest first; days without sign-ups are omitted. */
  signupsByDay: { day: string; count: number }[];
  trips: number;
  chats: number;
  savedItems: number;
  guides: number;
  bugReportsOpen: number;
  recFeedback: number;
}

/** One Google SKU this month: calls against the free allowance, and what the rest cost at list price. */
export interface SkuUsage {
  sku: string;
  label: string;
  calls: number;
  /** Free calls a month; null when the SKU costs nothing. */
  freePerMonth: number | null;
  /** Calls past the free allowance. */
  billable: number;
  /** Dollars after the free allowance. */
  cost: number;
  /** Dollars for every call at list price, as if there were no allowance. */
  listCost: number;
}

/** One model this month: calls, tokens and dollars (OpenRouter's own figure per call when it sent one). */
export interface ModelSpend {
  model: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

/** OpenRouter's own spend figures for the app's key, in dollars, read live from its API. */
export interface OpenRouterSpend {
  total: number;
  month: number;
  week: number;
  today: number;
  /** Spending limit on the key, null when none is set. */
  limit: number | null;
  limitRemaining: number | null;
}

/** One UTC day of spend at list price: Google before free allowances, and the model. */
export interface DailySpend {
  day: string;
  google: number;
  model: number;
}

/** Calls the app answered itself this month instead of paying Google, by kind. */
export interface CacheSavings {
  /** Place lookups: memory, catalog (remembered query or name match), a free id search that found a stored place, a new place bought, no Google answer. */
  lookups: { memory: number; catalog: number; known: number; bought: number; fallback: number };
  photos: { cached: number; bought: number };
  lists: { cached: number; bought: number };
  sheets: { cached: number; bought: number };
  /** What the cached answers would have cost at list price. */
  avoided: number;
}

/** What the app costs: metered calls priced at list price, next to the providers' own figures where one is readable. */
export interface CostReport {
  /** First UTC day with metered usage, null before any. */
  since: string | null;
  /** The month reported, YYYY-MM (UTC). */
  month: string;
  google: SkuUsage[];
  /** This month after free allowances. */
  googleCost: number;
  /** This month at list price, before allowances. */
  googleListCost: number;
  models: ModelSpend[];
  /** This month, as metered by the app. */
  modelCost: number;
  /** null when the key is missing or OpenRouter did not answer. */
  openrouter: OpenRouterSpend | null;
  emails: { sent: number; freePerMonth: number };
  weatherCalls: number;
  hosting: { label: string; monthly: number };
  /** This month so far: Google after allowances, the model (OpenRouter's figure when readable) and hosting. */
  monthToDate: number;
  /** A full month at the pace of the metered days (up to the last 30), allowances applied, hosting included. */
  monthlyPace: number;
  /** Days of metering the pace is based on. */
  paceDays: number;
  /** The last 30 UTC days, oldest first, every day present. */
  daily: DailySpend[];
  savings: CacheSavings;
}

/** Who uses the app and how: active travelers, the path from sign-up to a trip, and how much the assistant is used. */
export interface ActivityReport {
  /** The day the app started recording activity itself; days before it are rebuilt from what travelers left behind. */
  recordedSince: string | null;
  today: number;
  last7Days: number;
  last30Days: number;
  /** Travelers active on two or more days in the last 30. */
  returning30Days: number;
  /** The last 30 UTC days, oldest first, every day present. */
  daily: { day: string; active: number; signups: number }[];
  funnel: { signedUp: number; finishedQuiz: number; chatted: number; madeTrip: number; cameBack: number };
  /** Assistant answers (agent runs). */
  answers: { today: number; last7Days: number; last30Days: number };
  /** Messages travelers wrote, across saved chats. */
  messages: number;
}
