import { z } from "zod";
import { SCREENSHOT_MAX_BYTES } from "@/lib/bugs/types";
import { requireAdmin } from "@/server/admin";
import { appVersion, insertBugReport, loadBugReports } from "@/server/bugs";
import { HttpError, json, requireUser, route } from "@/server/http";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().max(4000).default(""),
  expected: z.string().trim().max(2000).default(""),
  severity: z.enum(["broken", "looks-wrong", "idea"]).default("broken"),
  page: z.string().max(500).default(""),
  threadId: z.string().max(200).optional(),
  userAgent: z.string().max(300).optional(),
});

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * A tester's bug report: JSON, or multipart with a `payload` JSON field and an
 * optional `screenshot` image (already downscaled by the browser).
 */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  let raw: unknown;
  let screenshot: { type: string; data: string } | undefined;
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData();
    try {
      raw = JSON.parse(String(form.get("payload") ?? "{}"));
    } catch {
      throw new HttpError(400, "Invalid report payload");
    }
    const file = form.get("screenshot");
    if (file instanceof File && file.size > 0) {
      if (!IMAGE_TYPES.has(file.type)) throw new HttpError(415, "Screenshots must be PNG, JPEG or WebP");
      if (file.size > SCREENSHOT_MAX_BYTES) throw new HttpError(413, "Screenshot too large; try a smaller crop");
      screenshot = { type: file.type, data: Buffer.from(await file.arrayBuffer()).toString("base64") };
    }
  } else {
    try {
      raw = await request.json();
    } catch {
      throw new HttpError(400, "Invalid JSON body");
    }
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new HttpError(400, issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "Invalid report");
  }
  const body = parsed.data;
  const report = await insertBugReport(user, {
    title: body.title,
    body: body.body,
    expected: body.expected,
    severity: body.severity,
    page: body.page,
    threadId: body.threadId,
    userAgent: body.userAgent ?? request.headers.get("user-agent") ?? "",
    appVersion: appVersion(),
    screenshot,
  });
  return json({ report }, { status: 201 });
});

/** Admins: every report, newest first (`?status=open|resolved|all`). */
export const GET = route(async (request) => {
  await requireAdmin();
  const status = new URL(request.url).searchParams.get("status");
  const reports = await loadBugReports(status === "open" || status === "resolved" ? status : "all");
  return json({ reports, version: appVersion() });
});
