import { z } from "zod";
import { MESSAGE_MAX } from "@/lib/collab/types";
import { HttpError, json, parseBody, requireUser, resolveParams, route } from "@/server/http";
import { loadCollab, postMessage, requireTrip } from "@/server/collab";
import { allow } from "@/server/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  body: z.string().trim().min(1, "Write something first").max(MESSAGE_MAX),
  /** A comment on one of the trip's ideas or stops; the trip's discussion without it. */
  target: z.object({ kind: z.enum(["item", "stop"]), id: z.string().min(1).max(80) }).optional(),
});

/** Everyone on the trip can write, including people who can only comment. */
export const POST = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id } = await resolveParams(ctx);
  const trip = await requireTrip(id, user.id);
  const body = await parseBody(request, schema);
  if (!allow(`trip-message:${user.id}`, 120, 60 * 60_000)) throw new HttpError(429, "That's a lot of messages for one hour. Try again in a bit.");
  await postMessage(trip, user, body);
  return json(await loadCollab(id), { status: 201 });
});
