"use client";

import { useMemo, useSyncExternalStore } from "react";

export type BudgetTier = "budget" | "mid-range" | "premium" | "luxury";
export type Pace = "relaxed" | "balanced" | "packed";
export type Companions = "solo" | "partner" | "family" | "friends" | "mixed";

export interface TravelerProfile {
  name: string;
  homeCity: string;
  homeAirport: string;
  travelStyles: string[];
  pace: Pace;
  budgetTier: BudgetTier;
  companions: Companions;
  dietary: string;
  accommodation: string;
  notes: string;
  onboarded: boolean;
}

export interface TripPlanner {
  where: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budgetTier: BudgetTier | "";
}

export type SavedKind = "destination" | "hotel" | "flight" | "restaurant" | "attraction";

export interface SavedItem {
  id: string;
  kind: SavedKind;
  title: string;
  subtitle?: string;
  destination?: string;
  url?: string;
  savedAt: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  items: string[];
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  travelers?: number;
  budgetTier?: string;
  summary?: string;
  itinerary: ItineraryDay[];
  createdAt: string;
}

export interface ChatSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateItem {
  id: string;
  kind: "trip" | "profile" | "saved" | "system";
  text: string;
  at: string;
  read: boolean;
}

export interface TravelStoreState {
  profile: TravelerProfile;
  planner: TripPlanner;
  saved: SavedItem[];
  trips: Trip[];
  chats: ChatSummary[];
  updates: UpdateItem[];
  proactiveDismissedAt: string | null;
}

export const DEFAULT_PROFILE: TravelerProfile = {
  name: "",
  homeCity: "",
  homeAirport: "",
  travelStyles: [],
  pace: "balanced",
  budgetTier: "mid-range",
  companions: "partner",
  dietary: "",
  accommodation: "",
  notes: "",
  onboarded: false,
};

export const DEFAULT_PLANNER: TripPlanner = {
  where: "",
  startDate: "",
  endDate: "",
  travelers: 2,
  budgetTier: "",
};

const DEFAULT_STATE: TravelStoreState = {
  profile: DEFAULT_PROFILE,
  planner: DEFAULT_PLANNER,
  saved: [],
  trips: [],
  chats: [],
  updates: [],
  proactiveDismissedAt: null,
};

const STORAGE_KEY = "xpmatch:store:v1";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadState(): TravelStoreState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<TravelStoreState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      profile: { ...DEFAULT_PROFILE, ...(parsed.profile ?? {}) },
      planner: { ...DEFAULT_PLANNER, ...(parsed.planner ?? {}) },
      saved: parsed.saved ?? [],
      trips: parsed.trips ?? [],
      chats: parsed.chats ?? [],
      updates: parsed.updates ?? [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

/* ------------------------------------------------------------------ */
/* External store: a single in-memory state mirrored to localStorage.  */
/* Components subscribe with useSyncExternalStore, which keeps server  */
/* rendering and hydration consistent (server snapshot = defaults).    */
/* ------------------------------------------------------------------ */

let currentState: TravelStoreState = DEFAULT_STATE;
let loaded = false;
const listeners = new Set<() => void>();
let storageListenerAttached = false;

function readSnapshot(): TravelStoreState {
  if (!loaded && typeof window !== "undefined") {
    currentState = loadState();
    loaded = true;
  }
  return currentState;
}

function getServerSnapshot(): TravelStoreState {
  return DEFAULT_STATE;
}

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!storageListenerAttached && typeof window !== "undefined") {
    storageListenerAttached = true;
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) {
        currentState = loadState();
        notify();
      }
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

function commit(updater: (prev: TravelStoreState) => TravelStoreState) {
  currentState = updater(readSnapshot());
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
  } catch {
    // Storage can be unavailable (private mode, quota). The app keeps working in memory.
  }
  notify();
}

function withUpdate(prev: TravelStoreState, update: Omit<UpdateItem, "id" | "at" | "read">): UpdateItem[] {
  return [{ id: newId(), at: new Date().toISOString(), read: false, ...update }, ...prev.updates].slice(0, 50);
}

const sameTitle = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export const travelActions = {
  getPlanner(): TripPlanner {
    return readSnapshot().planner;
  },
  updateProfile(patch: Partial<TravelerProfile>) {
    commit((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...patch },
      updates: withUpdate(prev, { kind: "profile", text: "Your travel preferences were updated." }),
    }));
  },
  updatePlanner(patch: Partial<TripPlanner>) {
    commit((prev) => ({ ...prev, planner: { ...prev.planner, ...patch } }));
  },
  isSaved(kind: SavedKind, title: string): boolean {
    return readSnapshot().saved.some((s) => s.kind === kind && sameTitle(s.title, title));
  },
  /** Adds or removes an item; returns true when the item is now saved. */
  toggleSaved(item: Omit<SavedItem, "id" | "savedAt">): boolean {
    const already = travelActions.isSaved(item.kind, item.title);
    commit((prev) =>
      already
        ? { ...prev, saved: prev.saved.filter((s) => !(s.kind === item.kind && sameTitle(s.title, item.title))) }
        : {
            ...prev,
            saved: [{ ...item, id: newId(), savedAt: new Date().toISOString() }, ...prev.saved],
            updates: withUpdate(prev, { kind: "saved", text: `Saved ${item.title} to your collection.` }),
          },
    );
    return !already;
  },
  removeSaved(id: string) {
    commit((prev) => ({ ...prev, saved: prev.saved.filter((s) => s.id !== id) }));
  },
  addTrip(trip: Omit<Trip, "id" | "createdAt">): Trip {
    const created: Trip = { ...trip, id: newId(), createdAt: new Date().toISOString() };
    commit((prev) => ({
      ...prev,
      trips: [created, ...prev.trips],
      updates: withUpdate(prev, { kind: "trip", text: `Trip created: ${created.title}.` }),
    }));
    return created;
  },
  removeTrip(id: string) {
    commit((prev) => ({ ...prev, trips: prev.trips.filter((t) => t.id !== id) }));
  },
  upsertChat(chat: { id: string; title?: string }) {
    commit((prev) => {
      const now = new Date().toISOString();
      const existing = prev.chats.find((c) => c.id === chat.id);
      if (existing) {
        const next = prev.chats.map((c) => (c.id === chat.id ? { ...c, title: chat.title ?? c.title, updatedAt: now } : c));
        next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        return { ...prev, chats: next };
      }
      return {
        ...prev,
        chats: [{ id: chat.id, title: chat.title ?? "New chat", createdAt: now, updatedAt: now }, ...prev.chats],
      };
    });
  },
  removeChat(id: string) {
    commit((prev) => ({ ...prev, chats: prev.chats.filter((c) => c.id !== id) }));
  },
  addUpdate(update: Omit<UpdateItem, "id" | "at" | "read">) {
    commit((prev) => ({ ...prev, updates: withUpdate(prev, update) }));
  },
  markUpdatesRead() {
    commit((prev) => ({ ...prev, updates: prev.updates.map((u) => ({ ...u, read: true })) }));
  },
  dismissProactive() {
    commit((prev) => ({ ...prev, proactiveDismissedAt: new Date().toISOString() }));
  },
  resetAll() {
    commit(() => DEFAULT_STATE);
  },
};

export type TravelActions = typeof travelActions;

export interface TravelStoreValue extends TravelStoreState, TravelActions {
  hydrated: boolean;
}

const alwaysTrue = () => true;
const alwaysFalse = () => false;

export function useTravelStore(): TravelStoreValue {
  const state = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(subscribe, alwaysTrue, alwaysFalse);
  return useMemo(() => ({ ...state, ...travelActions, hydrated }), [state, hydrated]);
}

/** Small date helpers shared by the UI. */
export function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) return "";
  const fmt = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt((start || end) as string);
}

export function firstName(profile: TravelerProfile): string {
  return profile.name.trim().split(/\s+/)[0] ?? "";
}
