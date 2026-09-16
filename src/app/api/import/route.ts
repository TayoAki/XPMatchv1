import { z } from "zod";
import { IMPORT_MAX_IMAGE_BYTES } from "@/lib/import/types";
import { HttpError, json, parseBody, requireUser, route } from "@/server/http";
import { ImportError, importFromImage, importFromUrl, loadImports } from "@/server/import";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const urlSchema = z.object({ url: z.string().trim().min(8).max(2000) });
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export const GET = route(async () => {
  const user = await requireUser();
  return json({ imports: await loadImports(user.id) });
});

/** Imports a link (JSON `{ url }`) or a screenshot (multipart field `image`). */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("image");
      if (!(file instanceof File)) throw new HttpError(400, "Attach an image as the 'image' field");
      if (!IMAGE_TYPES.has(file.type)) throw new HttpError(415, "Use a PNG, JPEG or WebP image");
      if (file.size > IMPORT_MAX_IMAGE_BYTES) throw new HttpError(413, "Images up to 6 MB, please");
      const bytes = new Uint8Array(await file.arrayBuffer());
      return json({ import: await importFromImage(user.id, bytes, file.type, file.name) }, { status: 201 });
    }
    const body = await parseBody(request, urlSchema);
    return json({ import: await importFromUrl(user.id, body.url) }, { status: 201 });
  } catch (err) {
    if (err instanceof ImportError) throw new HttpError(err.status, err.message);
    throw err;
  }
});
