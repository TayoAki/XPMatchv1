"use client";

import { useState, type ReactNode } from "react";
import { MapPin } from "lucide-react";
import type { ResolvedPlace } from "@/lib/places/types";
import { FOCUS_PIN_KEY, GoogleMap, type MapPin as Pin, type MapRoute } from "./GoogleMap";
import { PlaceDetailSheet } from "./PlaceDetailSheet";

export interface PlacesMapProps {
  /** Destination pin (black) and the label shown in the top-left chip. */
  focus: ResolvedPlace | null;
  focusLabel?: string;
  pins: Pin[];
  routes?: MapRoute[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  hoveredKey?: string | null;
  onHover?: (key: string | null) => void;
  labels?: boolean;
  className?: string;
  testId?: string;
  children?: ReactNode;
}

/** Map of a set of places with the destination chip and the place sheet. Used by trips, guides and Explore. */
export function PlacesMap({ focus, focusLabel, pins, routes, selectedKey, onSelect, hoveredKey, onHover, labels = true, className, testId, children }: PlacesMapProps) {
  const [localHovered, setLocalHovered] = useState<string | null>(null);
  const hovered = hoveredKey === undefined ? localHovered : hoveredKey;
  const hover = onHover ?? setLocalHovered;
  const selected: ResolvedPlace | null =
    selectedKey === FOCUS_PIN_KEY ? focus : selectedKey ? pins.find((p) => p.key === selectedKey) ?? null : null;
  const label = focusLabel ?? focus?.name;

  return (
    <div className={className ?? "relative h-full w-full"} data-testid={testId ?? "places-map"}>
      <GoogleMap focus={focus} pins={pins} routes={routes} selectedKey={selectedKey} hoveredKey={hovered} onSelect={onSelect} onHover={hover} labels={labels}>
        {label ? (
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => focus && onSelect(FOCUS_PIN_KEY)}
              className="flex h-10 items-center gap-2 rounded-full bg-white pl-3 pr-4 text-[14px] font-semibold shadow-md hover:bg-neutral-50"
            >
              <MapPin className="h-4 w-4" />
              {label}
              {pins.length ? <span className="text-[12px] font-medium text-muted">{pins.length} pinned</span> : null}
            </button>
          </div>
        ) : null}
        {children}
        {selected ? (
          <PlaceDetailSheet key={selectedKey ?? "none"} place={selected} focusName={label} onClose={() => onSelect(null)} onCollapse={() => onSelect(null)} />
        ) : null}
      </GoogleMap>
    </div>
  );
}
