"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ResolvedPlace } from "@/lib/places/types";
import type { MatchResult } from "@/lib/match";

/**
 * A destination card's recommendation set: the same profile-scored rows the Discover
 * picks use (things to do, stays, places to eat), loaded once per destination for the
 * session and shared by every card that names it.
 */

export type PickRowKey = "things" | "stays" | "eat";

export interface DestinationPickRow {
  key: PickRowKey;
  title: string;
  basedOn: string[];
  items: { place: ResolvedPlace; match: MatchResult }[];
}

export interface DestinationPicks {
  destination: ResolvedPlace;
  rows: DestinationPickRow[];
  provider: "google" | "fallback";
}

const cache = new Map<string, Promise<DestinationPicks>>();

export function loadDestinationPicks(query: string, fresh = false): Promise<DestinationPicks> {
  const key = query.trim().toLowerCase();
  if (!fresh) {
    const hit = cache.get(key);
    if (hit) return hit;
  }
  const request = api<DestinationPicks>(`/api/recs/home?destination=${encodeURIComponent(query.trim())}`).catch((err: unknown) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, request);
  return request;
}

/** The picks for `query`, or nothing while `query` is null (a card that has not asked yet). */
export function useDestinationPicks(query: string | null) {
  const [state, setState] = useState<{ query: string; picks: DestinationPicks | null; error: string | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const fresh = useRef(false);

  useEffect(() => {
    if (!query) return;
    let active = true;
    const wanted = query;
    const again = fresh.current;
    fresh.current = false;
    loadDestinationPicks(wanted, again)
      .then((picks) => active && setState({ query: wanted, picks, error: null }))
      .catch((err: unknown) => active && setState({ query: wanted, picks: null, error: err instanceof Error ? err.message : "Could not load recommendations" }));
    return () => {
      active = false;
    };
  }, [query, attempt]);

  const retry = useCallback(() => {
    fresh.current = true;
    setAttempt((n) => n + 1);
  }, []);

  const ready = !!query && state?.query === query;
  return {
    picks: ready ? state.picks : null,
    error: ready ? state.error : null,
    loading: !!query && !ready,
    retry,
  };
}
