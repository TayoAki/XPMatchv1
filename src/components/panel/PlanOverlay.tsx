"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useMapView } from "@/lib/map-store";
import { clipTo, EXPAND_EASE, EXPAND_MS, expandOrigin, onScreen, setOverlaySlot, useDetailCardMounted, useOverlayHostMounted } from "@/components/map/detailSlot";

/**
 * Screens without a side panel: an opened destination card expands over the whole page into its
 * full view (the plan with its days, day maps, swaps and moves), which the card renders into this
 * layer through a portal. The layer exists only while a card is open; the conversation stays
 * mounted underneath, and a place opened from the plan stacks over it as a sheet.
 */
export function PlanOverlay() {
  useOverlayHostMounted();
  const view = useMapView();
  const cardOnScreen = useDetailCardMounted(view.detail);
  if (!view.detail || !cardOnScreen) return null;
  return <PlanLayer key={view.detail} name={view.detailName} />;
}

function PlanLayer({ name }: { name: string | null }) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Stable, so the card's portal keeps its target (and the plan its state) across renders.
  const setRef = useCallback((el: HTMLDivElement | null) => {
    ref.current = el;
    setOverlaySlot(el);
  }, []);

  // Grows out of the card: drawn at full size from the start and revealed from the card's outline,
  // before the first paint. Without the card's place (or with reduced motion) it fades in.
  useLayoutEffect(() => {
    const el = ref.current;
    const from = expandOrigin();
    if (!el?.animate) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !from || !onScreen(from)) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: "ease-out" });
      return;
    }
    el.animate([{ clipPath: clipTo(from) }, { clipPath: "inset(0px round 0px)" }], { duration: EXPAND_MS, easing: EXPAND_EASE });
  }, []);

  // Focus stays in the plan: anything focused behind it (the header, the chat) hands focus back,
  // unless it is a sheet, dialog or popover opened over the plan.
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const el = ref.current;
      const target = e.target instanceof Element ? e.target : null;
      if (!el || !target || el.contains(target)) return;
      if (target.closest('[role="dialog"], [aria-modal="true"], .xp-pop')) return;
      el.querySelector<HTMLElement>("button:not([disabled]), [href], input, select, textarea")?.focus({ preventScroll: true });
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  return (
    <div
      ref={setRef}
      role="dialog"
      aria-modal="true"
      aria-label={name ? `${name} itinerary` : "Itinerary"}
      data-testid="plan-overlay"
      data-plan-overlay=""
      className="fixed inset-0 z-[45] bg-surface-warm"
    />
  );
}
