import type { PlaceKind } from "@/lib/places/types";
import { recQuality, type RecContext, type RecFeedback, type RecQuality, type RecVerdict } from "@/lib/recs/types";
import { queryAll, queryOne, type Row } from "./db";
import { iso } from "./models";
import { textArrayOf, toPgArray } from "./taste";

/** Thumbs up / down on recommendations, one row per traveler and place; the newest judgment wins. */

interface RecRow extends Row {
  id: string;
  place_id: string;
  kind: string;
  name: string;
  destination: string | null;
  context: string;
  verdict: string;
  score: number | string | null;
  factors: unknown;
  reason: string | null;
  created_at: unknown;
  updated_at: unknown;
}

const SELECT = "SELECT id, place_id, kind, name, destination, context, verdict, score, factors, reason, created_at, updated_at FROM rec_feedback";

const mapRec = (r: RecRow): RecFeedback => {
  const out: RecFeedback = {
    id: r.id,
    placeId: r.place_id,
    kind: r.kind as PlaceKind,
    name: r.name,
    context: r.context as RecContext,
    verdict: r.verdict as RecVerdict,
    factors: textArrayOf(r.factors),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
  if (r.destination) out.destination = r.destination;
  if (r.score !== null && r.score !== undefined && r.score !== "") out.score = Number(r.score);
  if (r.reason) out.reason = r.reason;
  return out;
};

export async function loadRecFeedback(userId: string): Promise<RecFeedback[]> {
  const rows = await queryAll<RecRow>(`${SELECT} WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 500`, [userId]);
  return rows.map(mapRec);
}

export interface RecFeedbackInput {
  placeId: string;
  kind: PlaceKind;
  name: string;
  destination?: string;
  context: RecContext;
  verdict: RecVerdict;
  score?: number | null;
  factors: string[];
  reason?: string | null;
}

export async function upsertRecFeedback(userId: string, input: RecFeedbackInput): Promise<RecFeedback> {
  const row = await queryOne<RecRow>(
    `INSERT INTO rec_feedback (user_id, place_id, kind, name, destination, context, verdict, score, factors, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10)
     ON CONFLICT (user_id, place_id) DO UPDATE SET
       kind = EXCLUDED.kind,
       name = EXCLUDED.name,
       destination = COALESCE(EXCLUDED.destination, rec_feedback.destination),
       context = EXCLUDED.context,
       verdict = EXCLUDED.verdict,
       score = EXCLUDED.score,
       factors = EXCLUDED.factors,
       reason = EXCLUDED.reason,
       updated_at = now()
     RETURNING id, place_id, kind, name, destination, context, verdict, score, factors, reason, created_at, updated_at`,
    [
      userId,
      input.placeId.slice(0, 200),
      input.kind,
      input.name.trim().slice(0, 200),
      input.destination?.trim() || null,
      input.context,
      input.verdict,
      input.score === undefined || input.score === null ? null : Math.round(input.score),
      toPgArray(input.factors.slice(0, 24).map((f) => f.slice(0, 40))),
      input.reason?.trim().slice(0, 80) || null,
    ],
  );
  if (!row) throw new Error("Could not save the thumbs");
  return mapRec(row);
}

export async function deleteRecFeedback(userId: string, id: string): Promise<void> {
  await queryAll("DELETE FROM rec_feedback WHERE id = $1 AND user_id = $2", [id, userId]);
}

/** Recommendation quality across every traveler (admin view). */
export async function loadRecQualityOverall(): Promise<RecQuality & { travelers: number }> {
  const rows = await queryAll<RecRow & { user_id: string }>(`${SELECT.replace("SELECT id,", "SELECT id, user_id,")} ORDER BY updated_at DESC LIMIT 5000`);
  const quality = recQuality(rows.map(mapRec));
  return { ...quality, travelers: new Set(rows.map((r) => r.user_id)).size };
}
