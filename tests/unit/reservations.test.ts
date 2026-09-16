import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeReservations, normalizeWhen, pdfText } from "@/server/reservations";
import { formatReservationWhen, reservationDate, reservationSummary, reservationTime } from "@/lib/reservations/types";
import { parseDuration, parseRoutesResponse } from "@/server/routes";
import { directionsUrl } from "@/lib/itinerary";

describe("reservation normalization", () => {
  it("keeps our date formats and drops guesses", () => {
    expect(normalizeWhen("2026-10-10")).toBe("2026-10-10");
    expect(normalizeWhen("2026-10-10T15:00")).toBe("2026-10-10T15:00");
    expect(normalizeWhen("2026-10-10 15:00:00")).toBe("2026-10-10T15:00");
    expect(normalizeWhen("2026-10-10T15:00:00Z")).toBe("2026-10-10T15:00");
    expect(normalizeWhen("October 10")).toBeUndefined();
    expect(normalizeWhen("2026-13-40")).toBeUndefined();
    expect(normalizeWhen(42)).toBeUndefined();
  });

  it("normalizes kinds, codes, prices, legs and caps the list", () => {
    const out = normalizeReservations({
      reservations: [
        { kind: "hotel", title: "  Hotel Artemide, 3 nights ", confirmationCode: "art-88213", startsAt: "2026-10-10T15:00", endsAt: "2026-10-13", price: 780.456, currency: "eur", travelers: 2, placeName: "Hotel Artemide", city: "Rome" },
        { kind: "spaceship", title: "Delta ATL → FCO", legs: [{ from: "atl", to: "fco", flightNumber: "dl 1234", departsAt: "2026-10-09T17:30", arrivesAt: "2026-10-10T08:45" }, { from: "" }] },
        { kind: "restaurant", title: "" },
        { title: "Loose", travelers: 500, price: -3, currency: "euros" },
        ...Array.from({ length: 12 }, (_, i) => ({ kind: "other", title: `Extra ${i}` })),
      ],
    });
    expect(out).toHaveLength(10);
    expect(out[0]).toMatchObject({ kind: "hotel", title: "Hotel Artemide, 3 nights", confirmationCode: "ART-88213", startsAt: "2026-10-10T15:00", endsAt: "2026-10-13", price: 780.46, currency: "EUR", travelers: 2, placeName: "Hotel Artemide", city: "Rome" });
    expect(out[1]).toMatchObject({ kind: "other", startsAt: "2026-10-09T17:30", endsAt: "2026-10-10T08:45" });
    expect(out[1].legs).toEqual([{ from: "ATL", to: "FCO", flightNumber: "DL 1234", departsAt: "2026-10-09T17:30", arrivesAt: "2026-10-10T08:45" }]);
    expect(out[2]).toEqual({ kind: "other", title: "Loose" });
    expect(normalizeReservations({})).toEqual([]);
  });

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

  it("reads the text of the PDF fixture", async () => {
    const bytes = new Uint8Array(readFileSync(path.join(process.cwd(), "tests", "e2e", "fixtures", "confirmation.pdf")));
    const text = await pdfText(bytes);
    expect(text).toContain("ART-88213");
    expect(text).toContain("Hotel Artemide");
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
