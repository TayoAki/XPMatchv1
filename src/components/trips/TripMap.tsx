"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import type { ResolvedPlace } from "@/lib/places/types";
import type { TripDetail } from "@/lib/types";
import type { MapPin as Pin, MapRoute } from "@/components/map/GoogleMap";
import { PlacesMap } from "@/components/map/PlacesMap";
import { dayColor, scheduledItemIds, stopPinKey } from "@/lib/itinerary";

export const tripItemKey = (itemId: string) => `item:${itemId}`;

/** How many pins the trip map shows with every day on: placed stops plus unscheduled items with a place. */
export function tripPinCount(trip: TripDetail): number {
  const scheduled = scheduledItemIds(trip.itinerary);
  const stops = trip.itinerary.reduce((n, day) => n + day.stops.filter((s) => s.place).length, 0);
  const items = trip.items.filter((item) => item.place && !(item.kind === "idea" && scheduled.has(item.id))).length;
  return stops + items;
}

type DayFilter = "all" | number;

/**
 * Map of a trip: the destination pin, every unscheduled idea, booking or media
 * item that has a place, and the itinerary's stops as numbered pins colored per
 * day with a line through each day. Day chips show one day at a time.
 */
export function TripMap({
  trip,
  selectedKey,
  onSelect,
  hoveredKey,
  onHover,
  className,
}: {
  trip: TripDetail;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  hoveredKey?: string | null;
  onHover?: (key: string | null) => void;
  className?: string;
}) {
  const [filter, setFilter] = useState<DayFilter>("all");
  const days = trip.itinerary;
  const daysWithPins = useMemo(() => days.map((d, i) => ({ index: i, count: d.stops.filter((s) => s.place).length })).filter((d) => d.count > 0), [days]);
  const showChips = daysWithPins.length > 0;
  // A filtered-out day is still shown while one of its stops is selected from the board.
  const activeFilter: DayFilter = showChips && typeof filter === "number" && filter < days.length ? filter : "all";

  const { pins, routes } = useMemo(() => {
    const scheduled = scheduledItemIds(days);
    const pins: Pin[] = [];
    const routes: MapRoute[] = [];
    const selectedDay = selectedKey ? days.findIndex((d) => d.stops.some((s) => s.place && stopPinKey(s) === selectedKey)) : -1;
    days.forEach((day, i) => {
      const visible = activeFilter === "all" || activeFilter === i || selectedDay === i;
      if (!visible) return;
      const color = dayColor(i);
      const path: { lat: number; lng: number }[] = [];
      let n = 0;
      for (const stop of day.stops) {
        if (!stop.place) continue;
        n += 1;
        pins.push({ ...(stop.place as ResolvedPlace), key: stopPinKey(stop), badge: String(n), color, group: `Day ${i + 1}` });
        path.push({ lat: stop.place.lat, lng: stop.place.lng });
      }
      if (path.length >= 2) routes.push({ key: `day:${i}`, color, path });
    });
    if (activeFilter === "all") {
      for (const item of trip.items) {
        if (!item.place || (item.kind === "idea" && scheduled.has(item.id))) continue;
        pins.push({ ...(item.place as ResolvedPlace), key: tripItemKey(item.id) });
      }
    }
    return { pins, routes };
  }, [days, trip.items, activeFilter, selectedKey]);

  return (
    <PlacesMap
      focus={trip.place ?? null}
      focusLabel={trip.destination}
      pins={pins}
      routes={routes}
      selectedKey={selectedKey}
      onSelect={onSelect}
      hoveredKey={hoveredKey}
      onHover={onHover}
      className={className}
      testId="trip-map"
    >
      {showChips ? (
        <div role="group" aria-label="Days on the map" className="absolute bottom-4 left-4 right-16 flex gap-1.5 overflow-x-auto pb-1">
          <DayChip active={activeFilter === "all"} onClick={() => setFilter("all")}>
            All
          </DayChip>
          {daysWithPins.map((d) => (
            <DayChip key={d.index} active={activeFilter === d.index} color={dayColor(d.index)} onClick={() => setFilter(activeFilter === d.index ? "all" : d.index)}>
              Day {d.index + 1}
            </DayChip>
          ))}
        </div>
      ) : null}
    </PlacesMap>
  );
}

function DayChip({ active, color, onClick, children }: { active: boolean; color?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold shadow-md",
        active ? "bg-neutral-900 text-white" : "bg-white text-foreground hover:bg-neutral-50",
      )}
    >
      {color ? <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> : null}
      {children}
    </button>
  );
}
