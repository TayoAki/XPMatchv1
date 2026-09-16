import { HttpError, json, requireUser, route } from "@/server/http";
import { loadPreferences, loadProfile } from "@/server/models";
import { loadTaste } from "@/server/taste";
import { loadRecFeedback } from "@/server/recs";
import { homePicks } from "@/server/recommend";

export const dynamic = "force-dynamic";

/** "For you in <destination>": three rows of three picks scored against the traveler's profile. */
export const GET = route(async (request) => {
  const user = await requireUser();
  const destination = new URL(request.url).searchParams.get("destination")?.trim() ?? "";
  if (!destination || destination.length > 160) throw new HttpError(400, "destination is required");
  const [profile, taste, preferences, recFeedback] = await Promise.all([loadProfile(user.id, user.name), loadTaste(user.id), loadPreferences(user.id), loadRecFeedback(user.id)]);
  const picks = await homePicks(destination, { profile, taste, preferences, recFeedback });
  if (!picks) throw new HttpError(404, `Couldn't place "${destination}" on the map`);
  return json(picks);
});
