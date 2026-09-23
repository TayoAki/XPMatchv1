import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import type { LearnedPreference } from "@/lib/types";
import { feedbackKey, type FeedbackSource, type FeedbackVerdict, type PlaceFeedback, type TasteProfile } from "@/lib/feedback/types";
import { computeTasteProfile, strongSignals } from "@/lib/feedback/taste";
import { queryAll, queryOne, type Row } from "./db";
import { insertPreference, iso, jsonb } from "./models";

interface FeedbackRow extends Row {
  id: string;
  place_id: string;
  kind: string;
  name: string;
  destination: string | null;
  place: unknown;
  verdict: string;
  reasons: string[] | string | null;
  note: string;
  trip_id: string | null;
  source: string;
  score: number | string | null;
  created_at: unknown;
  updated_at: unknown;
}

const SELECT = "SELECT id, place_id, kind, name, destination, place, verdict, reasons, note, trip_id, source, score, created_at, updated_at FROM place_feedback";

/** Postgres array literal, safe for both drivers. */
export const toPgArray = (values: string[]): string => `{${values.map((v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;

/** A text[] column as either driver returns it (an array, or PGlite's literal form `{"A","B"}`). */
export function textArrayOf(value: unknown): string[] {
  return reasonsOf(value as FeedbackRow["reasons"]);
}

function reasonsOf(value: FeedbackRow["reasons"]): string[] {
  if (Array.isArray(value)) return value.filter((r): r is string => typeof r === "string");
  if (typeof value === "string") {
    // PGlite may hand text[] back in its literal form: {"A","B"}.
    const inner = value.replace(/^\{|\}$/g, "");
    return inner ? inner.split(",").map((s) => s.replace(/^"|"$/g, "").trim()).filter(Boolean) : [];
  }
  return [];
}

const mapFeedback = (r: FeedbackRow): PlaceFeedback => {
  const out: PlaceFeedback = {
    id: r.id,
    placeId: r.place_id,
    kind: r.kind as PlaceKind,
    name: r.name,
    verdict: r.verdict as FeedbackVerdict,
    reasons: reasonsOf(r.reasons),
    note: r.note ?? "",
    source: r.source as FeedbackSource,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
  if (r.destination) out.destination = r.destination;
  const place = jsonb<ResolvedPlace>(r.place);
  if (place) out.place = place;
  if (r.trip_id) out.tripId = r.trip_id;
  if (r.score !== null && r.score !== undefined && r.score !== "") out.score = Number(r.score);
  return out;
};

export async function loadFeedback(userId: string): Promise<PlaceFeedback[]> {
  const rows = await queryAll<FeedbackRow>(`${SELECT} WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 500`, [userId]);
  return rows.map(mapFeedback);
}

/** The traveler's reaction to one place, when they have one. */
export async function loadFeedbackFor(userId: string, placeId: string): Promise<PlaceFeedback | null> {
  const row = await queryOne<FeedbackRow>(`${SELECT} WHERE user_id = $1 AND place_id = $2`, [userId, placeId]);
  return row ? mapFeedback(row) : null;
}

export interface FeedbackInput {
  placeId?: string;
  name: string;
  kind: PlaceKind;
  destination?: string;
  place?: ResolvedPlace;
  verdict: FeedbackVerdict;
  reasons: string[];
  note: string;
  tripId?: string | null;
  source: FeedbackSource;
  /** Undefined keeps the stored score, null clears it. */
  score?: number | null;
}

/** One row per traveler and place: a new reaction replaces the old one. */
export async function upsertFeedback(userId: string, input: FeedbackInput): Promise<PlaceFeedback> {
  const placeId = input.placeId?.trim() || feedbackKey(input.name, input.place);
  const row = await queryOne<FeedbackRow>(
    `INSERT INTO place_feedback (user_id, place_id, kind, name, destination, place, verdict, reasons, note, trip_id, source, score)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::text[], $9, $10, $11, $12)
     ON CONFLICT (user_id, place_id) DO UPDATE SET
       kind = EXCLUDED.kind,
       name = EXCLUDED.name,
       destination = COALESCE(EXCLUDED.destination, place_feedback.destination),
       place = COALESCE(EXCLUDED.place, place_feedback.place),
       verdict = EXCLUDED.verdict,
       reasons = EXCLUDED.reasons,
       note = EXCLUDED.note,
       trip_id = COALESCE(EXCLUDED.trip_id, place_feedback.trip_id),
       source = EXCLUDED.source,
       score = CASE WHEN $13::boolean THEN EXCLUDED.score ELSE place_feedback.score END,
       updated_at = now()
     RETURNING id, place_id, kind, name, destination, place, verdict, reasons, note, trip_id, source, score, created_at, updated_at`,
    [
      userId,
      placeId,
      input.kind,
      input.name.trim().slice(0, 200),
      input.destination?.trim() || null,
      input.place ? JSON.stringify(input.place) : null,
      input.verdict,
      toPgArray(input.reasons.slice(0, 8).map((r) => r.trim().slice(0, 40)).filter(Boolean)),
      input.note.trim().slice(0, 1000),
      input.tripId ?? null,
      input.source,
      input.score ?? null,
      input.score !== undefined,
    ],
  );
  if (!row) throw new Error("Could not save the reaction");
  return mapFeedback(row);
}

export async function deleteFeedback(userId: string, id: string): Promise<void> {
  await queryAll("DELETE FROM place_feedback WHERE id = $1 AND user_id = $2", [id, userId]);
}

export async function loadTaste(userId: string): Promise<TasteProfile | null> {
  const row = await queryOne<{ taste: unknown }>("SELECT taste FROM profiles WHERE user_id = $1", [userId]);
  const taste = jsonb<TasteProfile>(row?.taste);
  return taste && typeof taste.total === "number" ? taste : null;
}

/**
 * Recomputes the taste profile from every reaction, stores it on the profile
 * row and turns repeated reasons into learned preferences (source "feedback"),
 * which the memory panel and the assistant's context already understand.
 */
export async function refreshTaste(userId: string): Promise<{ taste: TasteProfile; preferences: LearnedPreference[] }> {
  const feedback = await loadFeedback(userId);
  const taste = computeTasteProfile(feedback);
  await queryAll(
    `INSERT INTO profiles (user_id, taste, updated_at) VALUES ($1, $2::jsonb, now())
     ON CONFLICT (user_id) DO UPDATE SET taste = EXCLUDED.taste, updated_at = now()`,
    [userId, JSON.stringify(taste)],
  );
  const preferences: LearnedPreference[] = [];
  for (const signal of strongSignals(taste)) {
    preferences.push(await insertPreference(userId, { statement: signal.statement, domain: signal.domain, polarity: signal.polarity, source: "feedback", tripId: null }));
  }
  return { taste, preferences };
}
