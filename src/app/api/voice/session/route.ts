import { z } from "zod";
import { VOICE_OPTIONS } from "@/lib/profile/options";
import { HttpError, json, parseBody, requireUser, route } from "@/server/http";
import { allow } from "@/server/rate-limit";
import { mintVoiceSession, voiceConfigured } from "@/server/voice";

export const dynamic = "force-dynamic";

/** Interviews a traveler can start in a day: retries and a second go, not a voice chat line. */
const DAILY_SESSIONS = 8;

const places = z.array(z.string().trim().min(1).max(120)).max(10).default([]);
const schema = z.object({
  voice: z.string().refine((v) => VOICE_OPTIONS.some((o) => o.name === v), "Unknown voice"),
  firstName: z.string().trim().max(40).default(""),
  homeCity: z.string().trim().max(120).default(""),
  personality: z.enum(["casual", "neutral", "professional"]).default("neutral"),
  placesBeen: places,
  placesWant: places,
  trip: z.string().trim().max(600).default(""),
  answered: z.string().trim().max(1500).default(""),
});

/** A single-use token for one voice interview with Gemini Live (the key stays on the server). */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  if (!voiceConfigured()) throw new HttpError(503, "The voice interview isn't set up on this server.");
  const body = await parseBody(request, schema);
  if (!allow(`voice:${user.id}`, DAILY_SESSIONS, 24 * 60 * 60_000)) throw new HttpError(429, "That's enough interviews for today. You can finish by typing.");
  try {
    const { voice, ...ctx } = body;
    return json(await mintVoiceSession(ctx, voice));
  } catch (err) {
    console.error("[voice] could not start a session:", err instanceof Error ? err.message : err);
    throw new HttpError(502, "Couldn't start the voice interview. You can finish by typing.");
  }
});
