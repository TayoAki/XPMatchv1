import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Planning together against a real embedded Postgres (PGlite in a temp directory, with every
 * migration): invites and joining, roles, what feedback givers see, votes, the discussion,
 * grouped updates and the pulse. Emails go to a fake sender.
 */
const dir = mkdtempSync(path.join(os.tmpdir(), "xp-collab-"));
process.env.PGLITE_DIR = dir;
delete process.env.DATABASE_URL;

const mail = vi.hoisted(() => ({ sent: [] as { to: string; subject: string; text: string }[], configured: true }));
vi.mock("@/server/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/email")>();
  return {
    ...actual,
    emailConfigured: () => mail.configured,
    sendEmail: async (m: { to: string; subject: string; text: string }) => {
      mail.sent.push(m);
      return { id: `email_${mail.sent.length}` };
    },
  };
});

import type { SessionUser } from "@/server/auth";
import { createUser } from "@/server/auth";
import { queryAll, queryOne } from "@/server/db";
import { loadNotifications, loadTrip, loadTripDetail } from "@/server/models";
import {
  acceptInvite,
  changeMemberRole,
  deleteMessage,
  inviteByEmail,
  itemRecipients,
  linkInvite,
  loadCollab,
  loadInvites,
  notifyItemAdded,
  notifyTripEdited,
  postMessage,
  previewInvite,
  requireTrip,
  revokeInvite,
  setVote,
  tripPulse,
} from "@/server/collab";
import { groupVotesForContext, stopTarget, tallyVotes, targetKey } from "@/lib/collab/types";
import type { Trip } from "@/lib/types";

const ORIGIN = "https://app.example.test";
let owner: SessionUser;
let sam: SessionUser;
let lee: SessionUser;
let tripId: string;
let ideaId: string;
const stopId = "stop-forum";

const trip = async (user: SessionUser): Promise<Trip> => (await loadTrip(tripId, user.id))!;
const unread = async (user: SessionUser) => (await loadNotifications(user.id)).filter((n) => !n.read);
const markRead = (user: SessionUser) => queryAll("UPDATE notifications SET read = true WHERE user_id = $1", [user.id]);

beforeAll(async () => {
  const stamp = Date.now().toString(36);
  owner = await createUser({ email: `tayo-${stamp}@example.com`, password: "secret-123456", name: "Tayo Akigbogun" });
  sam = await createUser({ email: `sam-${stamp}@example.com`, password: "secret-123456", name: "Sam Rivera" });
  lee = await createUser({ email: `lee-${stamp}@example.com`, password: "secret-123456", name: "Lee Park" });
  const itinerary = [{ day: 1, title: "Ancient Rome", stops: [{ id: stopId, title: "Roman Forum", note: "" }] }];
  const row = await queryOne<{ id: string }>(
    "INSERT INTO trips (owner_id, title, destination, start_date, end_date, itinerary) VALUES ($1, 'Trip to Rome', 'Rome', '2026-10-10', '2026-10-13', $2::jsonb) RETURNING id",
    [owner.id, JSON.stringify(itinerary)],
  );
  tripId = row!.id;
  await queryAll("INSERT INTO trip_members (trip_id, user_id, role) VALUES ($1, $2, 'owner')", [tripId, owner.id]);
  const idea = await queryOne<{ id: string }>("INSERT INTO trip_items (trip_id, kind, title, added_by) VALUES ($1, 'idea', 'Colosseum', $2) RETURNING id", [tripId, owner.id]);
  ideaId = idea!.id;
  await queryAll("INSERT INTO trip_items (trip_id, kind, title, note, added_by) VALUES ($1, 'booking', 'Hotel Artemide', 'Confirmation 88231', $2)", [tripId, owner.id]);
}, 60_000);

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

beforeEach(() => {
  mail.sent.length = 0;
  mail.configured = true;
});

describe("invites and joining", () => {
  it("hands out the same planning link until it is turned off, and anyone with it joins as an editor", async () => {
    const t = await trip(owner);
    const first = await linkInvite(t, owner, "invite", "editor");
    const again = await linkInvite(t, owner, "invite", "editor");
    expect(again.token).toBe(first.token);
    expect(first.token).toMatch(/^[A-Za-z0-9_-]{24}$/);

    const preview = await previewInvite(first.token, null);
    expect(preview).toMatchObject({ status: "ok", purpose: "invite", role: "editor", inviter: "Tayo Akigbogun", signedIn: false, wrongAccount: false });
    expect(preview?.trip).toMatchObject({ title: "Trip to Rome", destination: "Rome", startDate: "2026-10-10", memberCount: 1 });

    await expect(acceptInvite(first.token, sam)).resolves.toEqual({ tripId, joined: true });
    await expect(acceptInvite(first.token, sam)).resolves.toEqual({ tripId, joined: false });
    expect((await trip(sam)).role).toBe("editor");
    expect((await trip(sam)).via).toBe("link");
    const joined = await unread(owner);
    expect(joined.map((n) => n.text)).toContain('Sam Rivera joined "Trip to Rome".');
  });

  it("lets feedback givers see the plan but not the bookings, and hides addresses from everyone but the owner", async () => {
    const t = await trip(owner);
    const feedback = await linkInvite(t, owner, "feedback", "editor");
    expect(feedback.role).toBe("viewer");
    await acceptInvite(feedback.token, lee);
    const leeTrip = await loadTripDetail(tripId, lee.id);
    expect(leeTrip?.role).toBe("viewer");
    expect(leeTrip?.via).toBe("feedback");
    expect(leeTrip?.items.map((i) => i.title)).toEqual(["Colosseum"]);
    expect(leeTrip?.members.find((m) => m.userId === owner.id)?.email).toBe("");
    expect(leeTrip?.members.find((m) => m.userId === lee.id)?.email).toBe(lee.email);
    const samTrip = await loadTripDetail(tripId, sam.id);
    expect(samTrip?.items.map((i) => i.title).sort()).toEqual(["Colosseum", "Hotel Artemide"]);
    const ownerTrip = await loadTripDetail(tripId, owner.id);
    expect(ownerTrip?.members.find((m) => m.userId === lee.id)).toMatchObject({ email: lee.email, via: "feedback", role: "viewer" });
    await expect(requireTrip(tripId, lee.id, "edit")).rejects.toMatchObject({ status: 403 });
    expect((await unread(owner)).map((n) => n.text)).toContain('Lee Park opened your feedback link for "Trip to Rome" and can now vote and comment.');
    // A new booking's name doesn't reach them through Updates either.
    expect(await itemRecipients(tripId, owner.id, "booking")).toEqual([sam.id]);
    expect((await itemRecipients(tripId, owner.id, "idea")).sort()).toEqual([sam.id, lee.id].sort());
  });

  it("emails an invite to an address without an account; only that address, holding the link, can accept it", async () => {
    const t = await trip(owner);
    const email = `newcomer-${Date.now().toString(36)}@example.com`;
    const result = await inviteByEmail(t, owner, email.toUpperCase(), "editor", ORIGIN);
    expect(result).toMatchObject({ status: "invited", emailed: true });
    expect(result.invite?.email).toBe(email);
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].to).toBe(email);
    expect(mail.sent[0].text).toContain(`${ORIGIN}/join/${result.invite!.token}`);
    expect(mail.sent[0].subject).toBe("Tayo Akigbogun invited you to Trip to Rome on XPMatch");
    expect((await loadInvites(tripId)).some((i) => i.email === email)).toBe(true);

    // Someone else signed in cannot use it, and is told whose it is without the whole address.
    await expect(acceptInvite(result.invite!.token, sam)).resolves.toEqual({ tripId, joined: false });
    const stranger = await createUser({ email: `stranger-${Date.now().toString(36)}@example.com`, password: "secret-123456", name: "Stranger" });
    expect(await previewInvite(result.invite!.token, stranger)).toMatchObject({ wrongAccount: true, email: `n•••@example.com` });
    await expect(acceptInvite(result.invite!.token, stranger)).rejects.toMatchObject({ status: 403 });

    // Signing up with the address is not enough (accounts are not email-verified): the emailed link is the proof.
    const newcomer = await createUser({ email, password: "secret-123456", name: "New Comer" });
    await expect(requireTrip(tripId, newcomer.id)).rejects.toMatchObject({ status: 404 });
    await expect(acceptInvite(result.invite!.token, newcomer)).resolves.toEqual({ tripId, joined: true });
    expect((await trip(newcomer)).via).toBe("email");
    expect((await loadInvites(tripId)).some((i) => i.email === email)).toBe(false);
    await expect(acceptInvite(result.invite!.token, stranger)).rejects.toMatchObject({ status: 410 });
  });

  it("adds someone with an account right away, and leaves an existing member's role alone", async () => {
    const t = await trip(owner);
    const again = await inviteByEmail(t, owner, sam.email, "viewer", ORIGIN);
    expect(again).toEqual({ status: "already", name: "Sam Rivera", emailed: false });
    expect((await trip(sam)).role).toBe("editor");
    expect(mail.sent).toHaveLength(0);
  });

  it("stops a turned-off link from letting anyone else in", async () => {
    const t = await trip(owner);
    const link = await linkInvite(t, owner, "invite", "viewer");
    await revokeInvite(t, link.id);
    expect((await previewInvite(link.token, null))?.status).toBe("revoked");
    expect((await previewInvite(link.token, null))?.trip).toBeUndefined();
    const late = await createUser({ email: `late-${Date.now().toString(36)}@example.com`, password: "secret-123456", name: "Late Comer" });
    await expect(acceptInvite(link.token, late)).rejects.toMatchObject({ status: 410 });
    expect(await previewInvite("not-a-real-token-at-all", null)).toBeNull();
  });

  it("lets only the owner change roles, and tells the member", async () => {
    const t = await trip(owner);
    await markRead(sam);
    await changeMemberRole(t, owner, sam.id, "viewer");
    expect((await trip(sam)).role).toBe("viewer");
    expect((await unread(sam))[0].text).toBe('Tayo Akigbogun changed what you can do on "Trip to Rome": Can comment.');
    await changeMemberRole(t, owner, sam.id, "editor");
    await expect(changeMemberRole(t, owner, owner.id, "viewer")).rejects.toMatchObject({ status: 400 });
    await expect(requireTrip(tripId, sam.id, "owner")).rejects.toMatchObject({ status: 403 });
  });
});

describe("votes and the discussion", () => {
  it("counts one vote per member, follows an idea onto the board, and gives the assistant the tally by name", async () => {
    await markRead(owner);
    const samTrip = await trip(sam);
    await setVote(samTrip, sam, { kind: "item", id: ideaId }, 1);
    await setVote(samTrip, sam, { kind: "stop", id: stopId }, -1);
    await setVote(await trip(lee), lee, { kind: "item", id: ideaId }, 1);
    await setVote(await trip(owner), owner, { kind: "item", id: ideaId }, -1);
    await setVote(await trip(owner), owner, { kind: "item", id: ideaId }, 1);

    const collab = await loadCollab(tripId);
    const tally = tallyVotes(collab.votes, sam.id);
    expect(tally.get(targetKey({ kind: "item", id: ideaId }))).toMatchObject({ up: 3, down: 0, mine: 1 });
    expect(tally.get(targetKey({ kind: "stop", id: stopId }))).toMatchObject({ up: 0, down: 1, mine: -1, downBy: ["Sam Rivera"] });
    // A stop scheduled from the idea speaks for it.
    expect(stopTarget({ id: "s1", title: "Colosseum", itemId: ideaId })).toEqual({ kind: "item", id: ideaId, label: "Colosseum" });

    const detail = (await loadTripDetail(tripId, owner.id))!;
    expect(groupVotesForContext(collab, detail)).toEqual([
      { place: "Colosseum", status: "idea", for: 3, against: 0, forBy: ["Sam Rivera", "Lee Park", "Tayo Akigbogun"], againstBy: [] },
      { place: "Roman Forum", day: 1, for: 0, against: 1, forBy: [], againstBy: ["Sam Rivera"] },
    ]);

    // Sam's two votes are one update for the owner.
    const votes = (await unread(owner)).filter((n) => n.kind === "trip_vote");
    expect(votes.map((n) => n.text)).toEqual(['Lee Park voted for Colosseum in "Trip to Rome".', 'Sam Rivera voted on 2 places in "Trip to Rome": Colosseum and Roman Forum.']);

    await setVote(samTrip, sam, { kind: "stop", id: stopId }, 0);
    expect((await loadCollab(tripId)).votes.filter((v) => v.userId === sam.id)).toHaveLength(1);
    await expect(setVote(samTrip, sam, { kind: "stop", id: "no-such-stop" }, 1)).rejects.toMatchObject({ status: 404 });
    await expect(setVote(samTrip, sam, { kind: "item", id: "not-a-uuid" }, 1)).rejects.toMatchObject({ status: 404 });
  });

  it("keeps the discussion and comments in order and groups them into one update per trip", async () => {
    await markRead(owner);
    const before = await tripPulse(tripId, owner.id);
    await postMessage(await trip(sam), sam, { body: "  Can we do the food tour on day 2?  " });
    await postMessage(await trip(lee), lee, { body: "The Colosseum at opening is magic.", target: { kind: "item", id: ideaId } });
    const collab = await loadCollab(tripId);
    expect(collab.messages.map((m) => [m.name, m.body, m.target?.label])).toEqual([
      ["Sam Rivera", "Can we do the food tour on day 2?", undefined],
      ["Lee Park", "The Colosseum at opening is magic.", "Colosseum"],
    ]);
    const talk = (await unread(owner)).filter((n) => n.kind === "trip_discussion");
    expect(talk).toHaveLength(1);
    expect(talk[0].text).toBe('1 new message and 1 comment in "Trip to Rome" from Sam Rivera and Lee Park. Latest from Lee: "The Colosseum at opening is magic."');
    expect(talk[0].data).toMatchObject({ tripId, section: "discussion" });

    const after = await tripPulse(tripId, owner.id);
    expect(after?.collab).not.toBe(before?.collab);
    expect(after?.trip).toBe(before?.trip);
    expect(await tripPulse(tripId, (await createUser({ email: `out-${Date.now().toString(36)}@example.com`, password: "secret-123456", name: "Outsider" })).id)).toBeNull();

    // Authors delete their own words; the owner can delete anyone's.
    const [samsMessage, leesComment] = collab.messages;
    await expect(deleteMessage(await trip(sam), sam, leesComment.id)).rejects.toMatchObject({ status: 403 });
    await deleteMessage(await trip(sam), sam, samsMessage.id);
    await deleteMessage(await trip(owner), owner, leesComment.id);
    expect((await loadCollab(tripId)).messages).toHaveLength(0);
  });

  it("groups a run of edits and additions, and starts a new update once the last one was read", async () => {
    await markRead(sam);
    const t = await trip(owner);
    for (let i = 0; i < 3; i++) await notifyTripEdited([sam.id], t, owner);
    await notifyItemAdded([sam.id], t, owner, "idea", "Colosseum");
    await notifyItemAdded([sam.id], t, owner, "idea", "Hotel Artemide");
    expect((await unread(sam)).map((n) => n.text).sort()).toEqual([
      'Tayo Akigbogun added 2 ideas to "Trip to Rome": Colosseum and Hotel Artemide.',
      'Tayo Akigbogun made 3 changes to "Trip to Rome".',
    ]);
    await markRead(sam);
    await notifyTripEdited([sam.id], t, owner);
    expect((await unread(sam)).map((n) => n.text)).toEqual(['Tayo Akigbogun updated the trip "Trip to Rome".']);
  });
});
