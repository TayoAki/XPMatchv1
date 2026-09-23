"use client";

import { useCallback, useEffect } from "react";
import { mapActions, useMapView } from "@/lib/map-store";
import { DiscoveryPanel } from "@/components/panel/DiscoveryPanel";
import { MapPanel } from "@/components/map/MapPanel";
import { PlaceDetailSheet } from "@/components/map/PlaceDetailSheet";
import { setDetailSlot, useDetailCardMounted, useSidePanelMounted } from "@/components/map/detailSlot";

/** Discovery feed until the chat is about a place; then the live map, like Mindtrip; with a card opened in full, the plan workspace. */
export function RightPanel() {
  useSidePanelMounted();
  const view = useMapView();
  const cardOnScreen = useDetailCardMounted(view.detail);
  if (view.detail && view.threadId && cardOnScreen) return <PlanWorkspace threadId={view.threadId} />;
  const showMap = view.hasContent && !view.collapsed;
  if (showMap) return <MapPanel />;
  return (
    <DiscoveryPanel
      showMapButton={view.hasContent}
      onShowMap={() => {
        if (view.threadId) mapActions.setCollapsed(view.threadId, false);
      }}
    />
  );
}

/**
 * The plan workspace (a destination card opened in full, in the center): the card renders itself
 * into it; a place picked in the plan or on a day's map opens its own details over the plan
 * (photos, match, Good fit / Not a fit, traveler reviews, booking links) and "Back to {city}"
 * returns. Escape goes back from the place first, then closes the plan; typing in the chat is
 * left alone.
 */
function PlanWorkspace({ threadId }: { threadId: string }) {
  const view = useMapView(threadId);
  const selected = view.selected;
  const placeOpen = !!view.selectedKey && !!selected;
  const cityName = view.detailName ?? view.activeDestination?.name;
  const back = useCallback(() => mapActions.selectPlace(threadId, null), [threadId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // An open dialog, popover or floating panel takes this Escape itself (they listen on window, after us).
      if (document.querySelector('[aria-modal="true"], .xp-pop')) return;
      if ((e.target as HTMLElement | null)?.closest?.('[data-testid="chat-column"]')) return;
      if (placeOpen) back();
      else mapActions.closeDetail(threadId);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [placeOpen, threadId, back]);

  return (
    <div className="relative h-full w-full bg-surface-warm" data-testid="card-detail-panel">
      {/* The card stays mounted under a place (its plan, swaps and tab are kept for Back). */}
      <div ref={setDetailSlot} className="absolute inset-0" inert={placeOpen} aria-hidden={placeOpen || undefined} />
      {placeOpen && selected ? (
        <div className="absolute inset-0 z-10 flex justify-center bg-surface-warm">
          <div className="relative h-full w-full max-w-[880px] border-x border-border/60 bg-white">
            <PlaceDetailSheet key={view.selectedKey ?? "none"} place={selected} focusName={view.focus?.name} onClose={back} backLabel={cityName ? `Back to ${cityName}` : "Back"} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
