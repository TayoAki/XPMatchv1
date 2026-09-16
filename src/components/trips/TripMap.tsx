"use client";

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import type { ResolvedPlace } from "@/lib/places/types";
import type { TripDetail } from "@/lib/types";
import { FOCUS_PIN_KEY, GoogleMap, type MapPin as Pin } from "@/components/map/GoogleMap";
import { PlaceDetailSheet } from "@/components/map/PlaceDetailSheet";

export const tripItemKey = (itemId: string) => `item:${itemId}`;

/** Map of a trip: the destination pin plus every idea, booking or media item that has a place. */
export function TripMap({
  trip,
  selectedKey,
  onSelect,
  className,
}: {
  trip: TripDetail;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  className?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const pins = useMemo<Pin[]>(
    () => trip.items.flatMap((item) => (item.place ? [{ ...(item.place as ResolvedPlace), key: tripItemKey(item.id) }] : [])),
    [trip.items],
  );
  const focus = trip.place ?? null;
  const selected: ResolvedPlace | null =
    selectedKey === FOCUS_PIN_KEY ? focus : selectedKey ? pins.find((p) => p.key === selectedKey) ?? null : null;

  return (
    <div className={className ?? "relative h-full w-full"} data-testid="trip-map">
      <GoogleMap focus={focus} pins={pins} selectedKey={selectedKey} hoveredKey={hovered} onSelect={onSelect} onHover={setHovered} labels>
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => focus && onSelect(FOCUS_PIN_KEY)}
            className="flex h-10 items-center gap-2 rounded-full bg-white pl-3 pr-4 text-[14px] font-semibold shadow-md hover:bg-neutral-50"
          >
            <MapPin className="h-4 w-4" />
            {trip.destination}
            {pins.length ? <span className="text-[12px] font-medium text-muted">{pins.length} pinned</span> : null}
          </button>
        </div>
        {selected ? (
          <PlaceDetailSheet
            key={selectedKey ?? "none"}
            place={selected}
            focusName={trip.destination}
            onClose={() => onSelect(null)}
            onCollapse={() => onSelect(null)}
          />
        ) : null}
      </GoogleMap>
    </div>
  );
}
