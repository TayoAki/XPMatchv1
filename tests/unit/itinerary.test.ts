import { describe, expect, it } from "vitest";
import type { ItineraryDay, ItineraryStop } from "@/lib/types";
import {
  dayColor,
  daysFromModel,
  directionsUrl,
  estimateLeg,
  formatLeg,
  insertStop,
  moveStop,
  normalizeItinerary,
  optimizeDay,
  removeStop,
  scheduledItemIds,
  updateStop,
} from "@/lib/itinerary";

const place = (name: string, lat: number, lng: number) => ({ id: name.toLowerCase(), name, kind: "attraction" as const, lat, lng, photos: [], source: "google" as const });
const stop = (id: string, name: string, lat?: number, lng?: number): ItineraryStop => ({ id, title: name, note: "", ...(lat !== undefined && lng !== undefined ? { kind: "attraction", place: place(name, lat, lng) } : {}) });

describe("normalizeItinerary", () => {
  it("upgrades version 1 string items into stops with stable ids", () => {
    const days = normalizeItinerary([{ day: 1, title: "Ancient Rome", items: ["Colosseum at opening", "", "Roman Forum"] }]);
    expect(days).toEqual([
      {
        day: 1,
        title: "Ancient Rome",
        stops: [
          { id: "legacy-1-0", title: "Colosseum at opening", note: "" },
          { id: "legacy-1-2", title: "Roman Forum", note: "" },
        ],
      },
    ]);
  });

  it("passes version 2 through, keeps places and times, and renumbers days", () => {
    const days = normalizeItinerary([
      { day: 3, title: "", stops: [{ id: "s1", title: "Pantheon", note: "early", kind: "attraction", place: place("Pantheon", 41.9, 12.47), startTime: "9:30", durationMin: 45.4, itemId: "item-1" }] },
      { day: 7, title: "Food day", stops: [{ name: "Roscioli", kind: "restaurant" }] },
    ]);
    expect(days.map((d) => d.day)).toEqual([1, 2]);
    expect(days[0].title).toBe("Day 1");
    expect(days[0].stops[0]).toMatchObject({ id: "s1", startTime: "09:30", durationMin: 45, itemId: "item-1", kind: "attraction" });
    expect(days[0].stops[0].place?.name).toBe("Pantheon");
    expect(days[1].stops[0]).toMatchObject({ title: "Roscioli", kind: "restaurant" });
  });

  it("drops junk", () => {
    expect(normalizeItinerary("nope")).toEqual([]);
    expect(normalizeItinerary([null, 42, { stops: [{}, 7, { title: "  " }] }])).toEqual([{ day: 1, title: "Day 1", stops: [] }]);
  });
});

describe("daysFromModel", () => {
  it("keeps ids, places and idea links for stops whose titles match the current itinerary", () => {
    const existing: ItineraryDay[] = [{ day: 1, title: "A", stops: [stop("p", "Pantheon", 41.9, 12.47), { ...stop("i", "Lunch"), itemId: "item-1" }] }];
    const days = daysFromModel(
      [
        { day: 1, title: "", stops: [{ name: "pantheon", kind: "attraction", note: "early" }, { name: "Trevi Fountain", kind: "attraction" }] },
        { day: 2, title: "Food", stops: [{ name: "Lunch" }] },
      ],
      existing,
    );
    expect(days.map((d) => d.day)).toEqual([1, 2]);
    expect(days[0].title).toBe("Day 1");
    expect(days[0].stops[0]).toMatchObject({ id: "p", title: "Pantheon", note: "early", kind: "attraction" });
    expect(days[0].stops[0].place?.name).toBe("Pantheon");
    expect(days[0].stops[1].place).toBeUndefined();
    expect(days[0].stops[1].id).toMatch(/^stop-/);
    expect(days[1].stops[0]).toMatchObject({ id: "i", itemId: "item-1" });
  });

  it("skips blank stops and never reuses one stop twice", () => {
    const existing: ItineraryDay[] = [{ day: 1, title: "", stops: [stop("p", "Pantheon", 41.9, 12.47)] }];
    const days = daysFromModel([{ day: 1, title: "x", stops: [{ name: "Pantheon" }, { name: " " }, { name: "Pantheon" }] }], existing);
    expect(days[0].stops).toHaveLength(2);
    expect(days[0].stops[0].id).toBe("p");
    expect(days[0].stops[1].id).not.toBe("p");
    expect(daysFromModel([])).toEqual([]);
  });
});

describe("moving stops", () => {
  const days: ItineraryDay[] = [
    { day: 1, title: "A", stops: [stop("a", "A1"), stop("b", "A2")] },
    { day: 2, title: "B", stops: [stop("c", "B1")] },
  ];

  it("reorders within a day", () => {
    const next = moveStop(days, "b", 0, 0);
    expect(next[0].stops.map((s) => s.id)).toEqual(["b", "a"]);
    expect(days[0].stops.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("moves across days and to an empty day", () => {
    const next = moveStop(days, "a", 1, 5);
    expect(next[0].stops.map((s) => s.id)).toEqual(["b"]);
    expect(next[1].stops.map((s) => s.id)).toEqual(["c", "a"]);
    const empty = insertStop([{ day: 1, title: "", stops: [] }], 0, stop("z", "Z"));
    expect(empty[0].stops.map((s) => s.id)).toEqual(["z"]);
  });

  it("inserts, updates and removes", () => {
    const withNew = insertStop(days, 0, stop("n", "New"), 1);
    expect(withNew[0].stops.map((s) => s.id)).toEqual(["a", "n", "b"]);
    const updated = updateStop(withNew, "n", { startTime: "10:00", note: "hi" });
    expect(updated[0].stops[1]).toMatchObject({ startTime: "10:00", note: "hi" });
    const removed = removeStop(updated, "n");
    expect(removed[0].stops.map((s) => s.id)).toEqual(["a", "b"]);
    expect(moveStop(days, "missing", 0, 0)).toBe(days);
  });

  it("knows which ideas are scheduled", () => {
    const withItem = insertStop(days, 1, { ...stop("i", "Idea"), itemId: "item-9" });
    expect([...scheduledItemIds(withItem)]).toEqual(["item-9"]);
  });
});

describe("geography", () => {
  it("estimates a short hop as a walk and a long one as a drive", () => {
    const walk = estimateLeg({ lat: 41.8902, lng: 12.4922 }, { lat: 41.8986, lng: 12.4769 });
    expect(walk.mode).toBe("walk");
    expect(walk.km).toBeGreaterThan(1);
    expect(walk.km).toBeLessThan(2.5);
    expect(formatLeg(walk)).toMatch(/min walk · .* km · est\./);
    const drive = estimateLeg({ lat: 41.89, lng: 12.49 }, { lat: 41.95, lng: 12.55 });
    expect(drive.mode).toBe("drive");
  });

  it("times a chosen mode at its own speed, not the other one's", () => {
    const far = [{ lat: 41.89, lng: 12.49 }, { lat: 41.91, lng: 12.51 }] as const;
    const walk = estimateLeg(far[0], far[1], "walk");
    expect(walk.mode).toBe("walk");
    expect(walk.km).toBeGreaterThan(2.5);
    expect(Math.abs(walk.minutes - (walk.km / 5) * 60)).toBeLessThan(2);
    const drive = estimateLeg({ lat: 41.8902, lng: 12.4922 }, { lat: 41.8986, lng: 12.4769 }, "drive");
    expect(drive.mode).toBe("drive");
    expect(drive.minutes).toBeLessThan(6);
  });

  it("orders stops by nearest neighbor and keeps text-only stops last", () => {
    const stops = [stop("far", "Far", 41.95, 12.55), stop("start", "Start", 41.89, 12.49), stop("near", "Near", 41.891, 12.491), stop("text", "Lunch somewhere")];
    const ordered = optimizeDay(stops);
    expect(ordered.map((s) => s.id)).toEqual(["far", "near", "start", "text"]);
  });

  it("builds a directions link through the placed stops", () => {
    const url = directionsUrl([stop("a", "A", 41.89, 12.49), stop("t", "Text"), stop("b", "B", 41.9, 12.5), stop("c", "C", 41.91, 12.51)]);
    expect(url).toContain("origin=41.89%2C12.49");
    expect(url).toContain("waypoints=41.9%2C12.5");
    expect(url).toContain("destination=41.91%2C12.51");
    expect(directionsUrl([stop("a", "A", 41.89, 12.49)])).toBeNull();
  });

  it("cycles day colors", () => {
    expect(dayColor(0)).not.toBe(dayColor(1));
    expect(dayColor(10)).toBe(dayColor(0));
  });
});
