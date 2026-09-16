import { describe, expect, it } from "vitest";
import type { TripDetail } from "@/lib/types";
import type { PlaceFeedback } from "@/lib/feedback/types";
import { ratingCandidates, tripEnded, tripsToRate } from "@/lib/feedback/post-trip";

const place = (id: string, name: string, kind: "hotel" | "restaurant" | "attraction" | "destination" = "attraction") => ({ id, name, kind, lat: 41.9, lng: 12.5, photos: [], source: "google" as const });

const trip: TripDetail = {
  id: "t1",
  ownerId: "u1",
  role: "owner",
  title: "Trip to Rome",
  destination: "Rome",
  place: place("rome", "Rome", "destination"),
  startDate: "2026-09-01",
  endDate: "2026-09-05",
  itinerary: [{ day: 1, title: "Day 1", stops: [{ id: "s1", title: "Colosseum", note: "", kind: "attraction", place: place("col", "Colosseum") }, { id: "s2", title: "Pack", note: "" }] }],
  preferences: "",
  memberCount: 1,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  members: [],
  items: [
    { id: "i1", kind: "idea", title: "Colosseum", note: "", place: place("col", "Colosseum"), createdAt: "2026-08-01T00:00:00.000Z" },
    { id: "i2", kind: "idea", title: "Pantheon", note: "", place: place("pan", "Pantheon"), createdAt: "2026-08-01T00:00:00.000Z" },
    { id: "i3", kind: "booking", title: "Hotel Artemide", note: "", place: place("art", "Hotel Artemide", "hotel"), createdAt: "2026-08-01T00:00:00.000Z" },
    { id: "i4", kind: "media", title: "Photo", note: "", createdAt: "2026-08-01T00:00:00.000Z" },
    { id: "i5", kind: "idea", title: "Unresolved", note: "", createdAt: "2026-08-01T00:00:00.000Z" },
  ],
  chats: [],
};

describe("post-trip helpers", () => {
  it("knows when a trip has ended (for about six weeks)", () => {
    expect(tripEnded(trip, new Date("2026-09-06T12:00:00Z"))).toBe(true);
    expect(tripEnded(trip, new Date("2026-09-05T10:00:00Z"))).toBe(false);
    expect(tripEnded(trip, new Date("2026-11-01T00:00:00Z"))).toBe(false);
    expect(tripEnded({ endDate: undefined }, new Date())).toBe(false);
  });

  it("lists placed stops and ideas once, in itinerary order, minus rated ones", () => {
    const names = ratingCandidates(trip).map((c) => c.name);
    expect(names).toEqual(["Colosseum", "Pantheon", "Hotel Artemide"]);
    const rated: PlaceFeedback[] = [
      { id: "f1", placeId: "pan", kind: "attraction", name: "Pantheon", verdict: "loved", reasons: [], note: "", source: "card", createdAt: "", updatedAt: "" },
    ];
    expect(ratingCandidates(trip, rated).map((c) => c.name)).toEqual(["Colosseum", "Hotel Artemide"]);
  });

  it("picks trips to prompt for, skipping dismissed ones", () => {
    const now = new Date("2026-09-10T00:00:00Z");
    expect(tripsToRate([trip], new Set(), now).map((t) => t.id)).toEqual(["t1"]);
    expect(tripsToRate([trip], new Set(["t1"]), now)).toEqual([]);
  });
});
