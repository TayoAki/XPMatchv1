import { z } from "zod";
import { PREFERENCE_DOMAINS, PREFERENCE_POLARITIES } from "@/lib/types";
import { HttpError, json, parseBody, requireUser, route } from "@/server/http";
import { insertPreference, loadPreferences, loadTrip } from "@/server/models";

export const dynamic = "force-dynamic";

const schema = z.object({
  statement: z.string().trim().min(2).max(200),
  domain: z.enum(PREFERENCE_DOMAINS as [string, ...string[]]).default("general"),
  polarity: z.enum(PREFERENCE_POLARITIES as [string, ...string[]]).default("like"),
  source: z.enum(["onboarding", "chat", "feedback"]).default("chat"),
  tripId: z.string().uuid().nullable().optional(),
});

export const GET = route(async () => {
  const user = await requireUser();
  return json({ preferences: await loadPreferences(user.id) });
});

export const POST = route(async (request) => {
  const user = await requireUser(request);
  const body = await parseBody(request, schema);
  if (body.tripId) {
    const trip = await loadTrip(body.tripId, user.id);
    if (!trip) throw new HttpError(404, "Trip not found");
  }
  const preference = await insertPreference(user.id, {
    statement: body.statement,
    domain: body.domain as (typeof PREFERENCE_DOMAINS)[number],
    polarity: body.polarity as (typeof PREFERENCE_POLARITIES)[number],
    source: body.source,
    tripId: body.tripId ?? null,
  });
  return json(preference, { status: 201 });
});
