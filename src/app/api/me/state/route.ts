import type { UserState } from "@/lib/types";
import { json, requireUser, route } from "@/server/http";
import { loadChats, loadNotifications, loadPreferences, loadProfile, loadSaved, loadTripsForUser } from "@/server/models";
import { loadFeedback, loadTaste } from "@/server/taste";

export const dynamic = "force-dynamic";

/** Everything the client store needs, in one round trip. */
export const GET = route(async () => {
  const user = await requireUser();
  const [profile, saved, trips, chats, updates, preferences, feedback, taste] = await Promise.all([
    loadProfile(user.id, user.name),
    loadSaved(user.id),
    loadTripsForUser(user.id),
    loadChats(user.id),
    loadNotifications(user.id),
    loadPreferences(user.id),
    loadFeedback(user.id),
    loadTaste(user.id),
  ]);
  const state: UserState = { user, profile, saved, trips, chats, updates, preferences, feedback, taste };
  return json(state);
});
