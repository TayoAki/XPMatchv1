"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { MapPlace, ResolvedPlace } from "@/lib/places/types";

/**
 * Per-thread map state: the destination in focus, the places pinned from the
 * assistant's cards, the selected place, and whether the map is collapsed.
 * Session-only (rebuilt from the thread's messages when a chat is reopened).
 */

export interface ThreadMapState {
  focus: ResolvedPlace | null;
  places: Record<string, MapPlace>;
  order: string[];
  selectedKey: string | null;
  collapsed: boolean;
  registered: Record<string, true>;
}

interface MapStoreState {
  activeThreadId: string | null;
  threads: Record<string, ThreadMapState>;
  hoveredKey: string | null;
}

export const FOCUS_KEY = "__focus__";

const EMPTY_THREAD: ThreadMapState = {
  focus: null,
  places: {},
  order: [],
  selectedKey: null,
  collapsed: false,
  registered: {},
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
    patchThread(threadId, { places: nextPlaces, order, collapsed: false });
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
  placeList: MapPlace[];
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
    const selected = t.selectedKey === FOCUS_KEY ? t.focus : t.selectedKey ? t.places[t.selectedKey] ?? null : null;
    return {
      ...t,
      threadId: id,
      hoveredKey: snapshot.hoveredKey,
      placeList,
      hasContent: !!t.focus || placeList.length > 0,
      selected,
    };
  }, [snapshot, id]);
}
