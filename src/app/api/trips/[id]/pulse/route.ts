import { HttpError, json, requireUser, resolveParams, route } from "@/server/http";
import { tripPulse } from "@/server/collab";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Polled by an open trip page every few seconds while the tab is visible: two short version
 * strings, so the page refetches the trip or its conversation only when someone changed them.
 */
export const GET = route(async (_request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await resolveParams(ctx);
  const pulse = await tripPulse(id, user.id);
  if (!pulse) throw new HttpError(404, "Trip not found");
  return json(pulse);
});
