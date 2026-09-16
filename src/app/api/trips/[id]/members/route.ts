import { z } from "zod";
import { queryAll } from "@/server/db";
import { findUserByEmail } from "@/server/auth";
import { HttpError, json, parseBody, requireUser, resolveParams, route } from "@/server/http";
import { loadTrip, loadTripDetail, notify } from "@/server/models";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  email: z.string().trim().email("Enter the member's email"),
  role: z.enum(["editor", "viewer"]).default("editor"),
});

export const POST = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id } = await resolveParams(ctx);
  const trip = await loadTrip(id, user.id);
  if (!trip) throw new HttpError(404, "Trip not found");
  if (trip.role === "viewer") throw new HttpError(403, "Viewers cannot add members");
  const body = await parseBody(request, schema);
  const invitee = await findUserByEmail(body.email);
  if (!invitee) throw new HttpError(404, "No XPMatch account uses that email yet. Ask them to sign up first.");
  await queryAll(
    `INSERT INTO trip_members (trip_id, user_id, role, added_by) VALUES ($1, $2, $3, $4)
     ON CONFLICT (trip_id, user_id) DO UPDATE SET role = CASE WHEN trip_members.role = 'owner' THEN 'owner' ELSE EXCLUDED.role END`,
    [id, invitee.id, body.role, user.id],
  );
  if (invitee.id !== user.id) {
    await notify(invitee.id, "trip_invite", `${user.name} added you to the trip "${trip.title}" (${trip.destination}).`, {
      tripId: id,
      addedBy: user.handle,
    });
  }
  return json(await loadTripDetail(id, user.id), { status: 201 });
});
