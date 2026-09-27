import { describe, expect, it } from "vitest";
import { formatReservationWhen, reservationDate, reservationSummary, reservationTime } from "@/lib/reservations/types";
import { parseDuration, parseRoutesResponse } from "@/server/routes";
import { directionsUrl } from "@/lib/itinerary";

describe("booking details", () => {
  it("formats dates, times and summaries", () => {
    expect(reservationDate("2026-10-10T15:00")).toBe("2026-10-10");
    expect(reservationTime("2026-10-10T15:00")).toBe("15:00");
    expect(reservationTime("2026-10-10")).toBeNull();
    expect(formatReservationWhen({ startsAt: "2026-10-10T15:00", endsAt: "2026-10-13" })).toBe("Oct 10, 15:00 – Oct 13");
    expect(formatReservationWhen({ startsAt: "2026-10-10" })).toBe("Oct 10");
    expect(reservationSummary({ kind: "flight", title: "x", provider: "Delta", confirmationCode: "DLX9Q2", legs: [{ from: "ATL", to: "FCO", flightNumber: "DL 1234" }], price: 1420, currency: "USD", startsAt: "2026-10-09T17:30" })).toBe(
      "Flight · Delta · #DLX9Q2 · Oct 9, 17:30 · ATL→FCO DL 1234 · 1420 USD",
    );
  });
});

describe("routes", () => {
  it("parses durations and a computeRoutes answer", () => {
    expect(parseDuration("1234s")).toBe(1234);
    expect(parseDuration("12.5s")).toBe(12.5);
    expect(parseDuration("soon")).toBeNull();
    const legs = parseRoutesResponse({ routes: [{ legs: [{ distanceMeters: 950, duration: "720s" }, { distanceMeters: 4200, duration: "600s" }] }] }, 2, "walk");
    expect(legs).toEqual([
      { km: 1, minutes: 12, mode: "walk", source: "routes" },
      { km: 4.2, minutes: 10, mode: "walk", source: "routes" },
    ]);
    expect(parseRoutesResponse({ routes: [{ legs: [{ distanceMeters: 950 }] }] }, 1, "drive")).toBeNull();
    expect(parseRoutesResponse({}, 1, "drive")).toBeNull();
  });

  it("builds directions links per mode", () => {
    const stop = (id: string, lat: number, lng: number) => ({ id, title: id, note: "", place: { id, name: id, kind: "attraction" as const, lat, lng, photos: [], source: "google" as const } });
    expect(directionsUrl([stop("a", 41.89, 12.49), stop("b", 41.9, 12.5)], "transit")).toContain("travelmode=transit");
    expect(directionsUrl([stop("a", 41.89, 12.49), stop("b", 41.9, 12.5)], "drive")).toContain("travelmode=driving");
  });
});
