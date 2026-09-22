"use client";

import clsx from "clsx";
import type { MapFilter } from "@/lib/map-store";

const FILTERS: { key: MapFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hotel", label: "Stays" },
  { key: "restaurant", label: "Dining" },
  { key: "attraction", label: "Experiences" },
];

/** The one category filter the map and the active destination card share. */
export function MapFilters({ value, onChange, className }: { value: MapFilter; onChange: (next: MapFilter) => void; className?: string }) {
  return (
    <div role="group" aria-label="Map filters" className={clsx("flex flex-wrap gap-2", className)} data-testid="map-filters">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          type="button"
          aria-pressed={value === f.key}
          data-testid={`map-filter-${f.key}`}
          onClick={() => onChange(f.key)}
          className={clsx(
            "h-8 rounded-full border px-3 text-[13px] font-semibold transition-colors duration-200",
            value === f.key ? "border-brand bg-brand text-white" : "border-border bg-white text-neutral-700 hover:bg-surface",
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
