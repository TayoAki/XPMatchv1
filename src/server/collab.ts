import { createHash, randomBytes } from "node:crypto";
import type {
  CollabTarget,
  CollabTargetKind,
  EmailInviteResult,
  InvitePreview,
  InvitePurpose,
  InviteRole,
  InviteStatus,
  TripCollab,
  TripInvite,
  TripMessage,
  TripPulse,
  TripVote,
  VoteValue,
} from "@/lib/collab/types";
import { firstWord, maskEmail, nameList, roleLabel } from "@/lib/collab/types";
import type { ResolvedPlace } from "@/lib/places/types";
import type { Trip, TripJoinedVia } from "@/lib/types";
import { findUserByEmail, normalizeEmail, type SessionUser } from "./auth";
import { queryAll, queryOne, type Row } from "./db";
import { emailConfigured, sendEmail, tripInviteEmail } from "./email";
import { HttpError } from "./http";
import { iso, jsonb, loadTrip, notify, notifyGrouped, tripMemberIds } from "./models";
import { allow } from "./rate-limit";

/**
 * Planning a trip together: the discussion and comments, group votes, invites (links, emails and
 * "Get feedback" links), joining, and the pulse an open trip page polls to stay current.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{16,64}$/;
/** The latest messages a trip page loads. */
export const MESSAGE_PAGE = 300;
/** An emailed invite waits this long for its sign-up. */
const EMAIL_INVITE_DAYS = 30;
const DAY_MS = 86_400_000;

type Access = "member" | "edit" | "owner";

/** The trip as the signed-in traveler sees it, or an HTTP error: 404 for anyone not on it, 403 for too little access. */
export async function requireTrip(tripId: string, userId: string, access: Access = "member"): Promise<Trip> {
  const trip = UUID.test(tripId) ? await loadTrip(tripId, userId) : null;
  if (!trip) throw new HttpError(404, "Trip not found");
  if (access === "edit" && trip.role === "viewer") throw new HttpError(403, "You can comment on this trip but not change it");
  if (access === "owner" && trip.role !== "owner") throw new HttpError(403, "Only the trip's owner can do that");
  return trip;
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);
const count = (data: Record<string, unknown> | undefined, key: string) => (typeof data?.[key] === "number" ? (data[key] as number) : 0);
const strings = (data: Record<string, unknown> | undefined, key: string) =>
  Array.isArray(data?.[key]) ? (data[key] as unknown[]).filter((v): v is string => typeof v === "string") : [];
/** "A", "A and B", "A, B and C", "A, B, C and 2 more". */
function listTitles(titles: string[]): string {
  if (titles.length <= 1) return titles[0] ?? "";
  if (titles.length > 4) return `${titles.slice(0, 3).join(", ")} and ${titles.length - 3} more`;
  return `${titles.slice(0, -1).join(", ")} and ${titles[titles.length - 1]}`;
}

/* ------------------------- who did what (Updates) ------------------------- */

const ITEM_WORDS: Record<string, [string, string]> = { idea: ["an idea", "ideas"], booking: ["a booking", "bookings"], media: ["media", "media items"] };

/** Who hears about an addition: bookings (confirmation names and numbers) only reach the travelers, not people giving feedback. */
export async function itemRecipients(tripId: string, actorId: string, kind: string): Promise<string[]> {
  const rows = await queryAll<{ user_id: string; via: string }>("SELECT user_id, via FROM trip_members WHERE trip_id = $1", [tripId]);
  return rows.filter((r) => r.user_id !== actorId && !(kind === "booking" && r.via === "feedback")).map((r) => r.user_id);
}

/** "Tayo added an idea to "Rome": Colosseum." and, for more in the same burst, "Tayo added 3 ideas to "Rome": A, B and C." */
export function notifyItemAdded(userIds: string[], trip: Pick<Trip, "id" | "title">, actor: Pick<SessionUser, "id" | "name">, kind: string, title: string) {
  return notifyGrouped(userIds, "trip_activity", `add:${trip.id}:${actor.id}:${kind}`, (prev) => {
    const titles = [...strings(prev, "titles"), title];
    const [one, many] = ITEM_WORDS[kind] ?? ITEM_WORDS.idea;
    const text =
      titles.length === 1 ? `${actor.name} added ${one} to "${trip.title}": ${title}.` : `${actor.name} added ${titles.length} ${many} to "${trip.title}": ${listTitles(titles)}.`;
    return { text, data: { tripId: trip.id, titles: titles.slice(-20) } };
  });
}

/** "Tayo updated the trip "Rome"." and, while the edits keep coming, "Tayo made 5 changes to "Rome"." */
export function notifyTripEdited(userIds: string[], trip: Pick<Trip, "id" | "title">, actor: Pick<SessionUser, "id" | "name">) {
  return notifyGrouped(userIds, "trip_activity", `edit:${trip.id}:${actor.id}`, (prev) => {
    const n = count(prev, "count") + 1;
    return { text: n === 1 ? `${actor.name} updated the trip "${trip.title}".` : `${actor.name} made ${n} changes to "${trip.title}".`, data: { tripId: trip.id, count: n } };
  });
}

/* --------------------------- discussion and votes --------------------------- */

interface MessageRow extends Row {
  id: string;
  user_id: string | null;
  name: string | null;
  handle: string | null;
  target_kind: string | null;
  target_id: string | null;
  target_label: string | null;
  body: string;
  created_at: unknown;
}

interface VoteRow extends Row {
  user_id: string;
  name: string;
  target_kind: string;
  target_id: string;
  target_label: string;
  value: number;
  updated_at: unknown;
}

const mapMessage = (r: MessageRow): TripMessage => ({
  id: r.id,
  userId: r.user_id,
  name: r.name ?? "Former member",
  handle: r.handle ?? "",
  ...(r.target_kind && r.target_id ? { target: { kind: r.target_kind as CollabTargetKind, id: r.target_id, label: r.target_label ?? "" } } : {}),
  body: r.body,
  createdAt: iso(r.created_at),
});

const mapVote = (r: VoteRow): TripVote => ({
  userId: r.user_id,
  name: r.name,
  target: { kind: r.target_kind as CollabTargetKind, id: r.target_id, label: r.target_label },
  value: r.value > 0 ? 1 : -1,
  updatedAt: iso(r.updated_at),
});

/** The latest messages (oldest first) and the votes of the people on the trip now. */
export async function loadCollab(tripId: string): Promise<TripCollab> {
  const [messages, votes] = await Promise.all([
    queryAll<MessageRow>(
      `SELECT * FROM (
         SELECT m.id, m.user_id, u.name, u.handle, m.target_kind, m.target_id, m.target_label, m.body, m.created_at
           FROM trip_messages m LEFT JOIN users u ON u.id = m.user_id
          WHERE m.trip_id = $1 ORDER BY m.created_at DESC LIMIT ${MESSAGE_PAGE}
       ) recent ORDER BY created_at`,
      [tripId],
    ),
    queryAll<VoteRow>(
      `SELECT v.user_id, u.name, v.target_kind, v.target_id, v.target_label, v.value, v.updated_at
         FROM trip_votes v JOIN users u ON u.id = v.user_id
         JOIN trip_members tm ON tm.trip_id = v.trip_id AND tm.user_id = v.user_id
        WHERE v.trip_id = $1 ORDER BY v.updated_at`,
      [tripId],
    ),
  ]);
  return { messages: messages.map(mapMessage), votes: votes.map(mapVote) };
}

/** A target must be one of the trip's ideas or one of its stops; its label comes from the trip, not the request. */
async function resolveTarget(trip: Trip, target: { kind: CollabTargetKind; id: string }): Promise<CollabTarget> {
  if (target.kind === "item") {
    const row = UUID.test(target.id)
      ? await queryOne<{ title: string }>("SELECT title FROM trip_items WHERE id = $1 AND trip_id = $2 AND kind = 'idea'", [target.id, trip.id])
      : null;
    if (!row) throw new HttpError(404, "That idea is no longer on the trip");
    return { kind: "item", id: target.id, label: row.title };
  }
  for (const day of trip.itinerary) for (const stop of day.stops) if (stop.id === target.id) return { kind: "stop", id: stop.id, label: stop.title };
  throw new HttpError(404, "That stop is no longer on the trip");
}

export async function postMessage(trip: Trip, user: SessionUser, input: { body: string; target?: { kind: CollabTargetKind; id: string } }): Promise<void> {
  const body = input.body.trim();
  if (!body) throw new HttpError(400, "Write something first");
  const target = input.target ? await resolveTarget(trip, input.target) : undefined;
  await queryAll("INSERT INTO trip_messages (trip_id, user_id, target_kind, target_id, target_label, body) VALUES ($1, $2, $3, $4, $5, $6)", [
    trip.id,
    user.id,
    target?.kind ?? null,
    target?.id ?? null,
    target?.label ?? null,
    body,
  ]);
  const others = (await tripMemberIds(trip.id)).filter((id) => id !== user.id);
  // One update per trip while the conversation is going: who is talking and the latest words.
  await notifyGrouped(others, "trip_discussion", `talk:${trip.id}`, (prev) => {
    const messages = count(prev, "messages") + (target ? 0 : 1);
    const comments = count(prev, "comments") + (target ? 1 : 0);
    const authors = [...strings(prev, "authors").filter((n) => n !== user.name), user.name];
    const quote = `"${clip(body, 140)}"`;
    let text: string;
    if (messages + comments === 1) text = target ? `${user.name} commented on ${target.label} in "${trip.title}": ${quote}` : `${user.name} wrote in "${trip.title}": ${quote}`;
    else {
      const parts = [messages ? `${messages} new message${messages === 1 ? "" : "s"}` : "", comments ? `${comments} comment${comments === 1 ? "" : "s"}` : ""].filter(Boolean).join(" and ");
      text = `${parts} in "${trip.title}" from ${nameList(authors)}. Latest from ${firstWord(user.name)}: ${quote}`;
    }
    return { text, data: { tripId: trip.id, section: "discussion", messages, comments, authors: authors.slice(-6) } };
  });
}

/** Authors delete their own messages; the owner can delete any on the trip. */
export async function deleteMessage(trip: Trip, user: SessionUser, messageId: string): Promise<void> {
  const row = UUID.test(messageId) ? await queryOne<{ user_id: string | null }>("SELECT user_id FROM trip_messages WHERE id = $1 AND trip_id = $2", [messageId, trip.id]) : null;
  if (!row) throw new HttpError(404, "Message not found");
  if (row.user_id !== user.id && trip.role !== "owner") throw new HttpError(403, "You can only delete your own messages");
  await queryAll("DELETE FROM trip_messages WHERE id = $1 AND trip_id = $2", [messageId, trip.id]);
}

/** For (1), against (-1), or no vote (0) on an idea or a stop. */
export async function setVote(trip: Trip, user: SessionUser, input: { kind: CollabTargetKind; id: string }, value: VoteValue | 0): Promise<void> {
  if (value === 0) {
    await queryAll("DELETE FROM trip_votes WHERE trip_id = $1 AND target_kind = $2 AND target_id = $3 AND user_id = $4", [trip.id, input.kind, input.id, user.id]);
    return;
  }
  const target = await resolveTarget(trip, input);
  const previous = await queryOne<{ value: number }>("SELECT value FROM trip_votes WHERE trip_id = $1 AND target_kind = $2 AND target_id = $3 AND user_id = $4", [
    trip.id,
    target.kind,
    target.id,
    user.id,
  ]);
  await queryAll(
    `INSERT INTO trip_votes (trip_id, user_id, target_kind, target_id, target_label, value) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (trip_id, target_kind, target_id, user_id) DO UPDATE SET value = EXCLUDED.value, target_label = EXCLUDED.target_label, updated_at = now()`,
    [trip.id, user.id, target.kind, target.id, target.label, value],
  );
  if (previous && Math.sign(previous.value) === value) return;
  const others = (await tripMemberIds(trip.id)).filter((id) => id !== user.id);
  await notifyGrouped(others, "trip_vote", `vote:${trip.id}:${user.id}`, (prev) => {
    const places = [...strings(prev, "places").filter((p) => p !== target.label), target.label];
    const text =
      places.length === 1
        ? `${user.name} voted ${value > 0 ? "for" : "against"} ${target.label} in "${trip.title}".`
        : `${user.name} voted on ${places.length} places in "${trip.title}": ${listTitles(places)}.`;
    return { text, data: { tripId: trip.id, places: places.slice(-20) } };
  });
}

const shortHash = (value: string) => createHash("sha1").update(value).digest("base64url").slice(0, 12);

/**
 * What an open trip page compares every few seconds: one version for the trip (details, itinerary,
 * ideas, people and roles) and one for its conversation (messages and votes). Null when the
 * traveler is not on the trip (any more).
 */
export async function tripPulse(tripId: string, userId: string): Promise<TripPulse | null> {
  if (!UUID.test(tripId)) return null;
  const row = await queryOne<{
    updated_at: unknown;
    items: number | string;
    people: string | null;
    messages: number | string;
    message_at: unknown;
    votes: number | string;
    vote_at: unknown;
  }>(
    `SELECT t.updated_at,
            (SELECT count(*) FROM trip_items i WHERE i.trip_id = t.id) AS items,
            (SELECT string_agg(m.user_id::text || ':' || m.role || ':' || m.via, ',' ORDER BY m.user_id) FROM trip_members m WHERE m.trip_id = t.id) AS people,
            (SELECT count(*) FROM trip_messages x WHERE x.trip_id = t.id) AS messages,
            (SELECT max(x.created_at) FROM trip_messages x WHERE x.trip_id = t.id) AS message_at,
            (SELECT count(*) FROM trip_votes v WHERE v.trip_id = t.id) AS votes,
            (SELECT max(v.updated_at) FROM trip_votes v WHERE v.trip_id = t.id) AS vote_at
       FROM trips t JOIN trip_members me ON me.trip_id = t.id AND me.user_id = $2
      WHERE t.id = $1`,
    [tripId, userId],
  );
  if (!row) return null;
  const at = (value: unknown) => (value ? iso(value) : "");
  return {
    trip: `${at(row.updated_at)}|${row.items}|${shortHash(row.people ?? "")}`,
    collab: `${row.messages}|${at(row.message_at)}|${row.votes}|${at(row.vote_at)}|${shortHash(row.people ?? "")}`,
  };
}

/* --------------------------------- invites --------------------------------- */

interface InviteRow extends Row {
  id: string;
  token: string;
  role: string;
  purpose: string;
  email: string | null;
  created_by_name: string | null;
  created_at: unknown;
  expires_at: unknown;
  uses: number | string;
}

const INVITE_FIELDS = "i.id, i.token, i.role, i.purpose, i.email, u.name AS created_by_name, i.created_at, i.expires_at, i.uses";
const LIVE = "i.revoked_at IS NULL AND i.accepted_at IS NULL AND (i.expires_at IS NULL OR i.expires_at > now())";

const mapInvite = (r: InviteRow): TripInvite => ({
  id: r.id,
  token: r.token,
  role: r.role === "viewer" ? "viewer" : "editor",
  purpose: r.purpose === "feedback" ? "feedback" : "invite",
  ...(r.email ? { email: r.email } : {}),
  ...(r.created_by_name ? { createdBy: r.created_by_name } : {}),
  createdAt: iso(r.created_at),
  ...(r.expires_at ? { expiresAt: iso(r.expires_at) } : {}),
  uses: Number(r.uses),
});

const newToken = () => randomBytes(18).toString("base64url");

export const joinUrl = (origin: string, token: string) => `${origin}/join/${token}`;

/** Links and emailed invites that can still be used, newest first. */
export async function loadInvites(tripId: string): Promise<TripInvite[]> {
  const rows = await queryAll<InviteRow>(
    `SELECT ${INVITE_FIELDS} FROM trip_invites i LEFT JOIN users u ON u.id = i.created_by WHERE i.trip_id = $1 AND ${LIVE} ORDER BY i.created_at DESC`,
    [tripId],
  );
  return rows.map(mapInvite);
}

/**
 * The trip's live link for a purpose and role, made on first use, so copying it again hands out
 * the same link until someone turns it off. A feedback link always lets people comment, not edit.
 */
export async function linkInvite(trip: Trip, user: SessionUser, purpose: InvitePurpose, role: InviteRole): Promise<TripInvite> {
  const linkRole: InviteRole = purpose === "feedback" ? "viewer" : role;
  const existing = await queryOne<InviteRow>(
    `SELECT ${INVITE_FIELDS} FROM trip_invites i LEFT JOIN users u ON u.id = i.created_by
      WHERE i.trip_id = $1 AND i.purpose = $2 AND i.role = $3 AND i.email IS NULL AND ${LIVE} ORDER BY i.created_at DESC LIMIT 1`,
    [trip.id, purpose, linkRole],
  );
  if (existing) return mapInvite(existing);
  const row = await queryOne<InviteRow>(
    `INSERT INTO trip_invites (trip_id, token, role, purpose, created_by) VALUES ($1, $2, $3, $4, $5)
     RETURNING id, token, role, purpose, email, NULL::text AS created_by_name, created_at, expires_at, uses`,
    [trip.id, newToken(), linkRole, purpose, user.id],
  );
  if (!row) throw new Error("Could not create the link");
  return { ...mapInvite(row), createdBy: user.name };
}

function dateRange(start?: string, end?: string): string {
  const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return start ? fmt(start) : end ? fmt(end) : "";
}

/**
 * Someone with an account goes straight onto the trip (and hears about it in Updates). Anyone else
 * gets an invite only their address can accept, emailed with its join link. Signing up with the
 * address alone is not enough (accounts are not email-verified): the link from the email is the
 * proof, and the join page takes them from sign-up straight onto the trip.
 */
export async function inviteByEmail(trip: Trip, user: SessionUser, rawEmail: string, role: InviteRole, origin: string): Promise<EmailInviteResult> {
  const email = normalizeEmail(rawEmail);
  const invitee = await findUserByEmail(email);
  if (invitee) {
    const added = await queryOne<{ user_id: string }>(
      "INSERT INTO trip_members (trip_id, user_id, role, added_by, via) VALUES ($1, $2, $3, $4, 'added') ON CONFLICT (trip_id, user_id) DO NOTHING RETURNING user_id",
      [trip.id, invitee.id, role, user.id],
    );
    if (!added) return { status: "already", name: invitee.name, emailed: false };
    await notify(invitee.id, "trip_invite", `${user.name} added you to the trip "${trip.title}" (${trip.destination}).`, { tripId: trip.id, addedBy: user.handle });
    return { status: "added", name: invitee.name, emailed: false };
  }

  let row = await queryOne<InviteRow>(
    `SELECT ${INVITE_FIELDS} FROM trip_invites i LEFT JOIN users u ON u.id = i.created_by WHERE i.trip_id = $1 AND i.email = $2 AND ${LIVE} LIMIT 1`,
    [trip.id, email],
  );
  if (row && row.role !== role) {
    await queryAll("UPDATE trip_invites SET role = $2 WHERE id = $1", [row.id, role]);
    row = { ...row, role };
  }
  if (!row) {
    row = await queryOne<InviteRow>(
      `INSERT INTO trip_invites (trip_id, token, role, purpose, email, created_by, expires_at) VALUES ($1, $2, $3, 'invite', $4, $5, $6)
       RETURNING id, token, role, purpose, email, NULL::text AS created_by_name, created_at, expires_at, uses`,
      [trip.id, newToken(), role, email, user.id, new Date(Date.now() + EMAIL_INVITE_DAYS * DAY_MS).toISOString()],
    );
    if (!row) throw new Error("Could not create the invite");
  }
  const invite = { ...mapInvite(row), createdBy: row.created_by_name ?? user.name };
  const url = joinUrl(origin, invite.token);

  let emailed = false;
  // At most ten invite emails a day from one traveler, and three a day to one address whoever sends
  // them: the email carries words the inviter chose, so it must not become a way to send mail.
  if (!emailConfigured()) {
    if (process.env.NODE_ENV === "production") console.error("[email] RESEND_API_KEY is not set: a trip invite could not be emailed");
    else console.warn(`[email] not configured; the invite link for ${email} is ${url}`);
  } else if (allow(`invite:from:${user.id}`, 10, DAY_MS) && allow(`invite:to:${email}`, 3, DAY_MS)) {
    try {
      await sendEmail(tripInviteEmail({ to: email, inviter: user.name, title: trip.title, destination: trip.destination, dates: dateRange(trip.startDate, trip.endDate), url, canEdit: role === "editor" }));
      emailed = true;
    } catch (err) {
      console.error("[email] sending a trip invite failed", err instanceof Error ? err.message : err);
    }
  }
  return { status: "invited", emailed, invite };
}

export async function revokeInvite(trip: Trip, inviteId: string): Promise<void> {
  const row = UUID.test(inviteId)
    ? await queryOne<{ id: string }>("UPDATE trip_invites SET revoked_at = now() WHERE id = $1 AND trip_id = $2 AND revoked_at IS NULL RETURNING id", [inviteId, trip.id])
    : null;
  if (!row) throw new HttpError(404, "Invite not found");
}

interface JoinRow extends Row {
  id: string;
  trip_id: string;
  owner_id: string;
  role: string;
  purpose: string;
  email: string | null;
  created_by: string | null;
  inviter_name: string;
  expires_at: unknown;
  revoked_at: unknown;
  accepted_at: unknown;
  title: string;
  destination: string;
  place: unknown;
  start_date: string | null;
  end_date: string | null;
  member_count: number | string;
}

async function findInvite(token: string): Promise<JoinRow | null> {
  if (!TOKEN.test(token)) return null;
  return queryOne<JoinRow>(
    `SELECT i.id, i.trip_id, t.owner_id, i.role, i.purpose, i.email, i.created_by, i.expires_at, i.revoked_at, i.accepted_at,
            COALESCE(u.name, o.name) AS inviter_name, t.title, t.destination, t.place,
            t.start_date::text AS start_date, t.end_date::text AS end_date,
            (SELECT count(*) FROM trip_members m WHERE m.trip_id = t.id) AS member_count
       FROM trip_invites i JOIN trips t ON t.id = i.trip_id JOIN users o ON o.id = t.owner_id
       LEFT JOIN users u ON u.id = i.created_by
      WHERE i.token = $1`,
    [token],
  );
}

function statusOf(row: JoinRow): InviteStatus {
  if (row.revoked_at) return "revoked";
  if (row.accepted_at) return "used";
  if (row.expires_at && Date.parse(iso(row.expires_at)) < Date.now()) return "expired";
  return "ok";
}

/** What the join page shows. The trip is only described while the invite works (or to someone already on it). */
export async function previewInvite(token: string, viewer: SessionUser | null): Promise<InvitePreview | null> {
  const row = await findInvite(token);
  if (!row) return null;
  const member = viewer ? await queryOne("SELECT 1 FROM trip_members WHERE trip_id = $1 AND user_id = $2", [row.trip_id, viewer.id]) : null;
  const status = statusOf(row);
  const place = jsonb<ResolvedPlace>(row.place);
  return {
    status,
    purpose: row.purpose === "feedback" ? "feedback" : "invite",
    role: row.role === "viewer" ? "viewer" : "editor",
    inviter: row.inviter_name,
    ...(status === "ok" || member
      ? {
          trip: {
            title: row.title,
            destination: row.destination,
            ...(row.start_date ? { startDate: row.start_date.slice(0, 10) } : {}),
            ...(row.end_date ? { endDate: row.end_date.slice(0, 10) } : {}),
            // Place photos come through the signed-in photo proxy.
            ...(viewer && place?.photos?.[0] ? { photo: place.photos[0] } : {}),
            memberCount: Number(row.member_count),
          },
        }
      : {}),
    ...(row.email ? { email: maskEmail(row.email) } : {}),
    signedIn: !!viewer,
    ...(member ? { tripId: row.trip_id } : {}),
    wrongAccount: !!(viewer && row.email && normalizeEmail(viewer.email) !== row.email),
  };
}

/**
 * Puts the traveler on the trip through an invite. Someone already on it keeps their place; a
 * planning link still lifts a commenter to editor, and moves a feedback giver into the plan.
 */
export async function acceptInvite(token: string, user: SessionUser): Promise<{ tripId: string; joined: boolean }> {
  const row = await findInvite(token);
  if (!row) throw new HttpError(404, "This invite link doesn't work. Ask for a new one.");
  const status = statusOf(row);
  const forMe = !row.email || row.email === normalizeEmail(user.email);
  const existing = await queryOne<{ role: string; via: string }>("SELECT role, via FROM trip_members WHERE trip_id = $1 AND user_id = $2", [row.trip_id, user.id]);
  if (existing) {
    if (status === "ok" && forMe && row.purpose === "invite" && existing.role !== "owner") {
      const role = existing.role === "viewer" && row.role === "editor" ? "editor" : existing.role;
      const via = existing.via === "feedback" ? (row.email ? "email" : "link") : existing.via;
      if (role !== existing.role || via !== existing.via) await queryAll("UPDATE trip_members SET role = $3, via = $4 WHERE trip_id = $1 AND user_id = $2", [row.trip_id, user.id, role, via]);
    }
    return { tripId: row.trip_id, joined: false };
  }
  if (status === "revoked") throw new HttpError(410, "This link was turned off. Ask for a new one.");
  if (status === "expired") throw new HttpError(410, "This invite has expired. Ask for a new one.");
  if (status === "used") throw new HttpError(410, "This invite was already used.");
  if (!forMe) throw new HttpError(403, `This invite was sent to ${maskEmail(row.email ?? "")}. Sign in with that email to join.`);

  const via: TripJoinedVia = row.purpose === "feedback" ? "feedback" : row.email ? "email" : "link";
  const role: InviteRole = row.purpose === "feedback" || row.role === "viewer" ? "viewer" : "editor";
  await queryAll("INSERT INTO trip_members (trip_id, user_id, role, added_by, via) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (trip_id, user_id) DO NOTHING", [
    row.trip_id,
    user.id,
    role,
    row.created_by,
    via,
  ]);
  await queryAll(`UPDATE trip_invites SET uses = uses + 1${row.email ? ", accepted_at = now()" : ""} WHERE id = $1`, [row.id]);
  // The owner and whoever shared the link hear about it.
  const text =
    via === "feedback" ? `${user.name} opened your feedback link for "${row.title}" and can now vote and comment.` : `${user.name} joined "${row.title}".`;
  const recipients = [...new Set([row.owner_id, row.created_by].filter((id): id is string => !!id && id !== user.id))];
  await Promise.all(recipients.map((id) => notify(id, "trip_join", text, { tripId: row.trip_id })));
  return { tripId: row.trip_id, joined: true };
}

/* ---------------------------------- roles ---------------------------------- */

/** The owner decides who edits and who comments. */
export async function changeMemberRole(trip: Trip, owner: SessionUser, memberId: string, role: InviteRole): Promise<void> {
  if (memberId === trip.ownerId) throw new HttpError(400, "The owner's role cannot change");
  const current = UUID.test(memberId) ? await queryOne<{ role: string; via: string }>("SELECT role, via FROM trip_members WHERE trip_id = $1 AND user_id = $2", [trip.id, memberId]) : null;
  if (!current) throw new HttpError(404, "Member not found");
  if (current.role === role) return;
  // Someone giving feedback who is made an editor is planning now (and sees the bookings).
  const via = role === "editor" && current.via === "feedback" ? "added" : current.via;
  await queryAll("UPDATE trip_members SET role = $3, via = $4 WHERE trip_id = $1 AND user_id = $2", [trip.id, memberId, role, via]);
  await notify(memberId, "trip_activity", `${owner.name} changed what you can do on "${trip.title}": ${roleLabel(role)}.`, { tripId: trip.id });
}
