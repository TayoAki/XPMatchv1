/**
 * Outgoing email through Resend's REST API (no SDK: one POST). `RESEND_API_KEY` turns it on;
 * `EMAIL_FROM` is the sender on the verified domain; `RESEND_BASE_URL` exists for the test stub
 * only and must never be set in production.
 */

const DEFAULT_FROM = "XPMatch <no-reply@xpmatchme.com>";
const TIMEOUT_MS = 10_000;

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function baseUrl(): string {
  return (process.env.RESEND_BASE_URL || "https://api.resend.com").replace(/\/$/, "");
}

/** Sends one email; resolves with the provider's id or throws with the provider's message. */
export async function sendEmail(mail: OutgoingEmail): Promise<{ id: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl()}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || DEFAULT_FROM, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) throw new Error(data.message ?? `Resend answered ${res.status}`);
    return { id: data.id ?? "" };
  } finally {
    clearTimeout(timer);
  }
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/** The password reset email: plain text first, a light HTML version with the same words. */
export function passwordResetEmail(input: { to: string; name: string; url: string; minutes: number }): OutgoingEmail {
  const first = input.name.trim().split(/\s+/)[0] || "there";
  const text = [
    `Hi ${first},`,
    "",
    `Someone asked to reset the password for ${input.to} on XPMatch. Open this link within ${input.minutes} minutes to choose a new one:`,
    "",
    input.url,
    "",
    "If that wasn't you, ignore this email; your password stays the same.",
    "",
    "— XPMatch",
  ].join("\n");
  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#171717;max-width:520px">
<p>Hi ${escapeHtml(first)},</p>
<p>Someone asked to reset the password for <strong>${escapeHtml(input.to)}</strong> on XPMatch. Open this link within ${input.minutes} minutes to choose a new one:</p>
<p><a href="${escapeHtml(input.url)}" style="display:inline-block;background:#171717;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;font-weight:600">Set a new password</a></p>
<p style="color:#525252;font-size:13px">Or paste this into your browser:<br><a href="${escapeHtml(input.url)}" style="color:#171717">${escapeHtml(input.url)}</a></p>
<p style="color:#525252;font-size:13px">If that wasn't you, ignore this email; your password stays the same.</p>
<p>— XPMatch</p>
</div>`;
  return { to: input.to, subject: "Reset your XPMatch password", text, html };
}
