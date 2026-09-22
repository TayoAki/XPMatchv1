"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { MapPlace, PlaceKind, ResolvedPlace } from "@/lib/places/types";

/**
 * Per-thread map state: the destination in focus, the places pinned from the
 * assistant's cards, the selected place, the city a destination card selected
 * (whose recommendations then own the map), the shared category filter, the
 * trip the conversation adds to, and whether the map is collapsed.
 * Session-only (rebuilt from the thread's messages when a chat is reopened).
 */

export type MapFilter = "all" | Exclude<PlaceKind, "destination">;

/** The city selected from a destination card: its recommendation set scopes the map until cleared. */
export interface ActiveDestination {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
}

export interface ThreadMapState {
  focus: ResolvedPlace | null;
  places: Record<string, MapPlace>;
  order: string[];
  selectedKey: string | null;
  collapsed: boolean;
  registered: Record<string, true>;
  activeDestination: ActiveDestination | null;
  filter: MapFilter;
  /** The trip this conversation adds to: its scope, or the one chosen in Add to trip. */
  tripId: string | null;
}

interface MapStoreState {
  activeThreadId: string | null;
  threads: Record<string, ThreadMapState>;
  hoveredKey: string | null;
}

export const FOCUS_KEY = "__focus__";

/** How far from a selected city an unscoped pin still counts as "in this city". */
const CITY_RADIUS_KM = 40;

const EMPTY_THREAD: ThreadMapState = {
  focus: null,
  places: {},
  order: [],
  selectedKey: null,
  collapsed: false,
  registered: {},
  activeDestination: null,
  filter: "all",
  tripId: null,
};

let state: MapStoreState = { activeThreadId: null, threads: {}, hoveredKey: null };
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

function getSnapshot() {
  return state;
}

function threadOf(threadId: string): ThreadMapState {
  return state.threads[threadId] ?? EMPTY_THREAD;
}

function patchThread(threadId: string, patch: Partial<ThreadMapState>) {
  state = { ...state, threads: { ...state.threads, [threadId]: { ...threadOf(threadId), ...patch } } };
  emit();
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Whether a pin belongs to the selected city: its own recommendations, or a card pin placed within the city. */
function inScope(place: MapPlace, active: ActiveDestination): boolean {
  if (place.scope) return place.scope === active.id;
  if (place.kind === "destination") return place.id === active.id;
  if (active.lat === undefined || active.lng === undefined || Number.isNaN(active.lat) || Number.isNaN(active.lng)) return false;
  return distanceKm(place, { lat: active.lat, lng: active.lng }) <= CITY_RADIUS_KM;
}

export const mapActions = {
  getState: () => state,
  activeThreadId: () => state.activeThreadId,
  setActiveThread(threadId: string | null) {
    if (state.activeThreadId === threadId) return;
    state = { ...state, activeThreadId: threadId };
    emit();
  },
  setFocus(threadId: string, focus: ResolvedPlace | null) {
    patchThread(threadId, { focus, collapsed: false });
  },
  hasRegistered(threadId: string, toolCallId: string): boolean {
    return !!threadOf(threadId).registered[toolCallId];
  },
  markRegistered(threadId: string, toolCallId: string) {
    const t = threadOf(threadId);
    patchThread(threadId, { registered: { ...t.registered, [toolCallId]: true } });
  },
  addPlaces(threadId: string, places: MapPlace[]) {
    if (!places.length) return;
    const t = threadOf(threadId);
    const nextPlaces = { ...t.places };
    const order = [...t.order];
    for (const p of places) {
      if (!nextPlaces[p.key]) order.push(p.key);
      nextPlaces[p.key] = p;
    }
    // A new answer's pins mean the conversation moved on: a selected city no longer owns the map.
    const activeDestination = places.some((p) => !p.scope) ? null : t.activeDestination;
    patchThread(threadId, { places: nextPlaces, order, collapsed: false, activeDestination, filter: activeDestination ? t.filter : "all" });
  },
  /** Replaces every pin a tool call put on the map (a package that was swapped or rebuilt), keeping the order of pins that stay. */
  replacePlaces(threadId: string, toolCallId: string, places: MapPlace[]) {
    const t = threadOf(threadId);
    const keep = new Set(places.map((p) => p.key));
    const nextPlaces: Record<string, MapPlace> = {};
    const order: string[] = [];
    for (const key of t.order) {
      const p = t.places[key];
      if (!p) continue;
      if (p.toolCallId === toolCallId && !keep.has(key)) continue;
      nextPlaces[key] = p;
      order.push(key);
    }
    for (const p of places) {
      if (!nextPlaces[p.key]) order.push(p.key);
      nextPlaces[p.key] = p;
    }
    const selectedKey = t.selectedKey && !nextPlaces[t.selectedKey] && t.selectedKey !== FOCUS_KEY ? null : t.selectedKey;
    patchThread(threadId, { places: nextPlaces, order, selectedKey, collapsed: places.length ? false : t.collapsed });
  },
  /** The recommendation set of a selected city: replaces that city's earlier set, leaves every other pin alone. */
  setScopedPlaces(threadId: string, scope: string, places: MapPlace[]) {
    const t = threadOf(threadId);
    const keep = new Set(places.map((p) => p.key));
    const nextPlaces: Record<string, MapPlace> = {};
    const order: string[] = [];
    for (const key of t.order) {
      const p = t.places[key];
      if (!p) continue;
      if (p.scope === scope && !keep.has(key)) continue;
      nextPlaces[key] = p;
      order.push(key);
    }
    for (const p of places) {
      if (!nextPlaces[p.key]) order.push(p.key);
      nextPlaces[p.key] = { ...p, scope };
    }
    const selectedKey = t.selectedKey && !nextPlaces[t.selectedKey] && t.selectedKey !== FOCUS_KEY ? null : t.selectedKey;
    patchThread(threadId, { places: nextPlaces, order, selectedKey });
  },
  /** A destination card was selected: its recommendations own the map. Selecting it again resets the filter. */
  setActiveDestination(threadId: string, destination: ActiveDestination | null) {
    patchThread(threadId, { activeDestination: destination, filter: "all", selectedKey: null, collapsed: false });
  },
  setFilter(threadId: string, filter: MapFilter) {
    const t = threadOf(threadId);
    const selected = t.selectedKey && t.selectedKey !== FOCUS_KEY ? t.places[t.selectedKey] : null;
    const selectedKey = selected && filter !== "all" && selected.kind !== filter ? null : t.selectedKey;
    patchThread(threadId, { filter, selectedKey });
  },
  setThreadTrip(threadId: string, tripId: string | null) {
    patchThread(threadId, { tripId });
  },
  selectPlace(threadId: string, key: string | null) {
    patchThread(threadId, { selectedKey: key, collapsed: false });
  },
  setCollapsed(threadId: string, collapsed: boolean) {
    patchThread(threadId, { collapsed });
  },
  setHovered(key: string | null) {
    if (state.hoveredKey === key) return;
    state = { ...state, hoveredKey: key };
    emit();
  },
};

export interface MapView extends ThreadMapState {
  threadId: string | null;
  hoveredKey: string | null;
  /** Every pin of the thread, in the order it was added. */
  placeList: MapPlace[];
  /** The pins the map shows: the selected city's set (or everything), narrowed by the filter. */
  visiblePlaces: MapPlace[];
  /** How many places the selected city's set holds before the filter. */
  scopedCount: number;
  hasContent: boolean;
  selected: MapPlace | ResolvedPlace | null;
}

/** Map state for the active thread (or a specific one). */
export function useMapView(threadId?: string | null): MapView {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const id = threadId ?? snapshot.activeThreadId;
  return useMemo(() => {
    const t = id ? snapshot.threads[id] ?? EMPTY_THREAD : EMPTY_THREAD;
    const placeList = t.order.map((k) => t.places[k]).filter(Boolean);
    const scoped = t.activeDestination ? placeList.filter((p) => inScope(p, t.activeDestination!)) : placeList;
    const visiblePlaces = t.filter === "all" ? scoped : scoped.filter((p) => p.kind === t.filter);
    const selected = t.selectedKey === FOCUS_KEY ? t.focus : t.selectedKey ? t.places[t.selectedKey] ?? null : null;
    return {
      ...t,
      threadId: id,
      hoveredKey: snapshot.hoveredKey,
      placeList,
      visiblePlaces,
      scopedCount: scoped.length,
      hasContent: !!t.focus || placeList.length > 0,
      selected,
    };
  }, [snapshot, id]);
}
