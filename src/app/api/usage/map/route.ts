import { requireUser, route } from "@/server/http";
import { allow } from "@/server/rate-limit";
import { recordUsage } from "@/server/usage";

export const dynamic = "force-dynamic";

/** More map loads than a heavy day of planning; past it a traveler's reports stop counting. */
const DAILY_MAP_LOADS = 500;

/**
 * The browser reports each Google map it creates. Google bills a Dynamic Maps load per map to the
 * browser key, so the server never sees it otherwise; the count is for the admin cost estimate.
 */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  if (allow(`map-loads:${user.id}`, DAILY_MAP_LOADS, 24 * 60 * 60_000)) recordUsage("google", "dynamic_maps");
  return new Response(null, { status: 204 });
});
