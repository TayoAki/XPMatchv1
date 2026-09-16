import { z } from "zod";
import { IMPORT_MAX_IMAGE_BYTES } from "@/lib/import/types";
import { HttpError, json, parseBody, requireUser, route } from "@/server/http";
import { ImportError } from "@/server/import";
import { MAX_CONFIRMATION_TEXT, pdfText, reservationsFromImage, reservationsFromText } from "@/server/reservations";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const textSchema = z.object({ text: z.string().min(1).max(MAX_CONFIRMATION_TEXT) });
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Reads a confirmation: JSON `{ text }` (a pasted email) or multipart `file` (PDF, PNG, JPEG, WebP). */
export const POST = route(async (request) => {
  await requireUser(request);
  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new HttpError(400, "Attach the confirmation as the 'file' field");
      if (file.size > IMPORT_MAX_IMAGE_BYTES) throw new HttpError(413, "Files up to 6 MB, please");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
        const text = await pdfText(bytes);
        if (text.trim().length < 20) throw new HttpError(422, "That PDF has no readable text (a scan?). Upload a screenshot of it instead.");
        return json({ reservations: await reservationsFromText(text), source: "pdf" }, { status: 201 });
      }
      if (!IMAGE_TYPES.has(file.type)) throw new HttpError(415, "Use a PDF or a PNG, JPEG or WebP image");
      return json({ reservations: await reservationsFromImage(bytes, file.type), source: "image" }, { status: 201 });
    }
    const body = await parseBody(request, textSchema);
    return json({ reservations: await reservationsFromText(body.text), source: "text" }, { status: 201 });
  } catch (err) {
    if (err instanceof ImportError) throw new HttpError(err.status, err.message);
    throw err;
  }
});
