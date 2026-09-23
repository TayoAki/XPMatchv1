import { z } from "zod";
import { HttpError, json, parseBody, requireUser, resolveParams, route } from "@/server/http";
import { checkIn } from "@/server/reviews";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  /** The reading's own uncertainty in meters, as the browser reports it. */
  accuracy: z.number().min(0).max(100_000),
});

/**
 * "I'm here": checks the traveler in from one location reading. The reading is compared with the
 * place and dropped; only the check-in (when, and how far off it was) is kept.
 */
export const POST = route(async (request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  const { id } = await resolveParams(ctx);
  if (!/^[A-Za-z0-9_:.-]{3,200}$/.test(id) || id.startsWith("name:") || id.startsWith("est:")) throw new HttpError(400, "Check-ins are for places on the map");
  const reading = await parseBody(request, bodySchema);
  return json(await checkIn(user.id, id, reading), { status: 201 });
});
