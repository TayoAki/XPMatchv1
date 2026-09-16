"use client";

import { useMemo } from "react";
import type { ResolvedPlace } from "@/lib/places/types";
import type { TripDetail } from "@/lib/types";
import type { MapPin as Pin } from "@/components/map/GoogleMap";
import { PlacesMap } from "@/components/map/PlacesMap";

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
  const pins = useMemo<Pin[]>(
    () => trip.items.flatMap((item) => (item.place ? [{ ...(item.place as ResolvedPlace), key: tripItemKey(item.id) }] : [])),
    [trip.items],
  );
  return (
    <PlacesMap
      focus={trip.place ?? null}
      focusLabel={trip.destination}
      pins={pins}
      selectedKey={selectedKey}
      onSelect={onSelect}
      className={className}
      testId="trip-map"
    />
  );
}
