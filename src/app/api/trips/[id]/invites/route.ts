import { z } from "zod";
import { HttpError, json, parseBody, requestOrigin, requireUser, resolveParams, route } from "@/server/http";
import { inviteByEmail, linkInvite, loadInvites, requireTrip } from "@/server/collab";
import { loadTripDetail } from "@/server/models";
import { allow } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const role = z.enum(["editor", "viewer"]).default("editor");

const schema = z.discriminatedUnion("kind", [
  /** The trip's link for planning together ("invite") or for friends' feedback; the same link until it is turned off. */
  z.object({ kind: z.literal("link"), purpose: z.enum(["invite", "feedback"]).default("invite"), role }),
  /** Someone by email: added right away when they have an account, invited (and emailed) otherwise. */
  z.object({ kind: z.literal("email"), email: z.string().trim().email("Enter their email").max(200), role }),
]);

/** Pending invites and live links, for the people who plan the trip. */
export const GET = route(async (_request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await resolveParams(ctx);
  await requireTrip(id, user.id, "edit");
  return json({ invites: await loadInvites(id) });
});

export const POST = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id } = await resolveParams(ctx);
  const trip = await requireTrip(id, user.id, "edit");
  const body = await parseBody(request, schema);
  if (body.kind === "link") {
    const invite = await linkInvite(trip, user, body.purpose, body.role);
    return json({ invite, invites: await loadInvites(id) }, { status: 201 });
  }
  if (!allow(`trip-invite:${user.id}`, 30, 24 * 60 * 60_000)) throw new HttpError(429, "That's 30 invites today. Share a link instead, or try again tomorrow.");
  const result = await inviteByEmail(trip, user, body.email, body.role, requestOrigin(request));
  const [invites, detail] = await Promise.all([loadInvites(id), loadTripDetail(id, user.id)]);
  return json({ ...result, invites, trip: detail }, { status: 201 });
});
