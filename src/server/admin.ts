import { HttpError, requireUser } from "./http";
import type { SessionUser } from "./auth";
import { queryAll } from "./db";

/** Admins are the accounts whose email is listed in ADMIN_EMAILS (comma-separated). */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(user: Pick<SessionUser, "email"> | null | undefined): boolean {
  return !!user && adminEmails().includes(user.email.trim().toLowerCase());
}

export async function requireAdmin(request?: Request): Promise<SessionUser> {
  const user = await requireUser(request);
  if (!isAdmin(user)) throw new HttpError(403, "Admins only");
  return user;
}

/** Ids of the admin accounts that exist, for notifications. */
export async function adminUserIds(): Promise<string[]> {
  const emails = adminEmails();
  if (!emails.length) return [];
  const rows = await queryAll<{ id: string }>("SELECT id FROM users WHERE lower(email) = ANY($1::text[])", [emails]);
  return rows.map((r) => r.id);
}
