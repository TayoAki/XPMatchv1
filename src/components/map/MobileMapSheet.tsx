"use client";

import { photoCreditTitle } from "@/components/ui/PhotoCredit";
import { useCallback, useState } from "react";
import clsx from "clsx";
import { Map as MapIcon, Star } from "lucide-react";
import { mapActions, useMapView } from "@/lib/map-store";
import { useMediaQuery } from "@/lib/use-media-query";
import { BottomSheet, type SheetSnap } from "@/components/ui/BottomSheet";
import { GoogleMap } from "./GoogleMap";
import { PinStrip } from "./PinStrip";
import { PlaceDetailSheet } from "./PlaceDetailSheet";
import { iconSvg } from "./markerIcons";

/**
 * Phones have no side column, so the map lives in a sheet over the chat: a "Map · N pinned" pill
 * while the conversation has pins; the sheet holds the map with the pinned list under it, and a
 * pin (or "View on map" on a card) opens the place detail as a second sheet stacked on top.
 * Closing the place returns to the map, closing the map returns to the same spot in the chat.
 */
export function MobileMapSheet() {
  const wide = useMediaQuery("(min-width: 1280px)");
  const view = useMapView();
  const [opened, setOpened] = useState(false);
  const [snap, setSnap] = useState<SheetSnap>("half");
  const { threadId, focus, placeList, selectedKey, hoveredKey, selected } = view;
  const onSelect = useCallback((key: string) => threadId && mapActions.selectPlace(threadId, key), [threadId]);
  const onHover = useCallback((key: string | null) => mapActions.setHovered(key), []);
  if (wide || !view.hasContent) return null;

  const count = placeList.length;
  const label = count ? `Map · ${count} pinned` : "Map";
  // Selecting a place from a card opens the sheets too; the map panel's own "hide" closes them.
  const open = (opened || !!selected) && !view.collapsed;

  const show = () => {
    if (threadId) mapActions.setCollapsed(threadId, false);
    setSnap("half");
    setOpened(true);
  };
  const close = () => {
    setOpened(false);
    if (threadId) mapActions.selectPlace(threadId, null);
  };
  const closePlace = () => {
    setOpened(true);
    if (threadId) mapActions.selectPlace(threadId, null);
  };

  return (
    <>
      <button
        type="button"
        onClick={show}
        data-testid="mobile-map-button"
        className="absolute right-3 top-3 z-10 inline-flex h-9 items-center gap-2 rounded-full bg-brand px-3.5 text-[13px] font-semibold text-white shadow-lg hover:bg-brand-hover"
      >
        <MapIcon className="h-4 w-4" /> {label}
      </button>

      <BottomSheet open={open} onClose={close} snap={snap} onSnapChange={setSnap} testId="mobile-map-sheet" label="Map" title={focus ? `${focus.name} · ${count} pinned` : label}>
        <div className="flex h-full min-h-0 flex-col">
          <div className={clsx("shrink-0", snap === "full" ? "h-[40dvh]" : "h-[200px]")} data-testid="map-panel">
            <GoogleMap focus={focus} pins={placeList} selectedKey={selectedKey} hoveredKey={hoveredKey} onSelect={onSelect} onHover={onHover} />
          </div>
          <PinStrip places={placeList} selectedKey={selectedKey} hoveredKey={hoveredKey} onSelect={onSelect} onHover={onHover} className="shrink-0 border-b border-border" />
          <ul className="xp-scroll min-h-0 flex-1 overflow-y-auto px-2 py-2" data-testid="mobile-pin-list" aria-label="Pinned places">
            {placeList.map((p) => {
              const photo = p.photos?.[0];
              const meta = [p.rating ? `${p.rating.toFixed(1)}` : "", p.category, p.locality].filter(Boolean);
              return (
                <li key={p.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(p.key)}
                    className={clsx("flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-surface", hoveredKey === p.key && "bg-surface")}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
                      <img src={photo} alt="" title={photoCreditTitle(p.photoCredits?.[0])} loading="lazy" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface text-neutral-500" dangerouslySetInnerHTML={{ __html: iconSvg(p.kind, 18) }} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold">{p.name}</span>
                      <span className="flex items-center gap-1 truncate text-[12px] text-muted">
                        {p.rating ? <Star className="h-3 w-3 fill-current text-foreground" /> : null}
                        {meta.join(" · ")}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {count === 0 ? <li className="px-3 py-6 text-center text-[13px] text-muted">Places the assistant recommends show up here.</li> : null}
          </ul>
        </div>
      </BottomSheet>

      {selected ? (
        <BottomSheet open stacked initialSnap="full" onClose={closePlace} testId="mobile-place-sheet" label={selected.name}>
          <PlaceDetailSheet key={selectedKey ?? "none"} place={selected} focusName={focus?.name} onClose={closePlace} onCollapse={close} compact />
        </BottomSheet>
      ) : null}
    </>
  );
}
