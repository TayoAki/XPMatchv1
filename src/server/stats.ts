import type { BetaStats } from "@/lib/admin/types";
import { queryAll, queryOne } from "./db";

const count = (value: unknown): number => Number(value ?? 0) || 0;

function isoOrNull(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

/** Counts only, no personal data: sign-ups, recent sign-ups, and what travelers have created. */
export async function loadBetaStats(): Promise<BetaStats> {
  const totals = await queryOne<Record<string, unknown>>(
    `SELECT
       (SELECT count(*) FROM users) AS users,
       (SELECT count(*) FROM users WHERE created_at >= now() - interval '7 days') AS users_7d,
       (SELECT count(*) FROM users WHERE created_at >= now() - interval '24 hours') AS users_24h,
       (SELECT max(created_at) FROM users) AS last_signup_at,
       (SELECT count(*) FROM trips) AS trips,
       (SELECT count(*) FROM chats) AS chats,
       (SELECT count(*) FROM saved_items) AS saved_items,
       (SELECT count(*) FROM guides) AS guides,
       (SELECT count(*) FROM bug_reports WHERE status = 'open') AS bug_reports_open,
       (SELECT count(*) FROM rec_feedback) AS rec_feedback`,
  );
  const byDay = await queryAll<{ day: string; count: unknown }>(
    `SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, count(*) AS count
       FROM users
      WHERE created_at >= now() - interval '14 days'
      GROUP BY 1
      ORDER BY 1`,
  );
  return {
    users: count(totals?.users),
    usersLast7Days: count(totals?.users_7d),
    usersLast24Hours: count(totals?.users_24h),
    lastSignupAt: isoOrNull(totals?.last_signup_at),
    signupsByDay: byDay.map((row) => ({ day: row.day, count: count(row.count) })),
    trips: count(totals?.trips),
    chats: count(totals?.chats),
    savedItems: count(totals?.saved_items),
    guides: count(totals?.guides),
    bugReportsOpen: count(totals?.bug_reports_open),
    recFeedback: count(totals?.rec_feedback),
  };
}
