import type { UserState } from "@/lib/types";
import { json, requireUser, route } from "@/server/http";
import { loadChats, loadNotifications, loadProfile, loadSaved, loadTripsForUser } from "@/server/models";

export const dynamic = "force-dynamic";

/** Everything the client store needs, in one round trip. */
export const GET = route(async () => {
  const user = await requireUser();
  const [profile, saved, trips, chats, updates] = await Promise.all([
    loadProfile(user.id, user.name),
    loadSaved(user.id),
    loadTripsForUser(user.id),
    loadChats(user.id),
    loadNotifications(user.id),
  ]);
  const state: UserState = { user, profile, saved, trips, chats, updates };
  return json(state);
});
