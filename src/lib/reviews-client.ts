"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import type { PlaceFeedback, TasteProfile } from "@/lib/feedback/types";
import type { PlaceReviews } from "@/lib/reviews";

/**
 * Traveler reviews per place, shared by everything that shows them (the overview's line and the
 * Reviews tab of the same panel) so one request serves both. Reloaded when a panel opens and the
 * copy is more than a minute old, and replaced by what a write returns.
 */

interface Entry {
  data: PlaceReviews | null;
  error: string | null;
  loading: boolean;
  at: number;
}

const EMPTY: Entry = { data: null, error: null, loading: false, at: 0 };
const STALE_MS = 60_000;
const entries = new Map<string, Entry>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const url = (placeId: string) => `/api/places/${encodeURIComponent(placeId)}/reviews`;

function load(placeId: string) {
  const current = entries.get(placeId);
  if (inflight.has(placeId) || (current?.data && Date.now() - current.at < STALE_MS)) return;
  entries.set(placeId, { ...(current ?? EMPTY), loading: true });
  emit();
  const run = api<PlaceReviews>(url(placeId))
    .then((data) => {
      entries.set(placeId, { data, error: null, loading: false, at: Date.now() });
    })
    .catch((err: unknown) => {
      entries.set(placeId, { data: entries.get(placeId)?.data ?? null, error: err instanceof Error ? err.message : "Couldn't load reviews", loading: false, at: Date.now() });
    })
    .finally(() => {
      inflight.delete(placeId);
      emit();
    });
  inflight.set(placeId, run);
}

export function setPlaceReviews(placeId: string, data: PlaceReviews) {
  entries.set(placeId, { data, error: null, loading: false, at: Date.now() });
  emit();
}

/** The reviews of a place (null id: nothing to load, e.g. a place that is only an estimate). */
export function usePlaceReviews(placeId: string | null): Entry {
  const entry = useSyncExternalStore(subscribe, () => (placeId ? (entries.get(placeId) ?? EMPTY) : EMPTY), () => EMPTY);
  useEffect(() => {
    if (placeId) load(placeId);
  }, [placeId]);
  return entry;
}

export interface ReviewDraft {
  name: string;
  kind: "hotel" | "restaurant" | "attraction";
  destination?: string;
  place?: unknown;
  verdict: "loved" | "fine" | "disliked";
  text: string;
  shared: boolean;
}

export async function postReview(placeId: string, draft: ReviewDraft): Promise<PlaceReviews & { feedback: PlaceFeedback | null; taste: TasteProfile }> {
  const res = await api<PlaceReviews & { feedback: PlaceFeedback | null; taste: TasteProfile }>(url(placeId), { method: "POST", json: draft });
  setPlaceReviews(placeId, res);
  return res;
}

export async function removeReview(placeId: string): Promise<void> {
  setPlaceReviews(placeId, await api<PlaceReviews>(url(placeId), { method: "DELETE" }));
}

/** One location reading from the browser, checked against the place on the server. */
export function checkInHere(placeId: string): Promise<{ proof: "checked_in"; at: string; distanceM: number; name: string }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("This browser can't share its location."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        api<{ proof: "checked_in"; at: string; distanceM: number; name: string }>(`/api/places/${encodeURIComponent(placeId)}/checkin`, {
          method: "POST",
          json: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy },
        })
          .then((res) => {
            const entry = entries.get(placeId);
            if (entry?.data) setPlaceReviews(placeId, { ...entry.data, myProof: "checked_in" });
            resolve(res);
          })
          .catch(reject);
      },
      (err) => reject(new Error(err.code === err.PERMISSION_DENIED ? "Location is off for XPMatch. Allow it in your browser to check in." : "Couldn't read your location. Try again.")),
      // A fresh reading: one from before they walked in would not prove they are there now.
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}
