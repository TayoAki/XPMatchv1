import { HttpError, json, parseBody, requireUser, resolveParams, route } from "@/server/http";
import { deleteGuide, guideBodySchema, loadGuide, pickCover, replaceGuideItems, updateGuide } from "@/server/guides";
import { resolveDestination } from "@/server/places";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await resolveParams(ctx);
  const guide = await loadGuide(id, user.id);
  if (!guide) throw new HttpError(404, "Guide not found");
  return json(guide);
});

export const PATCH = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id } = await resolveParams(ctx);
  const existing = await loadGuide(id, user.id);
  if (!existing) throw new HttpError(404, "Guide not found");
  if (existing.authorId !== user.id) throw new HttpError(403, "Only the author can edit this guide");
  const body = await parseBody(request, guideBodySchema.partial());
  const items = body.items ?? existing.items.map((i) => ({ place: i.place, note: i.note }));
  const published = body.published ?? existing.published;
  if (published && items.length === 0) throw new HttpError(400, "Add at least one place before publishing");

  const destinationChanged = body.destination !== undefined && body.destination !== existing.destination;
  const place = destinationChanged ? await resolveDestination(body.destination as string).catch(() => null) : existing.place ?? null;
  await updateGuide(id, {
    title: body.title,
    destination: body.destination,
    place: destinationChanged ? place : undefined,
    description: body.description,
    tags: body.tags,
    published: body.published,
    coverUrl: body.coverUrl !== undefined ? body.coverUrl : destinationChanged || body.items ? pickCover(place, items) : undefined,
  });
  if (body.items) await replaceGuideItems(id, body.items);
  return json(await loadGuide(id, user.id));
});

export const DELETE = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id } = await resolveParams(ctx);
  const existing = await loadGuide(id, user.id);
  if (!existing) throw new HttpError(404, "Guide not found");
  if (existing.authorId !== user.id) throw new HttpError(403, "Only the author can delete this guide");
  await deleteGuide(id);
  return json({ ok: true });
});
