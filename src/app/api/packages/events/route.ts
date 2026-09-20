import { z } from "zod";
import { queryAll } from "@/server/db";
import { json, parseBody, requireUser, route } from "@/server/http";

export const dynamic = "force-dynamic";

export const PACKAGE_ACTIONS = ["shown", "variant", "swap", "lock", "unlock", "thumbs_up", "thumbs_down", "narrow", "keep", "to_trip", "open"] as const;

const bodySchema = z.object({
  destinationId: z.string().max(200),
  variant: z.string().max(40),
  slot: z.string().max(40).optional(),
  action: z.enum(PACKAGE_ACTIONS),
  fromPlaceId: z.string().max(200).optional(),
  toPlaceId: z.string().max(200).optional(),
  reason: z.string().max(200).optional(),
  /** Match factors of the place acted on, so the learning loop can weigh them. */
  factors: z.array(z.string().max(40)).max(40).optional(),
});

/** Records what a traveler did with a package (kept, swapped, locked, thumbs, turned into a trip): the training signal. */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const body = await parseBody(request, bodySchema);
  await queryAll(
    `INSERT INTO package_events (user_id, destination_id, variant, slot, action, from_place_id, to_place_id, reason, factors)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
    [user.id, body.destinationId, body.variant, body.slot ?? null, body.action, body.fromPlaceId ?? null, body.toPlaceId ?? null, body.reason ?? null, JSON.stringify(body.factors ?? [])],
  );
  return json({ ok: true }, { status: 201 });
});
