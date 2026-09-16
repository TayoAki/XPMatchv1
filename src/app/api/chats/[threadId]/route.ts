import { z } from "zod";
import type { ResolvedPlace } from "@/lib/places/types";
import { queryAll } from "@/server/db";
import { json, parseBody, requireUser, resolveParams, route } from "@/server/http";
import { upsertChat } from "@/server/models";

const schema = z.object({
  title: z.string().trim().min(1).max(120).default("New chat"),
  tripId: z.string().uuid().optional().nullable(),
  /** The destination the chat's map focused on, so the chat card can show its photo. */
  destination: z.string().trim().max(160).optional(),
  place: z.object({ id: z.string(), name: z.string(), lat: z.number(), lng: z.number() }).passthrough().optional(),
});

type Ctx = { params: Promise<{ threadId: string }> };

export const PUT = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { threadId } = await resolveParams(ctx);
  const body = await parseBody(request, schema);
  const chat = await upsertChat(user.id, threadId.slice(0, 200), body.title, body.tripId ?? null, {
    destination: body.destination,
    place: body.place as ResolvedPlace | undefined,
  });
  return json(chat);
});

export const DELETE = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { threadId } = await resolveParams(ctx);
  await queryAll("DELETE FROM chats WHERE thread_id = $1 AND user_id = $2", [threadId, user.id]);
  await queryAll("DELETE FROM chat_messages WHERE thread_id = $1 AND user_id = $2", [threadId, user.id]);
  return json({ ok: true });
});
