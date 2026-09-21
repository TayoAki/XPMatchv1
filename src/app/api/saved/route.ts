import { z } from "zod";
import { json, parseBody, requireUser, route } from "@/server/http";
import { insertSaved, loadSaved } from "@/server/models";

const placeSchema = z.object({}).passthrough();

const schema = z.object({
  kind: z.enum(["destination", "hotel", "flight", "restaurant", "attraction", "guide", "collection"]),
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().max(300).optional(),
  destination: z.string().max(200).optional(),
  url: z.string().max(2000).optional(),
  refId: z.string().max(200).optional(),
  place: placeSchema.optional(),
});

export const GET = route(async () => {
  const user = await requireUser();
  return json({ saved: await loadSaved(user.id) });
});

export const POST = route(async (request) => {
  const user = await requireUser(request);
  const body = await parseBody(request, schema);
  const item = await insertSaved(user.id, { ...body, place: body.place as never });
  return json(item, { status: 201 });
});
