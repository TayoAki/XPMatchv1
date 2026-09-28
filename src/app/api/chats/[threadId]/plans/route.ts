import { z } from "zod";
import type { ItineraryDraft } from "@/server/itineraries";
import { json, parseBody, requireUser, resolveParams, route } from "@/server/http";
import { loadChatPlans, saveChatPlan } from "@/server/chat-plans";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ threadId: string }> };

const pick = z.object({ place: z.object({ id: z.string(), name: z.string() }).passthrough(), match: z.object({ score: z.number() }).passthrough() }).passthrough();
const schema = z.object({
  /** The card within the chat: its tool call and position. */
  key: z.string().trim().min(1).max(200),
  tripId: z.string().uuid(),
  draft: z
    .object({
      destination: z.object({ id: z.string(), name: z.string() }).passthrough(),
      stay: pick.nullable(),
      days: z.array(z.object({ day: z.number().int(), title: z.string(), stops: z.array(pick) }).passthrough()).min(1).max(21),
      score: z.number(),
    })
    .passthrough(),
});

/** The itineraries saved from this chat's destination cards. */
export const GET = route(async (_request, ctx: Ctx) => {
  const user = await requireUser();
  const { threadId } = await resolveParams(ctx);
  return json({ plans: await loadChatPlans(user.id, threadId.slice(0, 200)) });
});

/** Saves (or replaces) one card's itinerary with the trip it was saved as. */
export const PUT = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { threadId } = await resolveParams(ctx);
  const body = await parseBody(request, schema);
  const plan = await saveChatPlan(user.id, threadId.slice(0, 200), body.key, body.tripId, body.draft as unknown as ItineraryDraft);
  return json({ plan });
});
