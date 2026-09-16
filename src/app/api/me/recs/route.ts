import { z } from "zod";
import type { PlaceKind } from "@/lib/places/types";
import { recQuality, REC_CONTEXTS } from "@/lib/recs/types";
import { json, parseBody, requireUser, route } from "@/server/http";
import { loadRecFeedback, upsertRecFeedback } from "@/server/recs";

export const dynamic = "force-dynamic";

const schema = z.object({
  placeId: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(200),
  kind: z.enum(["hotel", "restaurant", "attraction", "destination"]),
  destination: z.string().trim().max(200).optional(),
  context: z.enum(REC_CONTEXTS as [string, ...string[]]).default("chat"),
  verdict: z.enum(["up", "down"]),
  score: z.number().min(0).max(100).nullable().optional(),
  factors: z.array(z.string().trim().min(1).max(40)).max(24).default([]),
  reason: z.string().trim().max(80).nullable().optional(),
});

/** The traveler's thumbs on recommendations and the hit rate they add up to. */
export const GET = route(async () => {
  const user = await requireUser();
  const recFeedback = await loadRecFeedback(user.id);
  return json({ recFeedback, quality: recQuality(recFeedback) });
});

/** Records (or replaces) thumbs up / down on one recommendation. */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const body = await parseBody(request, schema);
  const recFeedback = await upsertRecFeedback(user.id, {
    placeId: body.placeId,
    name: body.name,
    kind: body.kind as PlaceKind,
    destination: body.destination,
    context: body.context as (typeof REC_CONTEXTS)[number],
    verdict: body.verdict,
    score: body.score,
    factors: body.factors,
    reason: body.reason,
  });
  return json({ recFeedback }, { status: 201 });
});
