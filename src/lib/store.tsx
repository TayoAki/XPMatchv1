"use client";

import { useMemo, useSyncExternalStore } from "react";
import { api, ApiError } from "@/lib/api";
import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { feedbackKey, type FeedbackSource, type FeedbackVerdict, type PlaceFeedback, type TasteProfile } from "@/lib/feedback/types";
import type { Reservation } from "@/lib/reservations/types";
import type { RecContext, RecFeedback, RecVerdict } from "@/lib/recs/types";
import { recKey, type MatchFactor } from "@/lib/match";
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
  ItineraryStop,
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
  /** Structured reservation for bookings read from a confirmation. */
  details?: Reservation;
}

/** A reaction to a place; the same place gets one row that later reactions replace. */
export interface NewFeedback {
  placeId?: string;
  name: string;
  kind: PlaceKind;
  destination?: string;
  place?: ResolvedPlace;
  verdict: FeedbackVerdict;
  reasons?: string[];
  note?: string;
  tripId?: string | null;
  source?: FeedbackSource;
  /** Omit to keep the stored score, null to clear it. */
  score?: number | null;
}

/** Thumbs up / down on a recommendation, with the match factors that were shown. */
export interface NewRecFeedback {
  placeId?: string;
  name: string;
  kind: PlaceKind;
  destination?: string;
  place?: ResolvedPlace | null;
  context: RecContext;
  verdict: RecVerdict;
  score?: number | null;
  factors: string[];
  reason?: string | null;
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
  feedback: PlaceFeedback[];
  taste: TasteProfile | null;
  recFeedback: RecFeedback[];
  /** Per-factor weights learned from packages (kept vs swapped), applied on top of the thumbs calibration. */
  packageCalibration: Partial<Record<MatchFactor, number>>;
  proactiveDismissedAt: string | null;
  /**
   * The planner values were set outside a chat (the Discover fields, the Create a trip dialog on
   * another page): the next new chat starts from them. Otherwise a new chat starts over.
   */
  plannerDraft: boolean;
  hydrated: boolean;
  /** True while a profile save is in flight; the home picks wait for it so they reflect the new answers. */
  profileSaving: boolean;
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
  feedback: [],
  taste: null,
  recFeedback: [],
  packageCalibration: {},
  proactiveDismissedAt: null,
  plannerDraft: false,
  hydrated: false,
  profileSaving: false,
};

let state: TravelStoreState = DEFAULT_STATE;
let localLoaded = false;
const listeners = new Set<() => void>();
/** Whether a chat is on screen: planner values set there belong to that chat, not to the next one. */
let chatOnScreen = false;

/**
 * Version of what is kept in local storage. Before 2, focusing the map wrote the chat's destination
 * into the planner's Where, so it followed the traveler into every new chat; that Where cannot be
 * told apart from one the traveler set, so it is dropped once.
 */
const LOCAL_VERSION = 2;

type LocalState = Pick<TravelStoreState, "planner" | "proactiveDismissedAt" | "plannerDraft">;

function loadLocal(): LocalState {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return { planner: DEFAULT_PLANNER, proactiveDismissedAt: null, plannerDraft: false };
    const parsed = JSON.parse(raw) as Partial<Pick<TravelStoreState, "planner" | "proactiveDismissedAt">> & { v?: number; draft?: boolean };
    const planner = { ...DEFAULT_PLANNER, ...(parsed.planner ?? {}) };
    if (parsed.v !== LOCAL_VERSION) planner.where = "";
    return { planner, proactiveDismissedAt: parsed.proactiveDismissedAt ?? null, plannerDraft: parsed.draft === true };
  } catch {
    return { planner: DEFAULT_PLANNER, proactiveDismissedAt: null, plannerDraft: false };
  }
}

function persistLocal() {
  try {
    window.localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify({ v: LOCAL_VERSION, planner: state.planner, draft: state.plannerDraft, proactiveDismissedAt: state.proactiveDismissedAt }),
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
  if ("planner" in next || "plannerDraft" in next || "proactiveDismissedAt" in next) persistLocal();
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

/** Thumbs writes for the same place run one after another (a quick thumbs-down followed by its reason must land in that order). */
const recQueues = new Map<string, Promise<unknown>>();
/** Reaction writes for the same place, likewise: "Loved it" and the reason chip tapped next. */
const feedbackQueues = new Map<string, Promise<unknown>>();

async function writeRecFeedback(placeId: string, input: NewRecFeedback): Promise<RecFeedback> {
  const prev = readSnapshot();
  const existing = prev.recFeedback.find((f) => f.placeId === placeId);
  const now = new Date().toISOString();
  const optimistic: RecFeedback = {
    id: existing?.id ?? `temp-${newId()}`,
    placeId,
    kind: input.kind,
    name: input.name,
    destination: input.destination ?? existing?.destination,
    context: input.context,
    verdict: input.verdict,
    score: input.score ?? undefined,
    factors: input.factors,
    reason: input.reason ?? undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  set({ recFeedback: [optimistic, ...prev.recFeedback.filter((f) => f.placeId !== placeId)] });
  try {
    const res = await api<{ recFeedback: RecFeedback }>("/api/me/recs", {
      method: "POST",
      json: { placeId, name: input.name, kind: input.kind, destination: input.destination, context: input.context, verdict: input.verdict, score: input.score ?? null, factors: input.factors, reason: input.reason ?? null },
    });
    set((s) => ({ recFeedback: [res.recFeedback, ...s.recFeedback.filter((f) => f.placeId !== placeId)] }));
    return res.recFeedback;
  } catch (err) {
    report("saving your thumbs", err);
    set((s) => ({ recFeedback: existing ? s.recFeedback.map((f) => (f.placeId === placeId ? existing : f)) : s.recFeedback.filter((f) => f.placeId !== placeId) }));
    throw err;
  }
}

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
          feedback: data.feedback ?? [],
          taste: data.taste ?? null,
          recFeedback: data.recFeedback ?? [],
          packageCalibration: (data.packageCalibration ?? {}) as Partial<Record<MatchFactor, number>>,
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
      profileSaving: true,
    });
    // keepalive: finishing onboarding and leaving the page at once must not drop the save.
    api("/api/me/profile", { method: "PUT", json: profile, keepalive: true })
      .catch((err) => report("saving preferences", err))
      .finally(() => set({ profileSaving: false }));
  },

  /** Values set with a chat on screen belong to that chat; values set anywhere else wait for the next chat. */
  updatePlanner(patch: Partial<TripPlanner>) {
    set((prev) => ({ planner: { ...prev.planner, ...patch }, plannerDraft: !chatOnScreen }));
  },

  /** The next new chat starts from the current planner values (Discover's "plan it with the concierge"). */
  keepPlannerForNextChat() {
    set({ plannerDraft: true });
  },

  /** The chat page reports while a chat is on screen. */
  setChatOnScreen(on: boolean) {
    chatOnScreen = on;
  },

  /**
   * A new chat starts over: the Where, dates, travelers and budget of an earlier chat do not follow
   * the traveler into it. Values set up outside a chat for it (the Discover fields) are taken once.
   */
  startNewChatPlanner() {
    if (readSnapshot().plannerDraft) set({ plannerDraft: false });
    else set({ planner: DEFAULT_PLANNER, plannerDraft: false });
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

  /** Records a reaction to a place (optimistically); resolves with the saved row. */
  recordFeedback(input: NewFeedback): Promise<PlaceFeedback> {
    const prev = readSnapshot();
    const placeId = input.placeId ?? feedbackKey(input.name, input.place);
    const existing = prev.feedback.find((f) => f.placeId === placeId);
    const now = new Date().toISOString();
    const optimistic: PlaceFeedback = {
      id: existing?.id ?? `temp-${newId()}`,
      placeId,
      kind: input.kind,
      name: input.name,
      destination: input.destination ?? existing?.destination,
      place: input.place ?? existing?.place,
      verdict: input.verdict,
      reasons: input.reasons ?? [],
      note: input.note ?? "",
      tripId: input.tripId ?? existing?.tripId,
      source: input.source ?? "card",
      score: input.score === undefined ? existing?.score : (input.score ?? undefined),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    set({ feedback: [optimistic, ...prev.feedback.filter((f) => f.placeId !== placeId)] });
    // Writes for one place go out one after another: a verdict and the reason tapped right after it
    // must land in that order, or the server keeps the reasonless row.
    const previous = feedbackQueues.get(placeId) ?? Promise.resolve();
    const run: Promise<PlaceFeedback> = previous.catch(() => undefined).then(async () => {
      try {
        const res = await api<{ feedback: PlaceFeedback; taste: TasteProfile; preferences: LearnedPreference[] }>("/api/me/feedback", {
          method: "POST",
          json: { ...input, placeId, reasons: input.reasons ?? [], note: input.note ?? "", source: input.source ?? "card", tripId: input.tripId ?? null },
        });
        // A newer write for this place is queued behind this one; its response carries the final state.
        if (feedbackQueues.get(placeId) !== run) return res.feedback;
        set((s) => ({
          feedback: [res.feedback, ...s.feedback.filter((f) => f.placeId !== placeId)],
          taste: res.taste,
          preferences: res.preferences.length
            ? [...res.preferences.filter((p) => !s.preferences.some((q) => q.id === p.id)), ...s.preferences.map((p) => res.preferences.find((q) => q.id === p.id) ?? p)]
            : s.preferences,
        }));
        return res.feedback;
      } catch (err) {
        report("saving your reaction", err);
        set((s) => ({ feedback: existing ? s.feedback.map((f) => (f.placeId === placeId ? existing : f)) : s.feedback.filter((f) => f.placeId !== placeId) }));
        throw err;
      }
    });
    feedbackQueues.set(placeId, run);
    void run.finally(() => {
      if (feedbackQueues.get(placeId) === run) feedbackQueues.delete(placeId);
    }).catch(() => undefined);
    return run;
  },

  removeFeedback(id: string) {
    const prev = readSnapshot();
    const item = prev.feedback.find((f) => f.id === id);
    if (!item) return;
    set({ feedback: prev.feedback.filter((f) => f.id !== id) });
    if (id.startsWith("temp-")) return;
    api<{ taste: TasteProfile }>(`/api/me/feedback/${encodeURIComponent(id)}`, { method: "DELETE" })
      .then((res) => set({ taste: res.taste }))
      .catch((err) => {
        report("removing a reaction", err);
        set((s) => ({ feedback: [item, ...s.feedback] }));
      });
  },

  /** Thumbs up / down on a recommendation (optimistic); the same place gets one row that later thumbs replace. */
  recordRecFeedback(input: NewRecFeedback): Promise<RecFeedback> {
    const placeId = input.placeId ?? recKey(input.name, input.place);
    const previous = recQueues.get(placeId) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(() => writeRecFeedback(placeId, input));
    recQueues.set(placeId, run);
    void run.finally(() => {
      if (recQueues.get(placeId) === run) recQueues.delete(placeId);
    }).catch(() => undefined);
    return run;
  },

  removeRecFeedback(id: string) {
    const prev = readSnapshot();
    const item = prev.recFeedback.find((f) => f.id === id);
    if (!item) return;
    set({ recFeedback: prev.recFeedback.filter((f) => f.id !== id) });
    if (id.startsWith("temp-")) return;
    api(`/api/me/recs/${encodeURIComponent(id)}`, { method: "DELETE" }).catch((err) => {
      report("removing your thumbs", err);
      set((s) => ({ recFeedback: [item, ...s.recFeedback] }));
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

  upsertChat(chat: { id: string; title?: string; tripId?: string; destination?: string; place?: ResolvedPlace }) {
    const prev = readSnapshot();
    if (!prev.user) return;
    const now = new Date().toISOString();
    const existing = prev.chats.find((c) => c.id === chat.id);
    if (existing && (chat.title === undefined || chat.title === existing.title) && chat.tripId === undefined && chat.destination === undefined) {
      // Only a "touch": bump ordering locally, no request needed.
      set({ chats: [{ ...existing, updatedAt: now }, ...prev.chats.filter((c) => c.id !== chat.id)] });
      return;
    }
    const next: ChatSummary = {
      id: chat.id,
      title: chat.title ?? existing?.title ?? "New chat",
      tripId: chat.tripId ?? existing?.tripId,
      destination: chat.destination ?? existing?.destination,
      place: chat.place ?? existing?.place,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    set({ chats: [next, ...prev.chats.filter((c) => c.id !== chat.id)] });
    api(`/api/chats/${encodeURIComponent(chat.id)}`, {
      method: "PUT",
      json: { title: next.title, tripId: next.tripId, destination: chat.destination, place: chat.place },
    }).catch((err) => report("saving the chat", err));
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
