import { z } from "zod";
import { requireAdmin } from "@/server/admin";
import { setBugStatus } from "@/server/bugs";
import { HttpError, json, parseBody, resolveParams, route } from "@/server/http";

export const dynamic = "force-dynamic";

const schema = z.object({ status: z.enum(["open", "resolved"]) });

export const PATCH = route(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdmin(request);
  const { id } = await resolveParams(ctx);
  const body = await parseBody(request, schema);
  const report = await setBugStatus(id, body.status);
  if (!report) throw new HttpError(404, "Report not found");
  return json({ report });
});
