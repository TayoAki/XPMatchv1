import type { ItineraryDraft } from "./itineraries";
import { queryAll, queryOne, type Row } from "./db";
import { HttpError } from "./http";
import { iso, jsonb, loadTrip } from "./models";

/**
 * Itineraries saved from a chat: a destination card's plan as the traveler shaped it (swaps, order,
 * times), kept under the chat and the card it came from, next to the trip it was saved as. Reopening
 * the chat shows this plan instead of building a new one. Deleting the trip deletes it.
 */

export interface ChatPlan {
  /** The card within the chat (its tool call and position). */
  key: string;
  tripId: string;
  draft: ItineraryDraft;
  updatedAt: string;
}

/** A saved plan is a few hundred places at most; anything far larger is not one of ours. */
export const MAX_PLAN_BYTES = 1_000_000;

interface PlanRow extends Row {
  plan_key: string;
  trip_id: string;
  draft: unknown;
  updated_at: unknown;
}

export async function loadChatPlans(userId: string, threadId: string): Promise<ChatPlan[]> {
  const rows = await queryAll<PlanRow>(
    // Only plans whose trip the traveler is still on (every member, the owner too, has a membership row).
    `SELECT p.plan_key, p.trip_id, p.draft, p.updated_at FROM chat_plans p
     WHERE p.user_id = $1 AND p.thread_id = $2
       AND EXISTS (SELECT 1 FROM trip_members m WHERE m.trip_id = p.trip_id AND m.user_id = $1)
     ORDER BY p.updated_at`,
    [userId, threadId],
  );
  return rows.flatMap((r) => {
    const draft = jsonb<ItineraryDraft>(r.draft);
    return draft ? [{ key: r.plan_key, tripId: String(r.trip_id), draft, updatedAt: iso(r.updated_at) }] : [];
  });
}

export async function saveChatPlan(userId: string, threadId: string, key: string, tripId: string, draft: ItineraryDraft): Promise<ChatPlan> {
  const trip = await loadTrip(tripId, userId);
  if (!trip) throw new HttpError(404, "Trip not found");
  if (trip.role === "viewer") throw new HttpError(403, "Viewers cannot edit this trip");
  const body = JSON.stringify(draft);
  if (body.length > MAX_PLAN_BYTES) throw new HttpError(413, "That plan is too large to save");
  const row = await queryOne<PlanRow>(
    `INSERT INTO chat_plans (user_id, thread_id, plan_key, trip_id, draft) VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (user_id, thread_id, plan_key) DO UPDATE SET trip_id = EXCLUDED.trip_id, draft = EXCLUDED.draft, updated_at = now()
     RETURNING plan_key, trip_id, draft, updated_at`,
    [userId, threadId, key, tripId, body],
  );
  return { key, tripId, draft, updatedAt: iso(row?.updated_at) };
}

export async function deleteChatPlans(userId: string, threadId: string): Promise<void> {
  await queryAll("DELETE FROM chat_plans WHERE user_id = $1 AND thread_id = $2", [userId, threadId]);
}
