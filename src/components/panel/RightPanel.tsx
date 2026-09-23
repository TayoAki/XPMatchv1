"use client";

import { useEffect } from "react";
import { mapActions, useMapView } from "@/lib/map-store";
import { DiscoveryPanel } from "@/components/panel/DiscoveryPanel";
import { MapPanel } from "@/components/map/MapPanel";
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
 * into it. A place picked in the plan or on a day's map opens its details in the column on the right
 * (see HomeClient), so the plan stays in view and another pick just switches the place. Escape goes
 * back from the place first, then closes the plan; typing in the chat is left alone.
 */
function PlanWorkspace({ threadId }: { threadId: string }) {
  const view = useMapView(threadId);
  const placeOpen = !!view.selectedKey && !!view.selected;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // An open dialog, popover or floating panel takes this Escape itself (they listen on window, after us).
      if (document.querySelector('[aria-modal="true"], .xp-pop')) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-testid="chat-column"]') && !target.closest('[data-testid="side-place"]')) return;
      if (placeOpen) mapActions.selectPlace(threadId, null);
      else mapActions.closeDetail(threadId);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [placeOpen, threadId]);

  return (
    <div className="relative h-full w-full bg-surface-warm" data-testid="card-detail-panel">
      <div ref={setDetailSlot} className="absolute inset-0" />
    </div>
  );
}
