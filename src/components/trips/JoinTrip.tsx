"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Calendar, MapPin, MessageSquareHeart, Users } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatDateRange } from "@/lib/store";
import { JOINED_TRIP_KEY, type InvitePreview } from "@/lib/collab/types";
import { Button } from "@/components/ui/Button";

type Load = { state: "loading" } | { state: "missing"; message: string } | { state: "ready"; preview: InvitePreview };

const STATUS_COPY: Record<Exclude<InvitePreview["status"], "ok">, string> = {
  revoked: "This link was turned off.",
  expired: "This invite has expired.",
  used: "This invite was already used.",
};

/**
 * Where an invite or feedback link lands: who invited you to what, then sign up or sign in (back
 * here afterwards) and join. Someone already on the trip goes straight to it.
 */
export function JoinTrip({ token }: { token: string }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const here = `/join/${encodeURIComponent(token)}`;

  useEffect(() => {
    let active = true;
    api<InvitePreview>(`/api/join/${encodeURIComponent(token)}`)
      .then((preview) => {
        if (active) setLoad({ state: "ready", preview });
      })
      .catch((err: unknown) => {
        if (active) setLoad({ state: "missing", message: err instanceof ApiError ? err.message : "This invite link doesn't work. Ask for a new one." });
      });
    return () => {
      active = false;
    };
  }, [token]);

  const open = (tripId: string) => {
    try {
      window.sessionStorage.setItem(JOINED_TRIP_KEY, tripId);
    } catch {
      // Without storage the first-run setup simply comes first.
    }
    // A full navigation, so the app loads with the trip in the traveler's list.
    window.location.assign(new URL(`/trips/${tripId}`, window.location.origin).href);
  };

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ tripId: string; joined: boolean }>(`/api/join/${encodeURIComponent(token)}`, { method: "POST", json: {} });
      open(res.tripId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not join right now. Try again.");
      setBusy(false);
    }
  };

  const switchAccount = async () => {
    try {
      await api("/api/auth/logout", { method: "POST", json: {} });
    } catch {
      // Signed out or not, the sign-in page comes next.
    }
    window.location.assign(new URL(`/login?next=${encodeURIComponent(here)}`, window.location.origin).href);
  };

  if (load.state === "loading") {
    return (
      <div className="grid gap-4" aria-busy="true">
        <div className="xp-skeleton h-7 w-3/4 rounded-lg" />
        <div className="xp-skeleton h-24 rounded-2xl" />
        <div className="xp-skeleton h-12 rounded-full" />
      </div>
    );
  }

  if (load.state === "missing") {
    return (
      <div className="grid gap-3 text-center">
        <h1 className="text-[22px] font-semibold tracking-tight">Invite not found</h1>
        <p className="text-[14px] text-muted">{load.message}</p>
        <Link href="/" className="text-[14px] font-semibold underline-offset-2 hover:underline">
          Go to XPMatch
        </Link>
      </div>
    );
  }

  const { preview } = load;
  const feedback = preview.purpose === "feedback";
  const trip = preview.trip;
  const dates = trip ? formatDateRange(trip.startDate, trip.endDate) : "";

  if (preview.tripId) {
    return (
      <div className="grid gap-4 text-center" data-testid="join-trip">
        <h1 className="text-[22px] font-semibold tracking-tight">You&apos;re on this trip</h1>
        {trip ? <p className="text-[14px] text-muted">{trip.title}</p> : null}
        <Button size="lg" onClick={() => open(preview.tripId!)} className="w-full">
          Open the trip
        </Button>
      </div>
    );
  }

  if (preview.status !== "ok" || !trip) {
    return (
      <div className="grid gap-3 text-center" data-testid="join-trip">
        <h1 className="text-[22px] font-semibold tracking-tight">{preview.status === "ok" ? "Invite not found" : STATUS_COPY[preview.status]}</h1>
        <p className="text-[14px] text-muted">Ask {preview.inviter} for a new link.</p>
      </div>
    );
  }

  const heading = feedback ? `${preview.inviter} would love your feedback on ${trip.title}` : `${preview.inviter} invited you to plan ${trip.title}`;
  const what = feedback
    ? "See the plan, vote on places and leave comments. You won't change anything, and bookings stay private."
    : preview.role === "editor"
      ? "You'll plan it together: ideas, the day-by-day board, bookings and the discussion."
      : "You'll see the plan, vote on places, comment and join the discussion.";

  return (
    <div className="grid gap-5" data-testid="join-trip">
      <div>
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white">
          {feedback ? <MessageSquareHeart className="h-5 w-5" /> : <Users className="h-5 w-5" />}
        </div>
        <h1 className="text-[22px] font-semibold leading-tight tracking-tight">{heading}</h1>
        <p className="mt-2 text-[14px] text-neutral-700">{what}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        {trip.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
          <img src={trip.photo} alt="" className="h-28 w-full object-cover" />
        ) : (
          <div className="flex h-20 items-center justify-center bg-[linear-gradient(135deg,#e8fff6,#eef2ff)]">
            <MapPin className="h-6 w-6 text-neutral-500" />
          </div>
        )}
        <div className="grid gap-1 p-3 text-[13px]">
          <div className="text-[15px] font-semibold">{trip.title}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-neutral-700">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {trip.destination}
            </span>
            {dates ? (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {dates}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {trip.memberCount} on the trip
            </span>
          </div>
        </div>
      </div>

      {preview.wrongAccount ? (
        <div className="grid gap-3">
          <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
            This invite was sent to {preview.email}. Sign in with that email to join.
          </p>
          <Button size="lg" variant="outline" onClick={switchAccount} className="w-full">
            Use another account
          </Button>
        </div>
      ) : preview.signedIn ? (
        <div className="grid gap-2">
          <Button size="lg" onClick={join} disabled={busy} className="w-full">
            {busy ? "Joining…" : feedback ? "Open the trip" : "Join the trip"}
          </Button>
          {error ? (
            <p role="alert" className="text-center text-[13px] text-red-600">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-2">
          {preview.email ? <p className="text-[13px] text-muted">This invite is for {preview.email}: use that email to sign up or sign in.</p> : null}
          <Link
            href={`/signup?next=${encodeURIComponent(here)}`}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-brand px-6 text-[15px] font-medium text-white hover:bg-brand-hover"
          >
            Create a free account
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(here)}`}
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-border bg-white px-6 text-[15px] font-medium hover:bg-surface"
          >
            I have an account
          </Link>
        </div>
      )}
    </div>
  );
}
