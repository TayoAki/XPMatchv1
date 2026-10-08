import { json, requireUser, route } from "@/server/http";
import { loadNotifications } from "@/server/models";

export const dynamic = "force-dynamic";

/** The traveler's latest updates, polled by the app while it is open so the Updates badge stays current. */
export const GET = route(async () => {
  const user = await requireUser();
  return json({ updates: await loadNotifications(user.id) });
});
