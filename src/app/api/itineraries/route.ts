import { z } from "zod";
import { HttpError, json, parseBody, requireUser, route } from "@/server/http";
import { MAX_DAYS, buildItineraryDraft } from "@/server/itineraries";
import { assertLookupBudget } from "@/server/lookup-budget";
import { loadPreferences, loadProfile } from "@/server/models";
import { loadPackageCalibration } from "@/server/package-learning";
import { loadRecFeedback } from "@/server/recs";
import { loadTaste } from "@/server/taste";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  destination: z.string().trim().min(1).max(160),
  days: z.number().int().min(1).max(MAX_DAYS).optional(),
  /** Place ids to plan with and nothing else (a package's places). */
  only: z.array(z.string().max(200)).max(40).optional(),
});

/** A complete itinerary for a destination, built for this traveler from the place catalog. Nothing is saved. */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const body = await parseBody(request, bodySchema);
  // Like a package: one lookup for the budget; the places come from the catalog, Google only seeds a thin city.
  assertLookupBudget(user.id, 1);
  const [profile, taste, preferences, recFeedback, packageCalibration] = await Promise.all([
    loadProfile(user.id, user.name),
    loadTaste(user.id),
    loadPreferences(user.id),
    loadRecFeedback(user.id),
    loadPackageCalibration(user.id),
  ]);
  const itinerary = await buildItineraryDraft(body.destination, { profile, taste, preferences, recFeedback, packageCalibration }, body.days ?? 3, body.only);
  if (!itinerary) throw new HttpError(404, `Couldn't place "${body.destination}" on the map`);
  return json({ itinerary });
});
