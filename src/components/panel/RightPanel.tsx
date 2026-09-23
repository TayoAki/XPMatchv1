"use client";

import { useEffect, useState } from "react";
import { mapActions, useMapView } from "@/lib/map-store";
import { DiscoveryPanel } from "@/components/panel/DiscoveryPanel";
import { MapPanel } from "@/components/map/MapPanel";
import { PlaceDetailSheet } from "@/components/map/PlaceDetailSheet";
import { setDetailSlot, useDetailCardMounted, useSidePanelMounted } from "@/components/map/detailSlot";

/** Discovery feed until the chat is about a place; then the live map, like Mindtrip; a card opened in full sits above the map. */
export function RightPanel() {
  useSidePanelMounted();
  const view = useMapView();
  const cardOnScreen = useDetailCardMounted(view.detail);
  if (view.detail && view.threadId && cardOnScreen) return <CardDetailPanel threadId={view.threadId} />;
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
 * A destination card open in full: the card (which renders itself into the top area) over a
 * smaller map of its places. A place picked on either side shows on the map with a Details
 * button; Details opens the place over the whole panel. Escape closes the place, then the card.
 */
function CardDetailPanel({ threadId }: { threadId: string }) {
  const view = useMapView(threadId);
  const [placeKey, setPlaceKey] = useState<string | null>(null);
  const selected = view.selected;
  const placeOpen = !!placeKey && placeKey === view.selectedKey && !!selected;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // An open dialog, popover or floating panel takes this Escape itself (they listen on window, after us).
      if (document.querySelector('[aria-modal="true"], .xp-pop')) return;
      if (placeOpen) setPlaceKey(null);
      else mapActions.closeDetail(threadId);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [placeOpen, threadId]);

  return (
    <div className="relative flex h-full w-full flex-col" data-testid="card-detail-panel">
      <div ref={setDetailSlot} className="relative min-h-0 flex-[1.7] overflow-hidden" />
      <div className="relative min-h-[240px] flex-1 border-t border-border/60">
        <MapPanel compact onOpenPlace={() => setPlaceKey(view.selectedKey)} />
      </div>
      {placeOpen && selected ? (
        <PlaceDetailSheet key={placeKey} place={selected} focusName={view.focus?.name} onClose={() => setPlaceKey(null)} />
      ) : null}
    </div>
  );
}
