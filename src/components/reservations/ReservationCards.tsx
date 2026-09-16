"use client";

import { MapPin, Plus, Ticket } from "lucide-react";
import type { Reservation } from "@/lib/reservations/types";
import { useUiState } from "@/components/providers/UiState";
import { useTripScope } from "@/components/trips/TripScope";
import { CardGrid, CardShell, Footer } from "@/components/chat/cards/shared";
import { Button } from "@/components/ui/Button";
import { BookingMeta, ReservationIcon } from "./BookingMeta";

/** Reservations read from a confirmation, each with Add to trip (stored under Bookings with its details). */
export function ReservationCards({ reservations, source }: { reservations: Reservation[]; source?: string }) {
  const { openAddToTrip } = useUiState();
  const tripId = useTripScope();
  if (reservations.length === 0) {
    return (
      <p className="mt-2 rounded-2xl border border-dashed border-border px-4 py-3 text-[13px] text-muted" data-testid="reservation-cards">
        No confirmed reservation was found in that {source === "image" ? "image" : source === "pdf" ? "PDF" : "text"}. Paste the whole email, or upload the PDF or a screenshot.
      </p>
    );
  }
  return (
    <div data-testid="reservation-cards">
      <div className="mt-1 flex items-center gap-1.5 text-[15px] font-semibold tracking-tight">
        <Ticket className="h-4 w-4" /> {reservations.length} reservation{reservations.length === 1 ? "" : "s"} found
      </div>
      <div className="text-[13px] text-muted">Codes and dates are copied from the confirmation; hotels and venues that Google Places recognizes get a pin.</div>
      <CardGrid>
        {reservations.map((res, i) => (
          <CardShell key={`${res.kind}-${res.confirmationCode ?? i}`} data-testid="reservation-card">
            <div className="flex gap-3 p-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-neutral-700">
                <ReservationIcon kind={res.kind} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold">{res.title}</div>
                <BookingMeta details={res} />
                {res.place ? (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-700">
                    <MapPin className="h-3 w-3" /> Pinned: {res.place.name}
                  </div>
                ) : null}
              </div>
            </div>
            <Footer>
              <Button size="sm" onClick={() => openAddToTrip({ booking: res, place: res.place, tripId: tripId ?? undefined })}>
                <Plus className="h-4 w-4" /> Add to trip
              </Button>
            </Footer>
          </CardShell>
        ))}
      </CardGrid>
    </div>
  );
}
