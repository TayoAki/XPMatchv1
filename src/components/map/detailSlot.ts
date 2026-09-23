"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Where a destination card shows itself in full: the top of the side panel, while it is open
 * there. The card renders into this element through a portal, so the full view shares the card's
 * own state (tab, itinerary, picks, Make itinerary). Only wide screens have a side panel; without
 * one a card turns over in place instead.
 */
let slot: HTMLElement | null = null;
let panels = 0;
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

/** Callback ref for the side panel's card area. */
export function setDetailSlot(el: HTMLElement | null) {
  if (slot === el) return;
  slot = el;
  emit();
}

export function useDetailSlot(): HTMLElement | null {
  return useSyncExternalStore(subscribe, () => slot, () => null);
}

const cards = new Map<string, number>();

/** Marks a card as on screen under its key, so the side panel only makes room for a card that can fill it. */
export function useDetailCard(key: string) {
  useEffect(() => {
    cards.set(key, (cards.get(key) ?? 0) + 1);
    emit();
    return () => {
      const left = (cards.get(key) ?? 1) - 1;
      if (left > 0) cards.set(key, left);
      else cards.delete(key);
      emit();
    };
  }, [key]);
}

/** Whether the card with this key is on screen. */
export function useDetailCardMounted(key: string | null): boolean {
  return useSyncExternalStore(subscribe, () => !!key && cards.has(key), () => false);
}

/** Marks a side panel as on screen for as long as the calling component is mounted. */
export function useSidePanelMounted() {
  useEffect(() => {
    panels += 1;
    emit();
    return () => {
      panels -= 1;
      emit();
    };
  }, []);
}

/** Whether a side panel is on screen, so a card can open in it. */
export function useHasSidePanel(): boolean {
  return useSyncExternalStore(subscribe, () => panels > 0, () => false);
}
