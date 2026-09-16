"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Per-thread search constraints: the assistant's structured reading of what the
 * traveler asked for ("quiet", "under $250/night", "pool"). Shown as editable
 * chips above the cards and fed back to the model as context on every turn.
 */

export type ConstraintKind = "hotels" | "restaurants" | "attractions" | "flights" | "destinations";
export type ConstraintType = "budget" | "area" | "amenity" | "vibe" | "dietary" | "timing" | "distance" | "other";

export interface SearchConstraint {
  label: string;
  type: ConstraintType;
  value?: string;
  /** Hard constraints must be satisfied; soft ones are preferences. */
  hard: boolean;
}

export interface ThreadConstraints {
  kind: ConstraintKind;
  constraints: SearchConstraint[];
  notUnderstood: string[];
  /** Tool call that produced this version (so the chip strip renders once). */
  toolCallId: string;
  updatedAt: number;
}

interface ConstraintsState {
  threads: Record<string, ThreadConstraints>;
}

let state: ConstraintsState = { threads: {} };
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

const sameLabel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function patch(threadId: string, next: ThreadConstraints | null) {
  const threads = { ...state.threads };
  if (next) threads[threadId] = next;
  else delete threads[threadId];
  state = { threads };
  emit();
}

export const constraintActions = {
  getState: () => state,
  get: (threadId: string): ThreadConstraints | null => state.threads[threadId] ?? null,

  /** Replaces the strip with the assistant's latest reading (deduplicated by label). */
  set(threadId: string, input: { kind: ConstraintKind; constraints: SearchConstraint[]; notUnderstood?: string[]; toolCallId: string }) {
    const constraints: SearchConstraint[] = [];
    for (const c of input.constraints) {
      const label = c.label.trim();
      if (!label || constraints.some((x) => sameLabel(x.label, label))) continue;
      constraints.push({ ...c, label });
    }
    patch(threadId, {
      kind: input.kind,
      constraints,
      notUnderstood: (input.notUnderstood ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 5),
      toolCallId: input.toolCallId,
      updatedAt: Date.now(),
    });
  },

  remove(threadId: string, label: string) {
    const current = state.threads[threadId];
    if (!current) return;
    patch(threadId, { ...current, constraints: current.constraints.filter((c) => !sameLabel(c.label, label)), updatedAt: Date.now() });
  },

  add(threadId: string, constraint: SearchConstraint) {
    const current = state.threads[threadId];
    const label = constraint.label.trim();
    if (!label) return;
    if (!current) {
      patch(threadId, { kind: "hotels", constraints: [{ ...constraint, label }], notUnderstood: [], toolCallId: "manual", updatedAt: Date.now() });
      return;
    }
    if (current.constraints.some((c) => sameLabel(c.label, label))) return;
    patch(threadId, { ...current, constraints: [...current.constraints, { ...constraint, label }], updatedAt: Date.now() });
  },

  toggleHard(threadId: string, label: string) {
    const current = state.threads[threadId];
    if (!current) return;
    patch(threadId, {
      ...current,
      constraints: current.constraints.map((c) => (sameLabel(c.label, label) ? { ...c, hard: !c.hard } : c)),
      updatedAt: Date.now(),
    });
  },

  clear(threadId: string) {
    if (state.threads[threadId]) patch(threadId, null);
  },
};

const EMPTY: ThreadConstraints | null = null;

/** The constraint strip for one thread (null when the assistant has not set any). */
export function useConstraints(threadId: string | null | undefined): ThreadConstraints | null {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(() => (threadId ? snapshot.threads[threadId] ?? EMPTY : EMPTY), [snapshot, threadId]);
}

export const KIND_NOUN: Record<ConstraintKind, string> = {
  hotels: "places to stay",
  restaurants: "restaurants",
  attractions: "things to do",
  flights: "flights",
  destinations: "destinations",
};

/** The message sent when the traveler edits the chips. */
export function searchAgainMessage(kind: ConstraintKind, constraints: SearchConstraint[], destination?: string): string {
  const hard = constraints.filter((c) => c.hard).map((c) => c.label);
  const soft = constraints.filter((c) => !c.hard).map((c) => c.label);
  const where = destination ? ` in ${destination}` : "";
  if (constraints.length === 0) return `Search ${KIND_NOUN[kind]}${where} again without any of the previous filters.`;
  const parts = [`Search ${KIND_NOUN[kind]}${where} again with these filters:`];
  if (hard.length) parts.push(`must have ${hard.join(", ")}`);
  if (soft.length) parts.push(`${hard.length ? "and " : ""}ideally ${soft.join(", ")}`);
  return `${parts.join(" ")}.`;
}
