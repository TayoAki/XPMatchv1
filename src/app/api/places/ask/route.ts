import { z } from "zod";
import { HttpError, json, parseBody, requireUser, route } from "@/server/http";
import { answerPlaceQuestion, questionGuard } from "@/server/answer";
import { getHelperModel } from "@/server/model";
import { getPlaceFacts } from "@/server/place-facts";
import { resolveDestination, resolvePointOfInterest } from "@/server/places";

export const dynamic = "force-dynamic";

const schema = z.object({
  placeId: z.string().max(200).optional(),
  name: z.string().trim().max(160).optional(),
  kind: z.enum(["hotel", "restaurant", "attraction", "destination"]).optional(),
  destination: z.string().trim().max(160).optional(),
  question: z.string().trim().max(300),
});

/**
 * Answers a question about a place from Google's reviews, review summary and
 * attributes. Accepts a place id (sheet) or a name plus destination (chat).
 */
export const POST = route(async (request) => {
  await requireUser(request);
  const body = await parseBody(request, schema);
  const problem = questionGuard(body.question);
  if (problem) throw new HttpError(400, problem);

  let placeId = body.placeId;
  let resolved: { id: string; name: string; kind: string; lat: number; lng: number } | null = null;
  if (!placeId) {
    if (!body.name) throw new HttpError(400, "placeId or name is required");
    const destination = body.destination ? await resolveDestination(body.destination) : null;
    const place = await resolvePointOfInterest(body.name, body.kind ?? "attraction", destination);
    if (!place || place.source !== "google") throw new HttpError(404, `Couldn't find "${body.name}" on Google Places`);
    placeId = place.id;
    resolved = { id: place.id, name: place.name, kind: place.kind, lat: place.lat, lng: place.lng };
  }
  const facts = await getPlaceFacts(placeId, body.kind);
  if (!facts) throw new HttpError(404, "No Google details are available for this place");
  const answer = await answerPlaceQuestion(facts, body.question, getHelperModel());
  return json({ ...answer, place: resolved ?? { id: facts.placeId, name: facts.name, kind: facts.kind } });
});
