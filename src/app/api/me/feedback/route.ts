import { z } from "zod";
import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { HttpError, json, parseBody, requireUser, route } from "@/server/http";
import { loadTrip } from "@/server/models";
import { loadFeedback, loadTaste, refreshTaste, upsertFeedback } from "@/server/taste";

export const dynamic = "force-dynamic";

const schema = z.object({
  placeId: z.string().trim().max(200).optional(),
  name: z.string().trim().min(1).max(200),
  kind: z.enum(["hotel", "restaurant", "attraction", "destination"]),
  destination: z.string().trim().max(200).optional(),
  place: z.object({ id: z.string(), name: z.string(), lat: z.number(), lng: z.number() }).passthrough().optional(),
  verdict: z.enum(["loved", "fine", "disliked"]),
  reasons: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  note: z.string().max(1000).default(""),
  tripId: z.string().uuid().nullable().optional(),
  source: z.enum(["card", "sheet", "trip", "post_trip", "hide", "chat"]).default("card"),
  score: z.number().min(0).max(10).nullable().optional(),
});

export const GET = route(async () => {
  const user = await requireUser();
  const [feedback, taste] = await Promise.all([loadFeedback(user.id), loadTaste(user.id)]);
  return json({ feedback, taste });
});

/** Records (or replaces) the traveler's reaction to a place and refreshes their taste profile. */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const body = await parseBody(request, schema);
  if (body.tripId) {
    const trip = await loadTrip(body.tripId, user.id);
    if (!trip) throw new HttpError(404, "Trip not found");
  }
  const feedback = await upsertFeedback(user.id, {
    placeId: body.placeId,
    name: body.name,
    kind: body.kind as PlaceKind,
    destination: body.destination,
    place: body.place as ResolvedPlace | undefined,
    verdict: body.verdict,
    reasons: body.reasons,
    note: body.note,
    tripId: body.tripId ?? null,
    source: body.source,
    score: body.score,
  });
  const { taste, preferences } = await refreshTaste(user.id);
  return json({ feedback, taste, preferences }, { status: 201 });
});
