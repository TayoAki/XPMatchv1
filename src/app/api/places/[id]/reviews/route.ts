import { z } from "zod";
import { REVIEW_MAX } from "@/lib/reviews";
import type { ResolvedPlace } from "@/lib/places/types";
import { HttpError, json, parseBody, requireUser, resolveParams, route } from "@/server/http";
import { deleteReview, listReviews, saveReview } from "@/server/reviews";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Google place ids (and the test stand-in's) only: reviews belong to real places. */
const PLACE_ID = /^[A-Za-z0-9_:.-]{3,200}$/;

async function placeId(ctx: Ctx): Promise<string> {
  const { id } = await resolveParams(ctx);
  if (!PLACE_ID.test(id) || id.startsWith("name:") || id.startsWith("est:")) throw new HttpError(400, "Reviews are for places on the map");
  return id;
}

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  kind: z.enum(["hotel", "restaurant", "attraction"]),
  destination: z.string().trim().max(200).optional(),
  place: z.object({ id: z.string(), name: z.string(), lat: z.number(), lng: z.number() }).passthrough().optional(),
  verdict: z.enum(["loved", "fine", "disliked"]),
  text: z.string().trim().min(1, "Write a few words").max(REVIEW_MAX),
  shared: z.boolean().default(true),
});

/** What travelers on XPMatch say about the place, with their proof and whether they travel like the viewer. */
export const GET = route(async (_request, ctx: Ctx) => {
  const user = await requireUser();
  return json(await listReviews(await placeId(ctx), user.id));
});

/** Writes or rewrites the viewer's review. */
export const POST = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const id = await placeId(ctx);
  const body = await parseBody(request, bodySchema);
  const { feedback, taste } = await saveReview(user.id, { ...body, place: body.place as ResolvedPlace | undefined, placeId: id });
  return json({ ...(await listReviews(id, user.id)), feedback, taste }, { status: 201 });
});

/** Takes the viewer's words down (their reaction stays). */
export const DELETE = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const id = await placeId(ctx);
  await deleteReview(user.id, id);
  return json(await listReviews(id, user.id));
});
