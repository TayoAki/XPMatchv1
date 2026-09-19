import type { AdminUser, BetaStats, QuizStatus } from "@/lib/admin/types";
import { queryAll, queryOne } from "./db";

const count = (value: unknown): number => Number(value ?? 0) || 0;

/** preferences is jsonb: the pg driver hands back an object, PGlite sometimes a string. */
function asPreferences(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string" && value) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return {};
}

const arrayLength = (value: unknown): number => (Array.isArray(value) ? value.length : 0);
const asString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

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

interface RosterRow extends Record<string, unknown> {
  id: string;
  name: string;
  handle: string;
  email: string;
  created_at: unknown;
  onboarded: boolean;
  preferences: unknown;
  trips: unknown;
  chats: unknown;
  saved: unknown;
  last_active: unknown;
}

/** completed = finished the wizard and left real answers; skipped = went through it but left it empty. */
function quizStatus(onboarded: boolean, prefs: Record<string, unknown>): QuizStatus {
  if (!onboarded) return "not-started";
  const filled =
    arrayLength(prefs.interests) > 0 ||
    arrayLength(prefs.stayTypes) > 0 ||
    arrayLength(prefs.cuisines) > 0 ||
    arrayLength(prefs.dietaryTags) > 0 ||
    !!asString(prefs.homeCity) ||
    !!asString(prefs.nextDestination);
  return filled ? "completed" : "skipped";
}

/** Admin-only roster: every account, newest first, with quiz status and light activity. Includes emails. */
export async function loadUserRoster(): Promise<AdminUser[]> {
  const rows = await queryAll<RosterRow>(
    `SELECT u.id, u.name, u.handle, u.email, u.created_at,
            COALESCE(p.onboarded, false) AS onboarded,
            p.preferences,
            (SELECT count(*) FROM trips t WHERE t.owner_id = u.id) AS trips,
            (SELECT count(*) FROM chats c WHERE c.user_id = u.id) AS chats,
            (SELECT count(*) FROM saved_items s WHERE s.user_id = u.id) AS saved,
            GREATEST(
              p.updated_at,
              (SELECT max(created_at) FROM sessions se WHERE se.user_id = u.id),
              (SELECT max(updated_at) FROM chats c WHERE c.user_id = u.id),
              (SELECT max(updated_at) FROM trips t WHERE t.owner_id = u.id)
            ) AS last_active
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
      ORDER BY u.created_at DESC
      LIMIT 500`,
  );
  return rows.map((row) => {
    const prefs = asPreferences(row.preferences);
    return {
      id: row.id,
      name: row.name,
      handle: row.handle,
      email: row.email,
      signedUpAt: isoOrNull(row.created_at) ?? new Date(0).toISOString(),
      onboarded: !!row.onboarded,
      quiz: quizStatus(!!row.onboarded, prefs),
      homeCity: asString(prefs.homeCity),
      interests: arrayLength(prefs.interests),
      lastActiveAt: isoOrNull(row.last_active),
      trips: count(row.trips),
      chats: count(row.chats),
      saved: count(row.saved),
    };
  });
}
