import { createHash, randomBytes } from "node:crypto";
import { hashPassword, type SessionUser } from "./auth";
import { queryAll, queryOne } from "./db";

/** How long a reset link stays valid. */
export const RESET_LINK_MINUTES = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

interface ResetRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  email: string;
  name: string;
  expires_at: string;
}

interface UserRow extends Record<string, unknown> {
  id: string;
  email: string;
  name: string;
  handle: string;
}

/**
 * Issues a single-use reset token for an account. Only the hash is stored; the raw token lives
 * in the link the admin hands to the traveler. A new link replaces any unused earlier one.
 */
export async function createPasswordReset(userId: string, createdBy: string | null): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_LINK_MINUTES * 60_000);
  await queryAll("DELETE FROM password_resets WHERE user_id = $1 AND used_at IS NULL", [userId]);
  await queryAll("INSERT INTO password_resets (user_id, token_hash, expires_at, created_by) VALUES ($1, $2, $3, $4)", [
    userId,
    hashToken(token),
    expiresAt.toISOString(),
    createdBy,
  ]);
  return { token, expiresAt };
}

/** The account a live token belongs to, so the reset page can say whose password it sets. */
export async function peekPasswordReset(token: string): Promise<{ email: string; name: string; expiresAt: string } | null> {
  if (!token) return null;
  const row = await queryOne<ResetRow>(
    `SELECT r.id, r.user_id, u.email, u.name, r.expires_at
       FROM password_resets r JOIN users u ON u.id = r.user_id
      WHERE r.token_hash = $1 AND r.used_at IS NULL AND r.expires_at > now()`,
    [hashToken(token)],
  );
  return row ? { email: row.email, name: row.name, expiresAt: row.expires_at } : null;
}

/**
 * Sets the new password for a live token, marks the token used (atomically, so a second submit of
 * the same link fails) and signs every existing session of the account out. Returns the user, or
 * null when the token is unknown, used or expired.
 */
export async function consumePasswordReset(token: string, password: string): Promise<SessionUser | null> {
  if (!token) return null;
  const claimed = await queryOne<{ user_id: string } & Record<string, unknown>>(
    `UPDATE password_resets SET used_at = now()
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
      RETURNING user_id`,
    [hashToken(token)],
  );
  if (!claimed) return null;
  const passwordHash = await hashPassword(password);
  await queryAll("UPDATE users SET password_hash = $2 WHERE id = $1", [claimed.user_id, passwordHash]);
  await queryAll("DELETE FROM sessions WHERE user_id = $1", [claimed.user_id]);
  const user = await queryOne<UserRow>("SELECT id, email, name, handle FROM users WHERE id = $1", [claimed.user_id]);
  return user ? { id: user.id, email: user.email, name: user.name, handle: user.handle } : null;
}
