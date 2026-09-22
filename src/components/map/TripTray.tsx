"use client";

import Link from "next/link";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { useTravelStore } from "@/lib/store";

/** The compact "your trip so far" card on the map: title, length, party size and the way to the trip. */
export function TripTray({ tripId, className }: { tripId: string | null; className?: string }) {
  const { trips } = useTravelStore();
  const trip = tripId ? trips.find((t) => t.id === tripId) : undefined;
  if (!trip) return null;
  const nights = trip.startDate && trip.endDate ? Math.max(0, Math.round((Date.parse(trip.endDate) - Date.parse(trip.startDate)) / 86_400_000)) : null;
  const meta = [
    nights !== null ? `${nights} night${nights === 1 ? "" : "s"}` : "Dates flexible",
    trip.travelers ? `${trip.travelers} traveler${trip.travelers === 1 ? "" : "s"}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className={clsx("xp-pop flex items-center gap-3 rounded-2xl border border-border bg-white/95 p-3 shadow-floating backdrop-blur", className)} data-testid="trip-tray">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Your trip</div>
        <div className="truncate font-serif text-[17px] leading-tight">{trip.title}</div>
        <div className="truncate text-[12px] text-muted">{meta}</div>
      </div>
      <Link href={`/trips/${trip.id}`} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-hover">
        View trip <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
