"use client";

import { Bed, Car, Plane, Ticket, TrainFront, Utensils } from "lucide-react";
import type { Reservation, ReservationKind } from "@/lib/reservations/types";
import { formatReservationWhen, RESERVATION_LABEL } from "@/lib/reservations/types";

export const RESERVATION_ICON: Record<ReservationKind, typeof Plane> = {
  flight: Plane,
  hotel: Bed,
  restaurant: Utensils,
  car: Car,
  train: TrainFront,
  activity: Ticket,
  other: Ticket,
};

export function ReservationIcon({ kind, className }: { kind: ReservationKind; className?: string }) {
  const Icon = RESERVATION_ICON[kind] ?? Ticket;
  return <Icon className={className ?? "h-4 w-4"} aria-label={RESERVATION_LABEL[kind]} />;
}

/** Compact facts of a booking: kind, provider, confirmation code, dates, legs, place, price. */
export function BookingMeta({ details, compact = false }: { details: Reservation; compact?: boolean }) {
  const when = formatReservationWhen(details);
  const price = details.price !== undefined ? `${details.price.toLocaleString("en-US")} ${details.currency ?? ""}`.trim() : "";
  return (
    <div className={compact ? "text-[12px] text-neutral-700" : "mt-1 grid gap-0.5 text-[13px] text-neutral-700"} data-testid="booking-meta">
      <div className="flex flex-wrap items-center gap-x-2">
        <span className="font-medium">{RESERVATION_LABEL[details.kind]}</span>
        {details.provider ? <span>· {details.provider}</span> : null}
        {details.confirmationCode ? (
          <span>
            · <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[12px] font-semibold tracking-wide">{details.confirmationCode}</span>
          </span>
        ) : null}
        {when ? <span>· {when}</span> : null}
        {price ? <span>· {price}</span> : null}
        {details.travelers ? <span>· {details.travelers} traveler{details.travelers === 1 ? "" : "s"}</span> : null}
      </div>
      {details.legs?.length ? (
        <div className="flex flex-wrap gap-x-3">
          {details.legs.map((leg, i) => (
            <span key={i}>
              {leg.from} → {leg.to}
              {leg.flightNumber ? ` ${leg.flightNumber}` : ""}
              {leg.departsAt ? ` · dep ${formatReservationWhen({ startsAt: leg.departsAt })}` : ""}
              {leg.arrivesAt ? ` · arr ${formatReservationWhen({ startsAt: leg.arrivesAt })}` : ""}
            </span>
          ))}
        </div>
      ) : null}
      {!compact && (details.place?.name || details.address) ? <div className="text-muted">{details.place?.name ? [details.place.name, details.place.locality].filter(Boolean).join(" · ") : details.address}</div> : null}
      {!compact && details.notes ? <div className="text-muted">{details.notes}</div> : null}
    </div>
  );
}
