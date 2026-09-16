import type { ResolvedPlace } from "@/lib/places/types";

export type ReservationKind = "flight" | "hotel" | "restaurant" | "car" | "train" | "activity" | "other";
export const RESERVATION_KINDS: ReservationKind[] = ["flight", "hotel", "restaurant", "car", "train", "activity", "other"];

export const RESERVATION_LABEL: Record<ReservationKind, string> = {
  flight: "Flight",
  hotel: "Stay",
  restaurant: "Restaurant",
  car: "Car rental",
  train: "Train",
  activity: "Activity",
  other: "Booking",
};

export interface FlightLeg {
  /** IATA codes, e.g. ATL → FCO. */
  from: string;
  to: string;
  flightNumber?: string;
  departsAt?: string;
  arrivesAt?: string;
}

/** A booking read from a confirmation email, PDF or screenshot. Dates are local: `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM`. */
export interface Reservation {
  kind: ReservationKind;
  title: string;
  provider?: string;
  confirmationCode?: string;
  startsAt?: string;
  endsAt?: string;
  placeName?: string;
  address?: string;
  city?: string;
  travelers?: number;
  price?: number;
  currency?: string;
  notes?: string;
  legs?: FlightLeg[];
  /** Resolved through Places when the name matched (hotels, restaurants, venues). */
  place?: ResolvedPlace;
}

export const RESERVATION_MAX = 10;

/** Date part of a reservation's start (`YYYY-MM-DD`), or null. */
export function reservationDate(value?: string): string | null {
  if (!value) return null;
  const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/** Time part (`HH:MM`) when the value carries one. */
export function reservationTime(value?: string): string | null {
  if (!value) return null;
  const m = value.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : null;
}

/** "Oct 10, 15:00 – Oct 13" style label for cards and rows. */
export function formatReservationWhen(res: Pick<Reservation, "startsAt" | "endsAt">): string {
  const fmt = (v?: string) => {
    const date = reservationDate(v);
    if (!date) return "";
    const d = new Date(`${date}T00:00:00`);
    const day = Number.isNaN(d.getTime()) ? date : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const time = reservationTime(v);
    return time ? `${day}, ${time}` : day;
  };
  const start = fmt(res.startsAt);
  const end = fmt(res.endsAt);
  if (start && end && start !== end) return `${start} – ${end}`;
  return start || end;
}

/** One-line note stored with the booking so the plain Bookings list stays readable. */
export function reservationSummary(res: Reservation): string {
  return [
    RESERVATION_LABEL[res.kind],
    res.provider,
    res.confirmationCode ? `#${res.confirmationCode}` : "",
    formatReservationWhen(res),
    res.legs?.length ? res.legs.map((l) => `${l.from}→${l.to}${l.flightNumber ? ` ${l.flightNumber}` : ""}`).join(", ") : "",
    res.price !== undefined ? `${res.price} ${res.currency ?? ""}`.trim() : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
