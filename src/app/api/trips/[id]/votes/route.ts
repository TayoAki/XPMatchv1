import { z } from "zod";
import { HttpError, json, parseBody, requireUser, resolveParams, route } from "@/server/http";
import { loadCollab, requireTrip, setVote } from "@/server/collab";
import { allow } from "@/server/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  kind: z.enum(["item", "stop"]),
  id: z.string().min(1).max(80),
  /** For (1), against (-1), or take the vote back (0). */
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});

export const PUT = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id } = await resolveParams(ctx);
  const trip = await requireTrip(id, user.id);
  const body = await parseBody(request, schema);
  if (!allow(`trip-vote:${user.id}`, 600, 60 * 60_000)) throw new HttpError(429, "Too many votes in an hour. Try again in a bit.");
  await setVote(trip, user, { kind: body.kind, id: body.id }, body.value);
  return json(await loadCollab(id));
});
