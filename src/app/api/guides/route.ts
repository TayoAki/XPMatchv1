import { HttpError, json, parseBody, requireUser, route } from "@/server/http";
import { createGuide, guideBodySchema, loadGuide, loadGuides, pickCover } from "@/server/guides";
import { resolveDestination } from "@/server/places";

export const dynamic = "force-dynamic";

/** Community guides: `?q=` searches title/destination/description, `?mine=1` lists the viewer's own (drafts included), `?lat&lng` orders by distance. */
export const GET = route(async (request) => {
  const user = await requireUser();
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const mine = url.searchParams.get("mine") === "1";
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const near = Number.isFinite(lat) && Number.isFinite(lng) && url.searchParams.has("lat") ? { lat, lng } : undefined;
  const guides = await loadGuides(user.id, { q, mine, near, limit: 60 });
  return json({ guides });
});

export const POST = route(async (request) => {
  const user = await requireUser(request);
  const body = await parseBody(request, guideBodySchema);
  if (body.published && body.items.length === 0) throw new HttpError(400, "Add at least one place before publishing");
  const place = await resolveDestination(body.destination).catch(() => null);
  const id = await createGuide(
    user.id,
    {
      title: body.title,
      destination: body.destination,
      place,
      description: body.description,
      coverUrl: body.coverUrl ?? pickCover(place, body.items),
      tags: body.tags,
      published: body.published,
    },
    body.items,
  );
  return json(await loadGuide(id, user.id), { status: 201 });
});
