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
