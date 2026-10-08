import type { ItineraryStop, TripDetail, TripItem, TripMember, TripRole } from "@/lib/types";

/**
 * Planning a trip together: the trip's discussion, comments and group votes on its ideas and
 * stops, and the invites (links, emails, "Get feedback") that bring people onto it.
 */

export type CollabTargetKind = "item" | "stop";

/**
 * What a comment or a vote is about: one of the trip's ideas, or a stop on its board. A stop made
 * from an idea is that idea, so its votes and comments follow it from the ideas list onto a day.
 */
export interface CollabTarget {
  kind: CollabTargetKind;
  id: string;
  /** The place's name when the comment or vote was made (a stop can be renamed or removed later). */
  label: string;
}

export interface TripMessage {
  id: string;
  /** Null once the author's account is gone. */
  userId: string | null;
  name: string;
  handle: string;
  /** Unset for the trip's discussion; set for a comment on an idea or a stop. */
  target?: CollabTarget;
  body: string;
  createdAt: string;
}

export type VoteValue = 1 | -1;

export interface TripVote {
  userId: string;
  name: string;
  target: CollabTarget;
  value: VoteValue;
  updatedAt: string;
}

export interface TripCollab {
  messages: TripMessage[];
  votes: TripVote[];
}

/** Two version strings: the trip itself (details, ideas, people) and its conversation (messages, votes). */
export interface TripPulse {
  trip: string;
  collab: string;
}

export type InvitePurpose = "invite" | "feedback";
/** Editors plan; viewers ("Can comment") read, vote, comment and write in the discussion. */
export type InviteRole = "editor" | "viewer";

export interface TripInvite {
  id: string;
  token: string;
  role: InviteRole;
  purpose: InvitePurpose;
  /** An emailed invite: only this address can accept it. Unset for a link anyone can use. */
  email?: string;
  createdBy?: string;
  createdAt: string;
  expiresAt?: string;
  uses: number;
}

export type InviteStatus = "ok" | "revoked" | "expired" | "used";

/** What the join page shows before (and after) signing in. */
export interface InvitePreview {
  status: InviteStatus;
  purpose: InvitePurpose;
  role: InviteRole;
  inviter: string;
  /** Described only while the invite works, or to someone already on the trip. */
  trip?: { title: string; destination: string; startDate?: string; endDate?: string; photo?: string; memberCount: number };
  /** For an emailed invite: the address it went to, partly hidden. */
  email?: string;
  signedIn: boolean;
  /** Already on the trip: the page offers to open it. */
  tripId?: string;
  /** Signed in with an address other than the emailed invite's. */
  wrongAccount: boolean;
}

/** Result of inviting someone by email. */
export interface EmailInviteResult {
  /** "added": they have an account and are on the trip now; "already": they were; "invited": an invite waits for their sign-up. */
  status: "added" | "already" | "invited";
  name?: string;
  /** Whether the invite email went out (no email service configured: share the link instead). */
  emailed: boolean;
  invite?: TripInvite;
}

export const MESSAGE_MAX = 2000;

export const targetKey = (target: Pick<CollabTarget, "kind" | "id">) => `${target.kind}:${target.id}`;

export const itemTarget = (item: Pick<TripItem, "id" | "title">): CollabTarget => ({ kind: "item", id: item.id, label: item.title });

/** A stop scheduled from an idea speaks for that idea; any other stop for itself. */
export const stopTarget = (stop: Pick<ItineraryStop, "id" | "title" | "itemId">): CollabTarget =>
  stop.itemId ? { kind: "item", id: stop.itemId, label: stop.title } : { kind: "stop", id: stop.id, label: stop.title };

export interface VoteTally {
  up: number;
  down: number;
  /** The signed-in traveler's vote, 0 for none. */
  mine: VoteValue | 0;
  upBy: string[];
  downBy: string[];
}

export const EMPTY_TALLY: VoteTally = { up: 0, down: 0, mine: 0, upBy: [], downBy: [] };

/** Votes per target key, with names, and the signed-in traveler's own vote. */
export function tallyVotes(votes: TripVote[], userId?: string | null): Map<string, VoteTally> {
  const out = new Map<string, VoteTally>();
  for (const v of votes) {
    const key = targetKey(v.target);
    const t = out.get(key) ?? { up: 0, down: 0, mine: 0, upBy: [], downBy: [] };
    if (v.value > 0) {
      t.up++;
      t.upBy.push(v.name);
    } else {
      t.down++;
      t.downBy.push(v.name);
    }
    if (userId && v.userId === userId) t.mine = v.value;
    out.set(key, t);
  }
  return out;
}

/** "Sam", "Sam and Lee", "Sam, Lee and 2 others". */
export function nameList(names: string[], max = 2): string {
  const unique = [...new Set(names.filter(Boolean))];
  if (unique.length <= 1) return unique[0] ?? "";
  if (unique.length <= max) return `${unique.slice(0, -1).join(", ")} and ${unique[unique.length - 1]}`;
  const rest = unique.length - max;
  return `${unique.slice(0, max).join(", ")} and ${rest} other${rest === 1 ? "" : "s"}`;
}

export function roleLabel(role: TripRole): string {
  return role === "owner" ? "Owner" : role === "editor" ? "Can edit" : "Can comment";
}

export const firstWord = (name: string) => name.trim().split(/\s+/)[0] || name;

/** "t•••@gmail.com": enough to recognize your own address, not enough to read someone else's. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  return `${local.slice(0, 1)}•••@${domain}`;
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** Members the assistant should know about: name and what they can do. */
export function membersForContext(members: TripMember[]): string[] {
  return members.map((m) => `${m.name} (${m.via === "feedback" ? "giving feedback" : roleLabel(m.role).toLowerCase()})`);
}

/**
 * The group's votes for the assistant, strongest first: what the members are for and against,
 * by name, for each idea or stop that has votes.
 */
export function groupVotesForContext(collab: TripCollab, trip: Pick<TripDetail, "items" | "itinerary">) {
  const labels = new Map<string, string>();
  for (const item of trip.items) labels.set(targetKey({ kind: "item", id: item.id }), item.title);
  for (const day of trip.itinerary) for (const stop of day.stops) labels.set(targetKey(stopTarget(stop)), stop.title);
  const scheduled = new Map<string, number>();
  for (const day of trip.itinerary) for (const stop of day.stops) scheduled.set(targetKey(stopTarget(stop)), day.day);
  return [...tallyVotes(collab.votes)]
    .map(([key, t]) => {
      const day = scheduled.get(key);
      // Where it stands now: on a day, still an idea, or gone from the trip since the votes.
      const where: { day: number } | { status: string } = day !== undefined ? { day } : { status: labels.has(key) ? "idea" : "removed" };
      return {
        place: labels.get(key) ?? collab.votes.find((v) => targetKey(v.target) === key)?.target.label ?? key,
        ...where,
        for: t.up,
        against: t.down,
        forBy: t.upBy,
        againstBy: t.downBy,
      };
    })
    .sort((a, b) => b.for - b.against - (a.for - a.against) || b.for - a.for)
    .slice(0, 40);
}

/** The latest discussion and comments for the assistant, oldest first. */
export function discussionForContext(collab: TripCollab, limit = 15) {
  return collab.messages.slice(-limit).map((m) => ({ from: m.name, ...(m.target ? { about: m.target.label } : {}), text: clip(m.body, 280) }));
}

/** Set in this tab by the join page: the trip just joined opens before the first-run setup. */
export const JOINED_TRIP_KEY = "xp-joined-trip";
