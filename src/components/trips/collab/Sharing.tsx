"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Copy, Link2, MessageSquareHeart, UserPlus, X } from "lucide-react";
import { api } from "@/lib/api";
import { useTravelStore } from "@/lib/store";
import type { TripDetail } from "@/lib/types";
import { roleLabel, type InvitePurpose, type InviteRole, type TripInvite } from "@/lib/collab/types";
import { Button } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Field";

const base = (tripId: string) => `/api/trips/${encodeURIComponent(tripId)}/invites`;

export const inviteUrl = (token: string) => `${typeof window === "undefined" ? "" : window.location.origin}/join/${token}`;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // No clipboard here (permissions, plain http): the link stays selectable in its box.
    return false;
  }
}

/** The trip's pending invites and live links, for the people who plan it. */
export function useTripInvites(tripId: string, enabled: boolean) {
  const [state, setState] = useState<{ id: string; invites: TripInvite[] } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    api<{ invites: TripInvite[] }>(base(tripId))
      .then((res) => {
        if (active) setState({ id: tripId, invites: res.invites });
      })
      .catch((err) => console.error("XPMatch: loading invites failed", err));
    return () => {
      active = false;
    };
  }, [tripId, enabled]);
  const invites = state?.id === tripId ? state.invites : [];
  const set = useCallback((next: TripInvite[]) => setState({ id: tripId, invites: next }), [tripId]);
  const link = useCallback(
    async (purpose: InvitePurpose, role: InviteRole) => {
      const res = await api<{ invite: TripInvite; invites: TripInvite[] }>(base(tripId), { method: "POST", json: { kind: "link", purpose, role } });
      set(res.invites);
      return res.invite;
    },
    [tripId, set],
  );
  const revoke = useCallback(
    async (inviteId: string) => {
      const res = await api<{ invites: TripInvite[] }>(`${base(tripId)}/${encodeURIComponent(inviteId)}`, { method: "DELETE" });
      set(res.invites);
    },
    [tripId, set],
  );
  return { invites, set, link, revoke };
}

function LinkBox({ label, url }: { label: string; url: string }) {
  return (
    <input
      readOnly
      value={url}
      aria-label={label}
      onFocus={(e) => e.currentTarget.select()}
      className="h-9 w-full min-w-0 rounded-xl border border-border bg-surface/60 px-3 font-mono text-[12px] text-neutral-700 outline-none focus:border-brand"
    />
  );
}

/**
 * Bringing people onto the trip: by email (straight on with an account, an emailed invite
 * without one), with an invite link (Can edit or Can comment), or with a "Get feedback" link for
 * friends who aren't coming. Live links and waiting invites are listed to copy again or turn off.
 */
export function InvitePanel({ trip, onTrip }: { trip: TripDetail; onTrip: (trip: TripDetail) => void }) {
  const { inviteToTrip } = useTravelStore();
  const { invites, set, link, revoke } = useTripInvites(trip.id, true);
  const [email, setEmail] = useState("");
  const [emailRole, setEmailRole] = useState<InviteRole>("editor");
  const [linkRole, setLinkRole] = useState<InviteRole>("editor");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const liveLink = (purpose: InvitePurpose, role: InviteRole) => invites.find((i) => !i.email && i.purpose === purpose && i.role === role);
  const planLink = liveLink("invite", linkRole);
  const feedbackLink = liveLink("feedback", "viewer");

  const fail = (err: unknown, fallback: string) => setError(err instanceof Error && err.message ? err.message : fallback);

  const sendEmail = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setBusy("email");
    setError(null);
    setNotice(null);
    try {
      const res = await inviteToTrip(trip.id, value, emailRole);
      onTrip(res.trip);
      set(res.invites);
      setNotice(
        res.status === "added"
          ? `Added ${res.name ?? value}. They'll see the trip under Trips and get a note in Updates.`
          : res.status === "already"
            ? `${res.name ?? value} is already on this trip.`
            : res.emailed
              ? `Invite sent to ${value}. They join from the link in the email, signing up with that address.`
              : `${value} doesn't have an account yet. Copy their invite link below and send it to them.`,
      );
      setEmail("");
    } catch (err) {
      fail(err, "Could not invite them");
    } finally {
      setBusy(null);
    }
  };

  const copyLink = async (purpose: InvitePurpose, role: InviteRole) => {
    const key = purpose === "feedback" ? "feedback" : `invite:${role}`;
    setBusy(key);
    setError(null);
    try {
      const invite = liveLink(purpose, role) ?? (await link(purpose, role));
      const ok = await copyText(inviteUrl(invite.token));
      setCopied(ok ? key : null);
      if (!ok) setNotice("Copy the link from the box.");
    } catch (err) {
      fail(err, "Could not make the link");
    } finally {
      setBusy(null);
    }
  };

  const pending = invites;

  return (
    <div className="grid gap-3">
      <section className="grid gap-3 rounded-2xl border border-border p-3" aria-label="Invite people">
        <div className="flex items-center gap-2 text-[14px] font-semibold">
          <UserPlus className="h-4 w-4" /> Invite people
        </div>
        <form onSubmit={sendEmail} className="grid gap-2">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="friend@example.com" aria-label="Member email" />
          <div className="flex gap-2">
            <Select value={emailRole} onChange={(e) => setEmailRole(e.target.value as InviteRole)} className="flex-1" aria-label="What they can do">
              <option value="editor">Can edit</option>
              <option value="viewer">Can comment</option>
            </Select>
            <Button type="submit" disabled={busy === "email" || !email.trim()} className="shrink-0">
              {busy === "email" ? "Inviting…" : "Invite"}
            </Button>
          </div>
          <p className="text-[12px] text-muted">No XPMatch account yet? They get an email with a link to sign up and join.</p>
        </form>
        <div className="grid gap-2 border-t border-border pt-3">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
            <Link2 className="h-4 w-4" /> Or share a link
          </span>
          <div className="flex gap-2">
            <Select value={linkRole} onChange={(e) => setLinkRole(e.target.value as InviteRole)} className="flex-1" aria-label="What people with the link can do">
              <option value="editor">Can edit</option>
              <option value="viewer">Can comment</option>
            </Select>
            <Button variant="outline" onClick={() => copyLink("invite", linkRole)} disabled={busy === `invite:${linkRole}`} className="shrink-0">
              {copied === `invite:${linkRole}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === `invite:${linkRole}` ? "Copied" : "Copy invite link"}
            </Button>
          </div>
          {planLink ? <LinkBox label="Invite link" url={inviteUrl(planLink.token)} /> : null}
        </div>
      </section>

      <section className="grid gap-2 rounded-2xl border border-violet-200 bg-violet-50/60 p-3" aria-label="Get feedback">
        <div className="flex items-center gap-2 text-[14px] font-semibold">
          <MessageSquareHeart className="h-4 w-4" /> Get feedback
        </div>
        <p className="text-[13px] text-neutral-700">
          Friends who aren&apos;t coming can see the plan, vote on places and comment. They can&apos;t change anything or see your bookings.
        </p>
        <div>
          <Button variant="outline" onClick={() => copyLink("feedback", "viewer")} disabled={busy === "feedback"}>
            {copied === "feedback" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied === "feedback" ? "Copied" : "Copy feedback link"}
          </Button>
        </div>
        {feedbackLink ? <LinkBox label="Feedback link" url={inviteUrl(feedbackLink.token)} /> : null}
      </section>

      {notice ? <p className="text-[13px] text-emerald-700">{notice}</p> : null}
      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}

      {pending.length ? (
        <section aria-label="Waiting invites and links">
          <div className="mb-1.5 text-[13px] font-semibold">Invites and links</div>
          <ul className="divide-y divide-border rounded-2xl border border-border" data-testid="pending-invites">
            {pending.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{i.email ?? (i.purpose === "feedback" ? "Feedback link" : "Invite link")}</span>
                  <span className="block text-[12px] text-muted">
                    {[
                      i.purpose === "feedback" ? "Can vote and comment" : roleLabel(i.role),
                      i.email ? "waiting for them to sign up" : i.uses ? `${i.uses} joined` : "not used yet",
                      i.createdBy ? `by ${i.createdBy}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                {i.email ? (
                  <button type="button" onClick={() => void copyText(inviteUrl(i.token)).then((ok) => setCopied(ok ? i.id : null))} className="rounded-full px-2.5 py-1 font-medium hover:bg-surface">
                    {copied === i.id ? "Copied" : "Copy link"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void revoke(i.id).catch((err) => fail(err, "Could not turn it off"))}
                  aria-label={i.email ? `Withdraw the invite to ${i.email}` : `Turn off the ${i.purpose === "feedback" ? "feedback" : "invite"} link`}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium text-red-600 hover:bg-red-50"
                >
                  <X className="h-3.5 w-3.5" /> {i.email ? "Withdraw" : "Turn off"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
