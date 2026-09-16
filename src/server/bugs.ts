import type { BugReport, BugSeverity, BugStatus } from "@/lib/bugs/types";
import { queryAll, queryOne, type Row } from "./db";
import { iso, notify } from "./models";
import { adminUserIds } from "./admin";

/** Bug reports from testers, with an optional downscaled screenshot kept as base64 text. */

interface BugRow extends Row {
  id: string;
  user_id: string | null;
  reporter_email: string;
  reporter_name: string | null;
  reporter_handle: string | null;
  title: string;
  body: string;
  expected: string;
  severity: string;
  page: string;
  thread_id: string | null;
  user_agent: string;
  app_version: string;
  has_screenshot: boolean;
  status: string;
  created_at: unknown;
  updated_at: unknown;
}

const SELECT = `
  SELECT b.id, b.user_id, b.reporter_email, u.name AS reporter_name, u.handle AS reporter_handle, b.title, b.body, b.expected, b.severity, b.page,
         b.thread_id, b.user_agent, b.app_version, (b.screenshot_data IS NOT NULL) AS has_screenshot, b.status, b.created_at, b.updated_at
    FROM bug_reports b LEFT JOIN users u ON u.id = b.user_id`;

const mapBug = (r: BugRow): BugReport => ({
  id: r.id,
  reporter: r.user_id ? { name: r.reporter_name ?? "", handle: r.reporter_handle ?? "", email: r.reporter_email } : r.reporter_email ? { name: "", handle: "", email: r.reporter_email } : null,
  title: r.title,
  body: r.body,
  expected: r.expected,
  severity: r.severity as BugSeverity,
  page: r.page,
  threadId: r.thread_id ?? undefined,
  userAgent: r.user_agent,
  appVersion: r.app_version,
  hasScreenshot: r.has_screenshot === true || String(r.has_screenshot) === "true",
  status: r.status as BugStatus,
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

export interface BugReportInput {
  title: string;
  body: string;
  expected: string;
  severity: BugSeverity;
  page: string;
  threadId?: string;
  userAgent: string;
  appVersion: string;
  screenshot?: { type: string; data: string };
}

export async function insertBugReport(user: { id: string; email: string; handle: string }, input: BugReportInput): Promise<BugReport> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO bug_reports (user_id, reporter_email, title, body, expected, severity, page, thread_id, user_agent, app_version, screenshot_type, screenshot_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
    [
      user.id,
      user.email,
      input.title.trim().slice(0, 200),
      input.body.trim().slice(0, 4000),
      input.expected.trim().slice(0, 2000),
      input.severity,
      input.page.slice(0, 500),
      input.threadId?.slice(0, 200) || null,
      input.userAgent.slice(0, 300),
      input.appVersion.slice(0, 80),
      input.screenshot?.type ?? null,
      input.screenshot?.data ?? null,
    ],
  );
  if (!row) throw new Error("Could not save the report");
  const report = (await loadBugReport(row.id))!;
  for (const adminId of await adminUserIds()) {
    if (adminId === user.id) continue;
    await notify(adminId, "system", `Bug report from @${user.handle}: ${report.title}`, { bugId: report.id });
  }
  return report;
}

export async function loadBugReport(id: string): Promise<BugReport | null> {
  const row = await queryOne<BugRow>(`${SELECT} WHERE b.id = $1`, [id]);
  return row ? mapBug(row) : null;
}

export async function loadBugReports(status: BugStatus | "all" = "all", limit = 100): Promise<BugReport[]> {
  const rows =
    status === "all"
      ? await queryAll<BugRow>(`${SELECT} ORDER BY b.created_at DESC LIMIT $1`, [limit])
      : await queryAll<BugRow>(`${SELECT} WHERE b.status = $2 ORDER BY b.created_at DESC LIMIT $1`, [limit, status]);
  return rows.map(mapBug);
}

export async function setBugStatus(id: string, status: BugStatus): Promise<BugReport | null> {
  await queryAll("UPDATE bug_reports SET status = $2, updated_at = now() WHERE id = $1", [id, status]);
  return loadBugReport(id);
}

export async function loadBugScreenshot(id: string): Promise<{ type: string; data: string } | null> {
  const row = await queryOne<{ screenshot_type: string | null; screenshot_data: string | null }>("SELECT screenshot_type, screenshot_data FROM bug_reports WHERE id = $1", [id]);
  if (!row?.screenshot_data) return null;
  return { type: row.screenshot_type || "image/jpeg", data: row.screenshot_data };
}

/** The deployed revision, when the platform tells us (Railway sets RAILWAY_GIT_COMMIT_SHA). */
export function appVersion(): string {
  return (process.env.APP_VERSION || process.env.RAILWAY_GIT_COMMIT_SHA || "").slice(0, 12) || "dev";
}
