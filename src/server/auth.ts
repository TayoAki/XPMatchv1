import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { queryAll, queryOne } from "./db";

export const SESSION_COOKIE = "xp_session";
const SESSION_DAYS = 30;
const RENEW_BEFORE_DAYS = 15;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  handle: string;
}

interface UserRow extends Record<string, unknown> {
  id: string;
  email: string;
  name: string;
  handle: string;
  password_hash?: string;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Turns a display name into a unique, URL-safe handle. */
export async function uniqueHandle(base: string): Promise<string> {
  const slug =
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 24) || "traveler";
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? slug : `${slug}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const taken = await queryOne("SELECT 1 FROM users WHERE handle = $1", [candidate]);
    if (!taken) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

/** Creates a session row and returns the raw token for the cookie. */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await queryAll("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [
    userId,
    hashToken(token),
    expiresAt.toISOString(),
  ]);
  return { token, expiresAt };
}

export async function deleteSession(token: string): Promise<void> {
  await queryAll("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

/** Resolves the signed-in user from the session cookie (sliding renewal). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await queryOne<UserRow & { session_id: string; expires_at: string }>(
    `SELECT u.id, u.email, u.name, u.handle, s.id AS session_id, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  if (!row) return null;
  const msLeft = new Date(row.expires_at).getTime() - Date.now();
  if (msLeft < RENEW_BEFORE_DAYS * 86400_000) {
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
    await queryAll("UPDATE sessions SET expires_at = $2 WHERE id = $1", [row.session_id, expiresAt.toISOString()]);
    try {
      store.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    } catch {
      // Cookies can only be set in route handlers / server actions; ignore elsewhere.
    }
  }
  return { id: row.id, email: row.email, name: row.name, handle: row.handle };
}

export async function findUserByEmail(email: string): Promise<(SessionUser & { passwordHash: string }) | null> {
  const row = await queryOne<UserRow>("SELECT id, email, name, handle, password_hash FROM users WHERE email = $1", [
    normalizeEmail(email),
  ]);
  if (!row) return null;
  return { id: row.id, email: row.email, name: row.name, handle: row.handle, passwordHash: row.password_hash ?? "" };
}

export async function createUser(input: { email: string; password: string; name: string }): Promise<SessionUser> {
  const handle = await uniqueHandle(input.name);
  const passwordHash = await hashPassword(input.password);
  const row = await queryOne<UserRow>(
    "INSERT INTO users (email, password_hash, name, handle) VALUES ($1, $2, $3, $4) RETURNING id, email, name, handle",
    [normalizeEmail(input.email), passwordHash, input.name.trim(), handle],
  );
  if (!row) throw new Error("Could not create user");
  await queryAll("INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [row.id]);
  return { id: row.id, email: row.email, name: row.name, handle: row.handle };
}
