import type { FeedbackVerdict, PlaceFeedback, TasteProfile } from "@/lib/feedback/types";
import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { shortPlaceName } from "@/lib/places/names";
import {
  SIMILAR_AT,
  checkInProblem,
  checkInRadiusMeters,
  formatDistance,
  haversineMeters,
  impossibleTravel,
  reviewerName,
  travelerSimilarity,
  type PlaceReviews,
  type TravelerReview,
  type VisitProof,
} from "@/lib/reviews";
import { DEFAULT_PROFILE, type TravelerProfile } from "@/lib/types";
import { getCatalogPlace } from "./catalog";
import { queryAll, queryOne } from "./db";
import { HttpError } from "./http";
import { jsonb } from "./models";
import { allow } from "./rate-limit";
import { loadFeedbackFor, refreshTaste } from "./taste";

/**
 * Traveler reviews and proof of a visit. A review is the traveler's reaction to a place (loved /
 * fine / not for me, the same row the taste profile learns from) with words, shared with other
 * travelers unless they say no. Proof comes from a check-in on the spot (one location reading,
 * checked here against the place; only the result is stored) or from a booking of theirs for
 * that place that has started.
 */

const DAY_MS = 24 * 3600_000;

export interface CheckInResult {
  proof: "checked_in";
  at: string;
  distanceM: number;
  name: string;
}

/** Checks the traveler in at a place from one location reading, or says why not. */
export async function checkIn(userId: string, placeId: string, reading: { lat: number; lng: number; accuracy: number }): Promise<CheckInResult> {
  if (!allow(`checkin:${userId}`, 20, DAY_MS)) throw new HttpError(429, "That's a lot of check-ins for one day. Try again tomorrow.");
  const hit = await getCatalogPlace(placeId);
  if (!hit) throw new HttpError(404, "Check-ins work for places on XPMatch's map.");
  const place = hit.place;
  const name = shortPlaceName(place.name);
  const distance = haversineMeters(reading, place);
  const problem = checkInProblem(distance, reading.accuracy, checkInRadiusMeters(place.kind, place.category));
  if (problem === "imprecise") throw new HttpError(422, "Your location isn't precise enough to check in. Try again with location services on.");
  if (problem === "far") throw new HttpError(422, `You're ${formatDistance(distance)} from ${name}. Check in when you're there.`);
  // A reading that would mean flying faster than a plane since the last check-in was made up.
  const last = await queryOne<{ created_at: unknown; lat: number; lng: number }>(
    `SELECT v.created_at, p.lat, p.lng FROM place_visits v JOIN places p ON p.place_id = v.place_id
     WHERE v.user_id = $1 ORDER BY v.created_at DESC LIMIT 1`,
    [userId],
  );
  const now = new Date();
  if (last && impossibleTravel({ lat: Number(last.lat), lng: Number(last.lng), at: new Date(String(last.created_at)) }, { ...place, at: now })) {
    throw new HttpError(422, "That check-in is too far from your last one to be possible.");
  }
  const row = await queryOne<{ created_at: unknown }>(
    "INSERT INTO place_visits (user_id, place_id, proof, distance_m) VALUES ($1, $2, 'checked_in', $3) RETURNING created_at",
    [userId, placeId, Math.round(distance)],
  );
  return { proof: "checked_in", at: new Date(String(row?.created_at ?? now)).toISOString(), distanceM: Math.round(distance), name };
}

/** Each traveler's proof for a place: a check-in wins over a booking. */
export async function proofFor(userIds: string[], placeId: string): Promise<Map<string, VisitProof>> {
  const out = new Map<string, VisitProof>();
  if (!userIds.length) return out;
  // A reservation of theirs for this place whose date has come (an import from a confirmation).
  const booked = `ti.details IS NOT NULL
    AND (ti.place->>'id' = $1 OR ti.details->'place'->>'id' = $1)
    AND left(coalesce(ti.details->>'startsAt', ''), 10) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    AND left(ti.details->>'startsAt', 10) <= to_char(now(), 'YYYY-MM-DD')`;
  const [bookings, visits] = await Promise.all([
    queryAll<{ user_id: string }>(
      `SELECT t.owner_id AS user_id FROM trip_items ti JOIN trips t ON t.id = ti.trip_id WHERE ${booked} AND t.owner_id = ANY($2::uuid[])
       UNION
       SELECT tm.user_id FROM trip_items ti JOIN trip_members tm ON tm.trip_id = ti.trip_id WHERE ${booked} AND tm.user_id = ANY($2::uuid[])`,
      [placeId, userIds],
    ),
    queryAll<{ user_id: string }>("SELECT DISTINCT user_id FROM place_visits WHERE place_id = $1 AND user_id = ANY($2::uuid[])", [placeId, userIds]),
  ]);
  for (const b of bookings) out.set(String(b.user_id), "booked");
  for (const v of visits) out.set(String(v.user_id), "checked_in");
  return out;
}

async function profilesOf(userIds: string[]): Promise<Map<string, TravelerProfile>> {
  const rows = userIds.length
    ? await queryAll<{ user_id: string; preferences: unknown }>("SELECT user_id, preferences FROM profiles WHERE user_id = ANY($1::uuid[])", [userIds])
    : [];
  return new Map(rows.map((r) => [String(r.user_id), { ...DEFAULT_PROFILE, ...(jsonb<Partial<TravelerProfile>>(r.preferences) ?? {}) }] as const));
}

interface ReviewRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  verdict: string;
  review: string;
  shared: boolean;
  reviewed_at: unknown;
  updated_at: unknown;
  name: string;
}

/**
 * What travelers say about a place, for one viewer: every shared review (and the viewer's own),
 * with each reviewer's proof and whether they travel like the viewer. The viewer's own comes
 * first, then verified reviews, then those by travelers like them, then the newest.
 */
export async function listReviews(placeId: string, viewerId: string): Promise<PlaceReviews> {
  const rows = await queryAll<ReviewRow>(
    `SELECT f.id, f.user_id, f.verdict, f.review, f.shared, f.reviewed_at, f.updated_at, u.name
     FROM place_feedback f JOIN users u ON u.id = f.user_id
     WHERE f.place_id = $1 AND f.review <> '' AND (f.shared OR f.user_id = $2)
     ORDER BY f.reviewed_at DESC NULLS LAST LIMIT 60`,
    [placeId, viewerId],
  );
  const people = [...new Set([viewerId, ...rows.map((r) => String(r.user_id))])];
  const [proofs, profiles] = await Promise.all([proofFor(people, placeId), profilesOf(people)]);
  const viewer = profiles.get(viewerId) ?? DEFAULT_PROFILE;
  const reviews: TravelerReview[] = rows.map((r) => {
    const userId = String(r.user_id);
    const mine = userId === viewerId;
    const likeness = mine ? { score: 0, inCommon: [] } : travelerSimilarity(viewer, profiles.get(userId) ?? DEFAULT_PROFILE);
    return {
      id: String(r.id),
      author: mine ? "You" : reviewerName(String(r.name ?? "")),
      mine,
      verdict: r.verdict as FeedbackVerdict,
      text: String(r.review),
      at: new Date(String(r.reviewed_at ?? r.updated_at)).toISOString(),
      proof: proofs.get(userId) ?? null,
      similar: !mine && likeness.score >= SIMILAR_AT,
      inCommon: likeness.inCommon,
      shared: !!r.shared,
    };
  });
  const rank = (r: TravelerReview) => (r.mine ? 4 : 0) + (r.proof ? 2 : 0) + (r.similar ? 1 : 0);
  reviews.sort((a, b) => rank(b) - rank(a) || b.at.localeCompare(a.at));
  const others = reviews.filter((r) => !r.mine);
  return {
    reviews,
    summary: {
      count: reviews.length,
      verified: reviews.filter((r) => r.proof).length,
      loved: reviews.filter((r) => r.verdict === "loved").length,
      similarLoved: others.filter((r) => r.proof && r.similar && r.verdict === "loved").length,
    },
    mine: reviews.find((r) => r.mine) ?? null,
    myProof: proofs.get(viewerId) ?? null,
  };
}

export interface ReviewInput {
  placeId: string;
  name: string;
  kind: PlaceKind;
  destination?: string;
  place?: ResolvedPlace;
  verdict: FeedbackVerdict;
  text: string;
  shared: boolean;
}

/** Writes (or rewrites) the traveler's review: their reaction to the place, with words. Returns the reaction as it now stands. */
export async function saveReview(userId: string, input: ReviewInput): Promise<{ feedback: PlaceFeedback | null; taste: TasteProfile }> {
  if (!allow(`review:${userId}`, 30, 3600_000)) throw new HttpError(429, "That's a lot of reviews in an hour. Try again later.");
  await queryAll(
    `INSERT INTO place_feedback (user_id, place_id, kind, name, destination, place, verdict, source, review, shared, reviewed_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, 'review', $8, $9, now())
     ON CONFLICT (user_id, place_id) DO UPDATE SET
       kind = EXCLUDED.kind,
       name = EXCLUDED.name,
       destination = COALESCE(EXCLUDED.destination, place_feedback.destination),
       place = COALESCE(EXCLUDED.place, place_feedback.place),
       verdict = EXCLUDED.verdict,
       review = EXCLUDED.review,
       shared = EXCLUDED.shared,
       reviewed_at = now(),
       updated_at = now()`,
    [
      userId,
      input.placeId,
      input.kind,
      input.name.trim().slice(0, 200),
      input.destination?.trim() || null,
      input.place ? JSON.stringify(input.place) : null,
      input.verdict,
      input.text.trim(),
      input.shared,
    ],
  );
  // The verdict is also a reaction: the taste profile learns from it.
  const { taste } = await refreshTaste(userId);
  return { feedback: await loadFeedbackFor(userId, input.placeId), taste };
}

/** Takes the words down; the reaction (loved / fine / not for me) stays. */
export async function deleteReview(userId: string, placeId: string): Promise<void> {
  await queryAll("UPDATE place_feedback SET review = '', shared = false, reviewed_at = NULL, updated_at = now() WHERE user_id = $1 AND place_id = $2", [userId, placeId]);
}
