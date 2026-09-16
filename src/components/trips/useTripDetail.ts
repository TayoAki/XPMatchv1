"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useTravelStore } from "@/lib/store";
import type { TripDetail } from "@/lib/types";

interface DetailState {
  id: string;
  trip: TripDetail | null;
  error: string | null;
}

/**
 * Loads a trip with its members, items and chats; `setTrip` applies server
 * responses from mutations. Any change to the trip made elsewhere in the app
 * (an "Add to trip" from a card, an edit in another component) bumps the
 * trip's `updatedAt` in the store, which reloads the detail here.
 */
export function useTripDetail(tripId: string | null | undefined) {
  const [state, setState] = useState<DetailState | null>(null);
  const [nonce, setNonce] = useState(0);
  const { trips } = useTravelStore();
  const updatedAt = tripId ? trips.find((t) => t.id === tripId)?.updatedAt ?? "" : "";

  useEffect(() => {
    if (!tripId) return;
    let active = true;
    const id = tripId;
    api<TripDetail>(`/api/trips/${encodeURIComponent(id)}`)
      .then((trip) => {
        if (active) setState({ id, trip, error: null });
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message =
          err instanceof ApiError && err.status === 404
            ? "This trip doesn't exist or you're not a member of it."
            : "Could not load this trip right now.";
        setState({ id, trip: null, error: message });
      });
    return () => {
      active = false;
    };
  }, [tripId, nonce, updatedAt]);

  const current = tripId && state?.id === tripId ? state : null;
  const setTrip = useCallback((trip: TripDetail) => setState({ id: trip.id, trip, error: null }), []);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    trip: current?.trip ?? null,
    error: current?.error ?? null,
    loading: !!tripId && !current,
    setTrip,
    reload,
  };
}
