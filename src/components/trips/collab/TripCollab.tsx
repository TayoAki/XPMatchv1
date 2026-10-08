"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { useTravelStore } from "@/lib/store";
import type { TripDetail } from "@/lib/types";
import {
  tallyVotes,
  targetKey,
  type CollabTarget,
  type TripCollab,
  type TripMessage,
  type TripPulse,
  type TripVote,
  type VoteTally,
  type VoteValue,
} from "@/lib/collab/types";

const EMPTY: TripCollab = { messages: [], votes: [] };
const base = (tripId: string) => `/api/trips/${encodeURIComponent(tripId)}`;

/**
 * The trip's discussion, comments and votes, loaded once and refreshed on demand. Votes show at
 * once and are sent one after another; the server's answer to the latest one wins.
 */
export function useTripCollabData(tripId: string | null) {
  const { user } = useTravelStore();
  const [state, setState] = useState<{ id: string; collab: TripCollab } | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const voteSeq = useRef(0);
  const voteChain = useRef<Promise<unknown>>(Promise.resolve());
  /** Bumped by every answer to our own writes: a refresh that started before one is out of date. */
  const writes = useRef(0);

  useEffect(() => {
    if (!tripId) return;
    let active = true;
    const startedAt = writes.current;
    api<TripCollab>(`${base(tripId)}/collab`)
      .then((collab) => {
        if (active && writes.current === startedAt) setState({ id: tripId, collab });
      })
      .catch((err) => {
        console.error("XPMatch: loading the trip's discussion failed", err);
        if (active) setFailedFor(tripId);
      });
    return () => {
      active = false;
    };
  }, [tripId, nonce]);

  const current = tripId && state?.id === tripId ? state.collab : null;
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const post = useCallback(
    async (body: string, target?: CollabTarget) => {
      if (!tripId) return;
      const collab = await api<TripCollab>(`${base(tripId)}/messages`, { method: "POST", json: { body, ...(target ? { target: { kind: target.kind, id: target.id } } : {}) } });
      writes.current++;
      setState({ id: tripId, collab });
    },
    [tripId],
  );

  const remove = useCallback(
    async (messageId: string) => {
      if (!tripId) return;
      const collab = await api<TripCollab>(`${base(tripId)}/messages/${encodeURIComponent(messageId)}`, { method: "DELETE" });
      writes.current++;
      setState({ id: tripId, collab });
    },
    [tripId],
  );

  const vote = useCallback(
    async (target: CollabTarget, value: VoteValue | 0) => {
      if (!tripId || !user) return;
      const key = targetKey(target);
      const seq = ++voteSeq.current;
      setState((s) => {
        if (!s || s.id !== tripId) return s;
        const rest = s.collab.votes.filter((v) => !(v.userId === user.id && targetKey(v.target) === key));
        const mine: TripVote[] = value === 0 ? [] : [{ userId: user.id, name: user.name, target, value, updatedAt: new Date().toISOString() }];
        return { id: tripId, collab: { ...s.collab, votes: [...rest, ...mine] } };
      });
      const run = voteChain.current.then(() => api<TripCollab>(`${base(tripId)}/votes`, { method: "PUT", json: { kind: target.kind, id: target.id, value } }));
      voteChain.current = run.catch(() => undefined);
      try {
        const collab = await run;
        writes.current++;
        if (seq === voteSeq.current) setState({ id: tripId, collab });
      } catch (err) {
        console.error("XPMatch: saving a vote failed", err);
        if (seq === voteSeq.current) reload();
      }
    },
    [tripId, user, reload],
  );

  /** Loaded, or given up on: either way nothing more is coming for now. */
  const settled = !!current || (!!tripId && failedFor === tripId);
  return useMemo(() => ({ collab: current ?? EMPTY, loaded: !!current, settled, reload, post, remove, vote }), [current, settled, reload, post, remove, vote]);
}

/**
 * Keeps an open trip page current: every few seconds while the tab is visible (and right away
 * when it comes back), compares the trip's pulse and calls back with what changed.
 */
export function useTripPulse(tripId: string | null, onChange: (part: "trip" | "collab") => void, intervalMs = 8000) {
  const callback = useRef(onChange);
  useEffect(() => {
    callback.current = onChange;
  });
  useEffect(() => {
    if (!tripId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last: TripPulse | null = null;
    let inFlight = false;
    const tick = async () => {
      clearTimeout(timer);
      if (stopped) return;
      if (document.visibilityState === "visible" && !inFlight) {
        inFlight = true;
        try {
          const pulse = await api<TripPulse>(`${base(tripId)}/pulse`);
          if (last && !stopped) {
            if (pulse.trip !== last.trip) callback.current("trip");
            if (pulse.collab !== last.collab) callback.current("collab");
          }
          last = pulse;
        } catch (err) {
          // No longer on the trip: reloading it shows that, and there is nothing more to ask.
          if (err instanceof ApiError && err.status === 404) {
            stopped = true;
            callback.current("trip");
          }
          // Otherwise offline for a moment: keep trying quietly.
        } finally {
          inFlight = false;
        }
      }
      if (!stopped) timer = setTimeout(tick, intervalMs);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    void tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tripId, intervalMs]);
}

interface TripCollabValue extends ReturnType<typeof useTripCollabData> {
  trip: TripDetail;
  me: string | null;
  isOwner: boolean;
  /** Votes and comments show once someone else is on the trip. */
  shared: boolean;
  tallies: Map<string, VoteTally>;
  /** Comments per target key, oldest first. */
  comments: Map<string, TripMessage[]>;
}

const TripCollabContext = createContext<TripCollabValue | null>(null);

export function TripCollabProvider({ trip, data, children }: { trip: TripDetail; data: ReturnType<typeof useTripCollabData>; children: ReactNode }) {
  const { user } = useTravelStore();
  const me = user?.id ?? null;
  const { collab } = data;
  const value = useMemo<TripCollabValue>(() => {
    const comments = new Map<string, TripMessage[]>();
    for (const m of collab.messages) {
      if (!m.target) continue;
      const key = targetKey(m.target);
      comments.set(key, [...(comments.get(key) ?? []), m]);
    }
    return { ...data, trip, me, isOwner: trip.role === "owner", shared: trip.members.length > 1, tallies: tallyVotes(collab.votes, me), comments };
  }, [data, trip, me, collab]);
  return <TripCollabContext.Provider value={value}>{children}</TripCollabContext.Provider>;
}

/** Null outside a trip page (the board in a chat's sheet has no votes or comments). */
export function useTripCollab(): TripCollabValue | null {
  return useContext(TripCollabContext);
}

/* ------------------------- what is new in the discussion ------------------------- */

const SEEN_EVENT = "xp-talk-seen";
const seenKey = (tripId: string) => `xp-talk-seen:${tripId}`;

function readSeen(tripId: string): string {
  try {
    return window.localStorage.getItem(seenKey(tripId)) ?? "";
  } catch {
    return "";
  }
}

/** Remembers, in this browser, the newest message the traveler has had on screen. */
export function markDiscussionSeen(tripId: string, at: string) {
  try {
    if (readSeen(tripId) >= at) return;
    window.localStorage.setItem(seenKey(tripId), at);
    window.dispatchEvent(new Event(SEEN_EVENT));
  } catch {
    // Storage unavailable: everything stays "new", which is harmless.
  }
}

function subscribeSeen(callback: () => void) {
  window.addEventListener(SEEN_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SEEN_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Messages and comments from others since the traveler last had the discussion open. */
export function useUnseenCount(tripId: string, messages: TripMessage[], me: string | null): number {
  const seen = useSyncExternalStore(subscribeSeen, () => readSeen(tripId), () => "\uffff");
  return messages.filter((m) => m.userId !== me && m.createdAt > seen).length;
}
