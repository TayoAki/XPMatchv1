"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import type { MatchResult } from "@/lib/match";

/**
 * What a destination card's plan lets a place's own panel do: make a hotel the stay, or put a
 * place in for the stop being replaced. The card publishes this under the key its map pins carry
 * (their tool call and the city), so the panel of any of that city's places, wherever it opens
 * (the plan workspace, the map, a phone sheet), finds the plan it belongs to.
 */
export interface PlanPicker {
  /** The city, for "Your stay in Rome". */
  city: string;
  /** The place the plan stays at now. */
  stayId: string | null;
  /** Every place the plan uses now. */
  taken: ReadonlySet<string>;
  /** Places the traveler marked not a fit. */
  missed: ReadonlySet<string>;
  /** The stop being replaced from a list, when the traveler is choosing one. */
  choosing: { kind: PlaceKind; name: string } | null;
  choose(place: ResolvedPlace, match: MatchResult, kind: PlaceKind): void;
}

const pickers = new Map<string, PlanPicker>();
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

/** The key of a plan: the `toolCallId` and `scope` its pins carry. */
export const planPickerKey = (toolCallId: string, scope: string) => `${toolCallId}|${scope}`;

/** Publishes a card's plan picker for as long as the card is mounted (null: no plan yet). */
export function useRegisterPlanPicker(key: string, picker: PlanPicker | null) {
  useEffect(() => {
    if (!picker) return;
    pickers.set(key, picker);
    emit();
    return () => {
      if (pickers.get(key) !== picker) return;
      pickers.delete(key);
      emit();
    };
  }, [key, picker]);
}

/** The plan a place belongs to, from the pin fields the place was opened with. */
export function usePlanPicker(place: { toolCallId?: string; scope?: string } | null | undefined): PlanPicker | null {
  const key = place?.toolCallId && place.scope ? planPickerKey(place.toolCallId, place.scope) : null;
  return useSyncExternalStore(subscribe, () => (key ? (pickers.get(key) ?? null) : null), () => null);
}
