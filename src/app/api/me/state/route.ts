import type { UserState } from "@/lib/types";
import { json, requireUser, route } from "@/server/http";
import { loadChats, loadNotifications, loadPreferences, loadProfile, loadSaved, loadTripsForUser } from "@/server/models";
import { loadFeedback, loadTaste } from "@/server/taste";
import { loadRecFeedback } from "@/server/recs";
import { loadPackageCalibration } from "@/server/package-learning";
import { isAdmin } from "@/server/admin";

export const dynamic = "force-dynamic";

/** Everything the client store needs, in one round trip. */
export const GET = route(async () => {
  const user = await requireUser();
  const [profile, saved, trips, chats, updates, preferences, feedback, taste, recFeedback, packageCalibration] = await Promise.all([
    loadProfile(user.id, user.name),
    loadSaved(user.id),
    loadTripsForUser(user.id),
    loadChats(user.id),
    loadNotifications(user.id),
    loadPreferences(user.id),
    loadFeedback(user.id),
    loadTaste(user.id),
    loadRecFeedback(user.id),
    loadPackageCalibration(user.id),
  ]);
  const state: UserState = { user: { ...user, admin: isAdmin(user) }, profile, saved, trips, chats, updates, preferences, feedback, taste, recFeedback, packageCalibration };
  return json(state);
});
