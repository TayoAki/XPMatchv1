"use client";

import { mapActions, useMapView } from "@/lib/map-store";
import { DiscoveryPanel } from "@/components/panel/DiscoveryPanel";
import { MapPanel } from "@/components/map/MapPanel";

/** Discovery feed until the chat is about a place; then the live map, like Mindtrip. */
export function RightPanel() {
  const view = useMapView();
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
