"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import type { ItineraryDraft } from "@/server/itineraries";

/**
 * The itineraries saved from a chat's destination cards (see `src/server/chat-plans.ts`), loaded
 * once per chat for the session and shared by every card in it. A card shows its saved plan, when
 * it has one, instead of building a new one.
 */

export interface SavedPlan {
  key: string;
  tripId: string;
  draft: ItineraryDraft;
  updatedAt: string;
}

type Entry = { ready: false } | { ready: true; plans: Record<string, SavedPlan> };

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
const LOADING: Entry = { ready: false };
const NONE: Entry = { ready: true, plans: {} };

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const fetchPlans = (threadId: string) => api<{ plans: SavedPlan[] }>(`/api/chats/${encodeURIComponent(threadId)}/plans`);

function load(threadId: string) {
  if (entries.has(threadId)) return;
  entries.set(threadId, LOADING);
  fetchPlans(threadId)
    // One more try after a moment: a chat that has a saved plan must not come up with a fresh one.
    .catch(() => new Promise((r) => setTimeout(r, 1500)).then(() => fetchPlans(threadId)))
    .then((res) => entries.set(threadId, { ready: true, plans: Object.fromEntries(res.plans.map((p) => [p.key, p])) }))
    // Still unreadable: the chat's cards show fresh plans for this session.
    .catch(() => entries.set(threadId, NONE))
    .finally(emit);
}

/** The chat's saved plans by card key; `ready` is false until they are known (a card waits before building a new plan). */
export function useChatPlans(threadId: string | null): Entry {
  useEffect(() => {
    if (threadId) load(threadId);
  }, [threadId]);
  return useSyncExternalStore(
    subscribe,
    () => (threadId ? entries.get(threadId) ?? LOADING : LOADING),
    () => LOADING,
  );
}

/** Saves one card's plan with the trip it was saved as; call `rememberChatPlan` with the result. */
export async function putChatPlan(threadId: string, key: string, tripId: string, draft: ItineraryDraft): Promise<SavedPlan> {
  const res = await api<{ plan: SavedPlan }>(`/api/chats/${encodeURIComponent(threadId)}/plans`, { method: "PUT", json: { key, tripId, draft } });
  return res.plan;
}

/** Makes a just-saved plan the chat's saved plan for its card, for every card showing it. */
export function rememberChatPlan(threadId: string, plan: SavedPlan) {
  const entry = entries.get(threadId);
  const plans = entry?.ready ? entry.plans : {};
  entries.set(threadId, { ready: true, plans: { ...plans, [plan.key]: plan } });
  emit();
}
