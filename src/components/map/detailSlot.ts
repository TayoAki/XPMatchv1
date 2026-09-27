"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Where a destination card shows itself in full: the side panel on wide screens, or a layer over
 * the whole page on smaller ones (the card expands into it). The card renders into the element
 * through a portal, so the full view shares the card's own state (tab, itinerary, picks, Make
 * itinerary).
 */
let slot: HTMLElement | null = null;
let panels = 0;
let overlaySlot: HTMLElement | null = null;
let overlayHosts = 0;
/** Where the card was on screen when it was opened (and when), so the layer can grow out of it. */
let origin: { rect: DOMRect; at: number } | null = null;
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

/** Callback ref for the layer a card expands into on screens without a side panel. */
export function setOverlaySlot(el: HTMLElement | null) {
  if (overlaySlot === el) return;
  overlaySlot = el;
  emit();
}

export function useOverlaySlot(): HTMLElement | null {
  return useSyncExternalStore(subscribe, () => overlaySlot, () => null);
}

/** Marks the page as able to show an expanded card (the layer itself exists only while one is open). */
export function useOverlayHostMounted() {
  useEffect(() => {
    overlayHosts += 1;
    emit();
    return () => {
      overlayHosts -= 1;
      emit();
    };
  }, []);
}

/** Whether a card can expand over the page. */
export function useHasOverlayHost(): boolean {
  return useSyncExternalStore(subscribe, () => overlayHosts > 0, () => false);
}

/** The card growing out into its full view over the page, and folding back into the chat. */
export const EXPAND_MS = 340;
export const COLLAPSE_MS = 260;
export const EXPAND_EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/** The card's place on screen as it opens; the layer reads it to grow out of the card. */
export function setExpandOrigin(rect: DOMRect | null) {
  origin = rect ? { rect, at: performance.now() } : null;
}

/**
 * The origin set by the opening that just happened. It is not cleared on reading (a development
 * build mounts the layer twice), so it counts only for a moment: a layer shown later (reopening a
 * chat whose card was left open) fades in instead.
 */
export function expandOrigin(): DOMRect | null {
  return origin && performance.now() - origin.at < 1000 ? origin.rect : null;
}

/** A `clip-path` that shows only `rect` of the viewport, with the card's rounded corners. */
export function clipTo(rect: DOMRect, radius = 18): string {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const px = (n: number) => `${Math.max(0, Math.round(n))}px`;
  return `inset(${px(rect.top)} ${px(w - rect.right)} ${px(h - rect.bottom)} ${px(rect.left)} round ${radius}px)`;
}

/** Whether any of `rect` is inside the viewport. */
export function onScreen(rect: DOMRect): boolean {
  return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
}
