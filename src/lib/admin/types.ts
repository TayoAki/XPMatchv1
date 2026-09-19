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

/** Beta numbers shown on the admin page: who signed up and what they have made so far. */
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
