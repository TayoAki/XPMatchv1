import { z } from "zod";
import { json, parseBody, requireUser, route } from "@/server/http";
import { computeLegs } from "@/server/routes";

export const dynamic = "force-dynamic";

const schema = z.object({
  mode: z.enum(["walk", "drive", "transit"]).default("walk"),
  points: z.array(z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })).min(2).max(26),
});

/** Travel legs between consecutive points (Routes API when available, straight-line estimates otherwise). */
export const POST = route(async (request) => {
  await requireUser(request);
  const body = await parseBody(request, schema);
  const result = await computeLegs(body.points, body.mode);
  return json({ mode: body.mode, ...result });
});
