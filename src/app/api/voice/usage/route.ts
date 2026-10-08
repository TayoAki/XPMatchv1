import { z } from "zod";
import { json, parseBody, requireUser, route } from "@/server/http";
import { allow } from "@/server/rate-limit";
import { recordVoiceUsage } from "@/server/voice";

export const dynamic = "force-dynamic";

/** Live sessions end at 15 minutes, so a longer report is not one. */
const MAX_SECONDS = 15 * 60;
const schema = z.object({ seconds: z.number().min(0).max(MAX_SECONDS), modelSeconds: z.number().min(0).max(MAX_SECONDS) });

/** The browser reports how long an interview ran and how long the model spoke, for the admin cost estimate. */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const body = await parseBody(request, schema);
  if (allow(`voice-usage:${user.id}`, 20, 24 * 60 * 60_000)) recordVoiceUsage(body.seconds, body.modelSeconds);
  return json({ ok: true });
});
