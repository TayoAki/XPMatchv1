"use client";

import { useMemo, useSyncExternalStore } from "react";
import { api, ApiError } from "@/lib/api";
import type { ResolvedPlace } from "@/lib/places/types";
import {
  DEFAULT_PLANNER,
  DEFAULT_PROFILE,
  type ChatSummary,
  type Guide,
  type LearnedPreference,
  type PreferenceDomain,
  type PreferencePolarity,
  type PreferenceSource,
  type SavedItem,
  type SavedKind,
  type SessionUser,
  type TravelerProfile,
  type Trip,
  type TripDetail,
  type TripItemKind,
  type TripPlanner,
  type UpdateItem,
  type UserState,
} from "@/lib/types";

export type {
  BudgetTier,
  ChatSummary,
  Companions,
  ItineraryDay,
  LearnedPreference,
  Pace,
  PreferenceDomain,
  PreferencePolarity,
  PreferenceSource,
  SavedItem,
  SavedKind,
  SessionUser,
  TravelerProfile,
  Trip,
  TripDetail,
  TripItem,
  TripItemKind,
  TripMember,
  TripPlanner,
  UpdateItem,
} from "@/lib/types";
export { DEFAULT_PLANNER, DEFAULT_PROFILE, DEALBREAKER_OPTIONS, DOMAIN_LABEL } from "@/lib/types";

export interface NewPreference {
  statement: string;
  domain: PreferenceDomain;
  polarity: PreferencePolarity;
  source?: PreferenceSource;
  tripId?: string | null;
}

/** Fields of a trip that members can edit. `null` clears a date. */
export type TripPatch = Partial<Pick<Trip, "title" | "destination" | "itinerary" | "preferences">> & {
  startDate?: string | null;
  endDate?: string | null;
  travelers?: number | null;
  budgetTier?: string | null;
  summary?: string | null;
};

export interface NewTripItem {
  kind: TripItemKind;
  title: string;
  note?: string;
  url?: string;
  place?: ResolvedPlace;
}

/** The list view only needs the summary fields of a trip. */
function toTripSummary(detail: TripDetail): Trip {
  const { id, ownerId, role, title, destination, place, startDate, endDate, travelers, budgetTier, summary, itinerary, preferences, memberCount, createdAt, updatedAt } = detail;
  return { id, ownerId, role, title, destination, place, startDate, endDate, travelers, budgetTier, summary, itinerary, preferences, memberCount, createdAt, updatedAt };
}

/**
 * Client store for the signed-in user's data. Server state (profile, saved
 * items, trips, chats, updates) is hydrated from /api/me/state and every
 * mutation writes through to the API optimistically. Only the trip planner
 * values and small UI preferences stay in localStorage.
 */

export interface TravelStoreState {
  user: SessionUser | null;
  profile: TravelerProfile;
  planner: TripPlanner;
  saved: SavedItem[];
  trips: Trip[];
  chats: ChatSummary[];
  updates: UpdateItem[];
  preferences: LearnedPreference[];
  proactiveDismissedAt: string | null;
  hydrated: boolean;
}

const LOCAL_KEY = "xpmatch:local:v2";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const DEFAULT_STATE: TravelStoreState = {
  user: null,
  profile: DEFAULT_PROFILE,
  planner: DEFAULT_PLANNER,
  saved: [],
  trips: [],
  chats: [],
  updates: [],
  preferences: [],
  proactiveDismissedAt: null,
  hydrated: false,
};

let state: TravelStoreState = DEFAULT_STATE;
let localLoaded = false;
const listeners = new Set<() => void>();

function loadLocal(): Pick<TravelStoreState, "planner" | "proactiveDismissedAt"> {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return { planner: DEFAULT_PLANNER, proactiveDismissedAt: null };
    const parsed = JSON.parse(raw) as Partial<Pick<TravelStoreState, "planner" | "proactiveDismissedAt">>;
    return {
      planner: { ...DEFAULT_PLANNER, ...(parsed.planner ?? {}) },
      proactiveDismissedAt: parsed.proactiveDismissedAt ?? null,
    };
  } catch {
    return { planner: DEFAULT_PLANNER, proactiveDismissedAt: null };
  }
}

function persistLocal() {
  try {
    window.localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify({ planner: state.planner, proactiveDismissedAt: state.proactiveDismissedAt }),
    );
  } catch {
    // Storage may be unavailable; the app keeps working in memory.
  }
}

function readSnapshot(): TravelStoreState {
  if (!localLoaded && typeof window !== "undefined") {
    localLoaded = true;
    state = { ...state, ...loadLocal() };
  }
  return state;
}

const getServerSnapshot = () => DEFAULT_STATE;

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function set(patch: Partial<TravelStoreState> | ((prev: TravelStoreState) => Partial<TravelStoreState>)) {
  const prev = readSnapshot();
  const next = typeof patch === "function" ? patch(prev) : patch;
  state = { ...prev, ...next };
  if ("planner" in next || "proactiveDismissedAt" in next) persistLocal();
  emit();
}

const sameTitle = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Finds the saved item matching a place: by Google place id when both sides
 * know it (same-named places stay distinct), otherwise by kind + title.
 */
export function findSaved(saved: SavedItem[], probe: { kind: SavedKind; title: string; refId?: string }): SavedItem | undefined {
  return saved.find((s) => s.kind === probe.kind && (probe.refId && s.refId ? s.refId === probe.refId : sameTitle(s.title, probe.title)));
}

function report(action: string, err: unknown) {
  console.error(`XPMatch: ${action} failed`, err);
}

let hydration: Promise<void> | null = null;

export const travelActions = {
  getState: () => readSnapshot(),
  getPlanner: () => readSnapshot().planner,

  /** Loads the signed-in user's data. Resolves even when signed out (user stays null). */
  hydrate(force = false): Promise<void> {
    if (hydration && !force) return hydration;
    hydration = (async () => {
      try {
        const data = await api<UserState>("/api/me/state");
        set({
          user: data.user,
          profile: { ...DEFAULT_PROFILE, ...data.profile, name: data.profile.name || data.user.name },
          saved: data.saved,
          trips: data.trips,
          chats: data.chats,
          updates: data.updates,
          preferences: data.preferences ?? [],
          hydrated: true,
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          set({ ...DEFAULT_STATE, planner: readSnapshot().planner, hydrated: true });
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            // Full navigation on purpose: it resets all client state for the next user.
            window.location.assign(new URL(`/login?next=${next}`, window.location.origin).href);
          }
          return;
        }
        report("loading your data", err);
        set({ hydrated: true });
      }
    })();
    return hydration;
  },

  updateProfile(patch: Partial<TravelerProfile>) {
    const prev = readSnapshot();
    const profile = { ...prev.profile, ...patch };
    set({
      profile,
      user: prev.user && patch.name?.trim() ? { ...prev.user, name: patch.name.trim() } : prev.user,
    });
    api("/api/me/profile", { method: "PUT", json: profile }).catch((err) => report("saving preferences", err));
  },

  updatePlanner(patch: Partial<TripPlanner>) {
    set((prev) => ({ planner: { ...prev.planner, ...patch } }));
  },

  /** Stores a learned preference (optimistically) and resolves with the saved row. */
  async addPreference(input: NewPreference): Promise<LearnedPreference> {
    const prev = readSnapshot();
    const statement = input.statement.trim();
    const tripId = input.tripId ?? undefined;
    const existing = prev.preferences.find((p) => sameTitle(p.statement, statement) && (p.tripId ?? undefined) === tripId);
    if (existing && existing.polarity === input.polarity && existing.domain === input.domain) return existing;
    const tempId = `temp-${newId()}`;
    const optimistic: LearnedPreference = {
      id: existing?.id ?? tempId,
      tripId,
      domain: input.domain,
      polarity: input.polarity,
      statement,
      source: input.source ?? "chat",
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    set({ preferences: [optimistic, ...prev.preferences.filter((p) => p.id !== optimistic.id)] });
    try {
      const created = await api<LearnedPreference>("/api/me/preferences", {
        method: "POST",
        json: { statement, domain: input.domain, polarity: input.polarity, source: input.source ?? "chat", tripId: tripId ?? null },
      });
      set((s) => ({ preferences: [created, ...s.preferences.filter((p) => p.id !== optimistic.id && p.id !== created.id)] }));
      return created;
    } catch (err) {
      report("saving a preference", err);
      set((s) => ({ preferences: existing ? s.preferences.map((p) => (p.id === existing.id ? existing : p)) : s.preferences.filter((p) => p.id !== tempId) }));
      throw err;
    }
  },

  removePreference(id: string) {
    const prev = readSnapshot();
    const item = prev.preferences.find((p) => p.id === id);
    if (!item) return;
    set({ preferences: prev.preferences.filter((p) => p.id !== id) });
    if (id.startsWith("temp-")) return;
    api(`/api/me/preferences/${encodeURIComponent(id)}`, { method: "DELETE" }).catch((err) => {
      report("removing a preference", err);
      set((s) => ({ preferences: [item, ...s.preferences] }));
    });
  },

  isSaved(kind: SavedKind, title: string, refId?: string): boolean {
    return !!findSaved(readSnapshot().saved, { kind, title, refId });
  },

  /** Adds or removes an item; returns true when the item is now saved. */
  toggleSaved(item: Omit<SavedItem, "id" | "savedAt">): boolean {
    const prev = readSnapshot();
    const existing = findSaved(prev.saved, { kind: item.kind, title: item.title, refId: item.refId ?? item.place?.id });
    if (existing) {
      set({ saved: prev.saved.filter((s) => s.id !== existing.id) });
      api(`/api/saved/${encodeURIComponent(existing.id)}`, { method: "DELETE" }).catch((err) => {
        report("removing a saved item", err);
        set((s) => ({ saved: [existing, ...s.saved] }));
      });
      return false;
    }
    const tempId = `temp-${newId()}`;
    const optimistic: SavedItem = { ...item, refId: item.refId ?? item.place?.id, id: tempId, savedAt: new Date().toISOString() };
    set({ saved: [optimistic, ...prev.saved] });
    api<SavedItem>("/api/saved", { method: "POST", json: item })
      .then((created) => set((s) => ({ saved: s.saved.map((x) => (x.id === tempId ? created : x)) })))
      .catch((err) => {
        report("saving an item", err);
        set((s) => ({ saved: s.saved.filter((x) => x.id !== tempId) }));
      });
    return true;
  },

  isGuideSaved(guideId: string): boolean {
    return readSnapshot().saved.some((s) => s.kind === "guide" && s.refId === guideId);
  },

  /** Saves or unsaves a community guide; returns true when the guide is now saved. */
  toggleGuideSaved(guide: Guide): boolean {
    const prev = readSnapshot();
    const existing = prev.saved.find((s) => s.kind === "guide" && s.refId === guide.id);
    const path = `/api/guides/${encodeURIComponent(guide.id)}/save`;
    if (existing) {
      set({ saved: prev.saved.filter((s) => s.id !== existing.id) });
      api(path, { method: "DELETE" }).catch((err) => {
        report("removing a saved guide", err);
        set((s) => ({ saved: [existing, ...s.saved] }));
      });
      return false;
    }
    const tempId = `temp-${newId()}`;
    const optimistic: SavedItem = {
      id: tempId,
      kind: "guide",
      refId: guide.id,
      title: guide.title,
      subtitle: `${guide.destination} · by @${guide.authorHandle}`,
      destination: guide.destination,
      url: `/guides/${guide.id}`,
      place: guide.place,
      savedAt: new Date().toISOString(),
    };
    set({ saved: [optimistic, ...prev.saved] });
    api<{ saved: SavedItem | null }>(path, { method: "POST", json: {} })
      .then((res) => set((s) => ({ saved: s.saved.map((x) => (x.id === tempId ? res.saved ?? x : x)) })))
      .catch((err) => {
        report("saving a guide", err);
        set((s) => ({ saved: s.saved.filter((x) => x.id !== tempId) }));
      });
    return true;
  },

  removeSaved(id: string) {
    const prev = readSnapshot();
    const item = prev.saved.find((s) => s.id === id);
    set({ saved: prev.saved.filter((s) => s.id !== id) });
    api(`/api/saved/${encodeURIComponent(id)}`, { method: "DELETE" }).catch((err) => {
      report("removing a saved item", err);
      if (item) set((s) => ({ saved: [item, ...s.saved] }));
    });
  },

  async addTrip(
    trip: Pick<Trip, "title" | "destination"> &
      Partial<Pick<Trip, "startDate" | "endDate" | "travelers" | "budgetTier" | "summary" | "itinerary" | "place">>,
  ): Promise<Trip> {
    const created = await api<Trip>("/api/trips", { method: "POST", json: trip });
    set((prev) => ({ trips: [created, ...prev.trips.filter((t) => t.id !== created.id)] }));
    return created;
  },

  replaceTrip(trip: Trip) {
    set((prev) => ({ trips: prev.trips.some((t) => t.id === trip.id) ? prev.trips.map((t) => (t.id === trip.id ? trip : t)) : [trip, ...prev.trips] }));
  },

  removeTrip(id: string) {
    const prev = readSnapshot();
    const trip = prev.trips.find((t) => t.id === id);
    set({ trips: prev.trips.filter((t) => t.id !== id) });
    api(`/api/trips/${encodeURIComponent(id)}`, { method: "DELETE" }).catch((err) => {
      report("deleting a trip", err);
      if (trip) set((s) => ({ trips: [trip, ...s.trips] }));
    });
  },

  /** Edits trip fields on the server; resolves with the full trip detail. */
  async patchTrip(id: string, patch: TripPatch): Promise<TripDetail> {
    const detail = await api<TripDetail>(`/api/trips/${encodeURIComponent(id)}`, { method: "PATCH", json: patch });
    travelActions.replaceTrip(toTripSummary(detail));
    return detail;
  },

  async addTripItem(id: string, item: NewTripItem): Promise<TripDetail> {
    const detail = await api<TripDetail>(`/api/trips/${encodeURIComponent(id)}/items`, { method: "POST", json: item });
    travelActions.replaceTrip(toTripSummary(detail));
    return detail;
  },

  async removeTripItem(id: string, itemId: string): Promise<TripDetail> {
    const detail = await api<TripDetail>(`/api/trips/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`, { method: "DELETE" });
    travelActions.replaceTrip(toTripSummary(detail));
    return detail;
  },

  async addTripMember(id: string, email: string, role: "editor" | "viewer" = "editor"): Promise<TripDetail> {
    const detail = await api<TripDetail>(`/api/trips/${encodeURIComponent(id)}/members`, { method: "POST", json: { email, role } });
    travelActions.replaceTrip(toTripSummary(detail));
    return detail;
  },

  /** Removes a member. Resolves with null when the signed-in user left the trip. */
  async removeTripMember(id: string, userId: string): Promise<TripDetail | null> {
    const detail = await api<TripDetail | null>(`/api/trips/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, { method: "DELETE" });
    if (detail) travelActions.replaceTrip(toTripSummary(detail));
    else set((prev) => ({ trips: prev.trips.filter((t) => t.id !== id) }));
    return detail;
  },

  upsertChat(chat: { id: string; title?: string; tripId?: string }) {
    const prev = readSnapshot();
    if (!prev.user) return;
    const now = new Date().toISOString();
    const existing = prev.chats.find((c) => c.id === chat.id);
    if (existing && (chat.title === undefined || chat.title === existing.title) && chat.tripId === undefined) {
      // Only a "touch": bump ordering locally, no request needed.
      set({ chats: [{ ...existing, updatedAt: now }, ...prev.chats.filter((c) => c.id !== chat.id)] });
      return;
    }
    const next: ChatSummary = {
      id: chat.id,
      title: chat.title ?? existing?.title ?? "New chat",
      tripId: chat.tripId ?? existing?.tripId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    set({ chats: [next, ...prev.chats.filter((c) => c.id !== chat.id)] });
    api(`/api/chats/${encodeURIComponent(chat.id)}`, { method: "PUT", json: { title: next.title, tripId: next.tripId } }).catch(
      (err) => report("saving the chat", err),
    );
  },

  removeChat(id: string) {
    set((prev) => ({ chats: prev.chats.filter((c) => c.id !== id) }));
    api(`/api/chats/${encodeURIComponent(id)}`, { method: "DELETE" }).catch((err) => report("removing the chat", err));
  },

  markUpdatesRead() {
    const prev = readSnapshot();
    if (!prev.updates.some((u) => !u.read)) return;
    set({ updates: prev.updates.map((u) => ({ ...u, read: true })) });
    api("/api/notifications/read", { method: "POST", json: {} }).catch((err) => report("marking updates read", err));
  },

  dismissProactive() {
    set({ proactiveDismissedAt: new Date().toISOString() });
  },

  async logout() {
    try {
      await api("/api/auth/logout", { method: "POST", json: {} });
    } catch (err) {
      report("logging out", err);
    }
    hydration = null;
    state = { ...DEFAULT_STATE, hydrated: true };
    emit();
    if (typeof window !== "undefined") window.location.assign(new URL("/login", window.location.origin).href);
  },
};

export type TravelActions = typeof travelActions;

export interface TravelStoreValue extends TravelStoreState, TravelActions {}

export function useTravelStore(): TravelStoreValue {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);
  return useMemo(() => ({ ...snapshot, ...travelActions }), [snapshot]);
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
