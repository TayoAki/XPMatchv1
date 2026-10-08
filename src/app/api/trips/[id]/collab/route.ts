import { json, requireUser, resolveParams, route } from "@/server/http";
import { loadCollab, requireTrip } from "@/server/collab";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** The trip's discussion, comments and group votes. */
export const GET = route(async (_request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await resolveParams(ctx);
  await requireTrip(id, user.id);
  return json(await loadCollab(id));
});
