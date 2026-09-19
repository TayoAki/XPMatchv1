"use client";

import { useState } from "react";
import { ArrowLeft, Map } from "lucide-react";
import { mapActions, useMapView } from "@/lib/map-store";
import { useMediaQuery } from "@/lib/use-media-query";
import { MapPanel } from "./MapPanel";

/**
 * Phones have no side column, so the map opens over the chat: a "Map · N pinned" pill while the
 * conversation has pins, and a full-screen layer with the map panel when tapped.
 */
export function MobileMapOverlay() {
  const wide = useMediaQuery("(min-width: 1280px)");
  const view = useMapView();
  const [opened, setOpened] = useState(false);
  // The panel's own collapse control closes the layer too.
  const open = opened && !view.collapsed;
  if (wide || !view.hasContent) return null;
  const count = view.placeList.length;
  const label = count ? `Map · ${count} pinned` : "Map";

  const show = () => {
    if (view.threadId) mapActions.setCollapsed(view.threadId, false);
    setOpened(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={show}
        data-testid="mobile-map-button"
        className="absolute right-3 top-3 z-10 inline-flex h-9 items-center gap-2 rounded-full bg-neutral-900 px-3.5 text-[13px] font-semibold text-white shadow-lg hover:bg-neutral-800"
      >
        <Map className="h-4 w-4" /> {label}
      </button>
      {open ? (
        <div className="fixed inset-0 z-40 flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="Map" data-testid="mobile-map-overlay">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-2">
            <button type="button" onClick={() => setOpened(false)} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium hover:bg-surface">
              <ArrowLeft className="h-4 w-4" /> Back to chat
            </button>
            <span className="ml-auto pr-2 text-[13px] text-muted">{label}</span>
          </div>
          <div className="min-h-0 flex-1">
            <MapPanel />
          </div>
          <div className="h-[env(safe-area-inset-bottom)] shrink-0" />
        </div>
      ) : null}
    </>
  );
}
