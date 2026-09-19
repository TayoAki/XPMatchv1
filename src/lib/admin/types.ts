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
