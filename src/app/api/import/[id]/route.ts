import { HttpError, json, requireUser, resolveParams, route } from "@/server/http";
import { deleteImport, loadImport } from "@/server/import";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await resolveParams(ctx);
  const record = await loadImport(user.id, id);
  if (!record) throw new HttpError(404, "Import not found");
  return json({ import: record });
});

export const DELETE = route(async (request, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id } = await resolveParams(ctx);
  await deleteImport(user.id, id);
  return json({ ok: true });
});
