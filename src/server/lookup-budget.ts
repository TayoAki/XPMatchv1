import { HttpError } from "./http";
import { charge } from "./rate-limit";

/**
 * How many place lookups one account may ask for per day, across chat cards, itinerary
 * saves and trip ideas. A heavy planning day is about a hundred; the cap exists so one
 * runaway session cannot spend a month of Google budget.
 */
export const DAILY_LOOKUPS = 400;
const DAY_MS = 24 * 60 * 60_000;

export const LOOKUP_LIMIT_MESSAGE = "Daily place lookup limit reached. It resets tomorrow.";

/** Records `count` lookups for the account; throws 429 when they would go over the daily cap. */
export function assertLookupBudget(userId: string, count: number): void {
  if (count <= 0) return;
  if (!charge(`lookups:${userId}`, count, DAILY_LOOKUPS, DAY_MS)) throw new HttpError(429, LOOKUP_LIMIT_MESSAGE);
}
