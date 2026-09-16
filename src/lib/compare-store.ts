"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";

/**
 * Per-thread "compare" selection: up to three options picked from cards. The
 * floating bar turns the selection into a comparison request for the assistant.
 */

export const COMPARE_LIMIT = 3;

export interface CompareOption {
  /** Map pin key (`toolCallId:index`) when the option has one. */
  key: string;
  name: string;
  kind: PlaceKind;
  /** One line of the card's own facts (price, area, style) for the comparison prompt. */
  facts: string;
  place?: ResolvedPlace;
}

interface CompareState {
  threads: Record<string, CompareOption[]>;
}

let state: CompareState = { threads: {} };
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

const getSnapshot = () => state;

function setThread(threadId: string, options: CompareOption[]) {
  state = { threads: { ...state.threads, [threadId]: options } };
  emit();
}

export const compareActions = {
  list: (threadId: string): CompareOption[] => state.threads[threadId] ?? [],
  isSelected: (threadId: string, key: string) => (state.threads[threadId] ?? []).some((o) => o.key === key),

  /** Adds or removes an option; returns false when the limit stops an add. */
  toggle(threadId: string, option: CompareOption): boolean {
    const current = state.threads[threadId] ?? [];
    if (current.some((o) => o.key === option.key)) {
      setThread(threadId, current.filter((o) => o.key !== option.key));
      return true;
    }
    if (current.length >= COMPARE_LIMIT) return false;
    setThread(threadId, [...current, option]);
    return true;
  },

  /** Keeps the latest resolved pin on a selected option. */
  update(threadId: string, key: string, patch: Partial<CompareOption>) {
    const current = state.threads[threadId];
    if (!current?.some((o) => o.key === key)) return;
    setThread(threadId, current.map((o) => (o.key === key ? { ...o, ...patch } : o)));
  },

  clear(threadId: string) {
    if (state.threads[threadId]?.length) setThread(threadId, []);
  },
};

const NONE: CompareOption[] = [];

export function useCompareSelection(threadId: string | null | undefined): CompareOption[] {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(() => (threadId ? snapshot.threads[threadId] ?? NONE : NONE), [snapshot, threadId]);
}

/** The message the compare bar sends. */
export function compareMessage(options: CompareOption[]): string {
  const list = options.map((o) => `${o.name}${o.facts ? ` (${o.facts})` : ""}`).join("; ");
  return `Compare these options side by side for me, on what matters most to me: ${list}.`;
}
