import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import type { ItineraryDay, ItineraryStop, TripItem } from "@/lib/types";

/**
 * Itinerary helpers shared by the board, the API and the assistant tools.
 * Version 1 itineraries were `{ day, title, items: string[] }`; version 2 holds
 * structured stops linked to places. Normalization is idempotent and applied on
 * read, so old trips never need a data migration.
 */

interface LegacyDay {
  day?: number;
  title?: string;
  items?: unknown[];
  stops?: unknown[];
}

const asString = (v: unknown, max = 500): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const asNumber = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const KINDS: PlaceKind[] = ["hotel", "restaurant", "attraction", "destination"];

function stopId(day: number, index: number, given?: unknown): string {
  return typeof given === "string" && given.trim() ? given.trim().slice(0, 80) : `legacy-${day}-${index}`;
}

function normalizeStop(raw: unknown, day: number, index: number): ItineraryStop | null {
  if (typeof raw === "string") {
    const title = raw.trim();
    return title ? { id: stopId(day, index), title: title.slice(0, 200), note: "" } : null;
  }
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = asString(r.title ?? r.name, 200);
  if (!title) return null;
  const kind = KINDS.includes(r.kind as PlaceKind) ? (r.kind as PlaceKind) : undefined;
  const place = r.place && typeof r.place === "object" && typeof (r.place as ResolvedPlace).lat === "number" ? (r.place as ResolvedPlace) : undefined;
  const stop: ItineraryStop = { id: stopId(day, index, r.id), title, note: asString(r.note, 1000) };
  if (kind) stop.kind = kind;
  if (place) stop.place = place;
  const startTime = asString(r.startTime, 5);
  if (/^\d{1,2}:\d{2}$/.test(startTime)) stop.startTime = startTime.padStart(5, "0");
  const duration = asNumber(r.durationMin);
  if (duration !== undefined && duration > 0) stop.durationMin = Math.min(Math.round(duration), 24 * 60);
  const itemId = asString(r.itemId, 80);
  if (itemId) stop.itemId = itemId;
  return stop;
}

export function normalizeItinerary(raw: unknown): ItineraryDay[] {
  if (!Array.isArray(raw)) return [];
  const days: ItineraryDay[] = [];
  raw.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const d = entry as LegacyDay;
    const day = typeof d.day === "number" && d.day >= 1 ? Math.round(d.day) : days.length + 1;
    const source = Array.isArray(d.stops) ? d.stops : Array.isArray(d.items) ? d.items : [];
    const stops = source.map((s, j) => normalizeStop(s, day, j)).filter((s): s is ItineraryStop => s !== null);
    days.push({ day, title: asString(d.title, 200) || `Day ${days.length + 1}`, stops });
  });
  // Renumber so days are 1..n in order.
  return days.map((d, i) => ({ ...d, day: i + 1 }));
}

export function newStopId(): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `stop-${rand}`;
}

/** Shape of a stop as the assistant's tools produce it (`name` instead of `title`, no id). */
export interface ModelStop {
  name: string;
  kind?: PlaceKind;
  note?: string;
  startTime?: string;
  durationMin?: number;
}

export interface ModelDay {
  day: number;
  title?: string;
  stops: ModelStop[];
}

const titleKey = (title: string) => title.trim().toLowerCase();

/**
 * Turns the assistant's itinerary (names, kinds, notes) into structured days.
 * When the trip already has stops, a stop with the same title keeps its id,
 * its resolved place and its link to a trip idea, so rewriting the plan does
 * not drop pins or trigger another lookup.
 */
export function daysFromModel(days: ModelDay[], existing: ItineraryDay[] = []): ItineraryDay[] {
  const known = new Map<string, ItineraryStop>();
  for (const day of existing) for (const stop of day.stops) if (!known.has(titleKey(stop.title))) known.set(titleKey(stop.title), stop);
  const used = new Set<string>();
  const out: ItineraryDay[] = [];
  days.filter((d) => d && typeof d.day === "number").forEach((d, i) => {
    const stops: ItineraryStop[] = [];
    for (const st of d.stops ?? []) {
      if (!st || !st.name || !st.name.trim()) continue;
      const match = known.get(titleKey(st.name));
      const reuse = match && !used.has(match.id) ? match : undefined;
      if (reuse) used.add(reuse.id);
      const stop: ItineraryStop = {
        id: reuse?.id ?? newStopId(),
        title: reuse?.place?.name ?? st.name.trim().slice(0, 200),
        note: st.note ?? reuse?.note ?? "",
        kind: st.kind ?? reuse?.kind,
        place: reuse?.place,
        itemId: reuse?.itemId,
        startTime: st.startTime,
        durationMin: st.durationMin,
      };
      stops.push(stop);
    }
    out.push({ day: i + 1, title: (d.title ?? "").trim() || `Day ${i + 1}`, stops });
  });
  return out;
}

/** A stop made from a trip idea (keeps the link so the idea can be shown as scheduled). */
export function stopFromItem(item: TripItem): ItineraryStop {
  return {
    id: newStopId(),
    title: item.title,
    note: item.note,
    kind: item.place?.kind,
    place: item.place,
    itemId: item.id,
  };
}

export function stopFromPlace(place: ResolvedPlace, note = ""): ItineraryStop {
  return { id: newStopId(), title: place.name, note, kind: place.kind, place };
}

export function findStop(days: ItineraryDay[], stopId: string): { dayIndex: number; index: number } | null {
  for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
    const index = days[dayIndex].stops.findIndex((s) => s.id === stopId);
    if (index >= 0) return { dayIndex, index };
  }
  return null;
}

function clone(days: ItineraryDay[]): ItineraryDay[] {
  return days.map((d) => ({ ...d, stops: [...d.stops] }));
}

/** Moves a stop (by id) to a day and position; the target index may be the end of the day. */
export function moveStop(days: ItineraryDay[], stopId: string, toDayIndex: number, toIndex: number): ItineraryDay[] {
  const from = findStop(days, stopId);
  if (!from || toDayIndex < 0 || toDayIndex >= days.length) return days;
  const next = clone(days);
  const [stop] = next[from.dayIndex].stops.splice(from.index, 1);
  const target = next[toDayIndex].stops;
  const bounded = Math.max(0, Math.min(toIndex, target.length));
  target.splice(bounded, 0, stop);
  return next;
}

/** Inserts a new stop into a day (at the end by default). */
export function insertStop(days: ItineraryDay[], dayIndex: number, stop: ItineraryStop, index?: number): ItineraryDay[] {
  if (dayIndex < 0 || dayIndex >= days.length) return days;
  const next = clone(days);
  const target = next[dayIndex].stops;
  target.splice(index === undefined ? target.length : Math.max(0, Math.min(index, target.length)), 0, stop);
  return next;
}

export function removeStop(days: ItineraryDay[], stopId: string): ItineraryDay[] {
  const from = findStop(days, stopId);
  if (!from) return days;
  const next = clone(days);
  next[from.dayIndex].stops.splice(from.index, 1);
  return next;
}

export function updateStop(days: ItineraryDay[], stopId: string, patch: Partial<Omit<ItineraryStop, "id">>): ItineraryDay[] {
  const from = findStop(days, stopId);
  if (!from) return days;
  const next = clone(days);
  next[from.dayIndex].stops[from.index] = { ...next[from.dayIndex].stops[from.index], ...patch };
  return next;
}

export function addDay(days: ItineraryDay[], title = ""): ItineraryDay[] {
  return [...days, { day: days.length + 1, title: title || `Day ${days.length + 1}`, stops: [] }];
}

/** Ids of trip items that are scheduled somewhere in the itinerary. */
export function scheduledItemIds(days: ItineraryDay[]): Set<string> {
  const ids = new Set<string>();
  for (const d of days) for (const s of d.stops) if (s.itemId) ids.add(s.itemId);
  return ids;
}

/* ----------------------------- geography ----------------------------- */

export interface LatLngLike {
  lat: number;
  lng: number;
}

export function haversineKm(a: LatLngLike, b: LatLngLike): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface TravelLeg {
  km: number;
  minutes: number;
  mode: "walk" | "drive";
}

/**
 * Travel time estimate between two stops: straight-line distance times a 1.3
 * path factor, walking at 5 km/h up to 2.5 km (about half an hour), otherwise
 * driving at 25 km/h in town. Labeled as an estimate in the UI; routing APIs
 * can replace it later.
 */
export function estimateLeg(a: LatLngLike, b: LatLngLike): TravelLeg {
  const km = haversineKm(a, b) * 1.3;
  const mode: TravelLeg["mode"] = km <= 2.5 ? "walk" : "drive";
  const speed = mode === "walk" ? 5 : 25;
  const minutes = Math.max(1, Math.round((km / speed) * 60));
  return { km: Math.round(km * 10) / 10, minutes, mode };
}

export function formatLeg(leg: TravelLeg): string {
  const time = leg.minutes >= 60 ? `${Math.floor(leg.minutes / 60)} h ${leg.minutes % 60 ? `${leg.minutes % 60} min` : ""}`.trim() : `${leg.minutes} min`;
  return `${time} ${leg.mode} · ${leg.km < 1 ? `${Math.round(leg.km * 1000)} m` : `${leg.km} km`} · est.`;
}

/** Nearest-neighbor order starting from the first placed stop; text-only stops keep their relative order at the end. */
export function optimizeDay(stops: ItineraryStop[]): ItineraryStop[] {
  const placed = stops.filter((s) => s.place);
  const unplaced = stops.filter((s) => !s.place);
  if (placed.length <= 2) return stops;
  const remaining = [...placed];
  const ordered: ItineraryStop[] = [remaining.shift()!];
  while (remaining.length) {
    const last = ordered[ordered.length - 1].place!;
    let best = 0;
    let bestKm = Infinity;
    remaining.forEach((s, i) => {
      const km = haversineKm(last, s.place!);
      if (km < bestKm) {
        bestKm = km;
        best = i;
      }
    });
    ordered.push(remaining.splice(best, 1)[0]);
  }
  return [...ordered, ...unplaced];
}

export type DirectionsMode = "walk" | "drive" | "transit";
export const DIRECTIONS_MODES: DirectionsMode[] = ["walk", "drive", "transit"];

/** A leg as the board shows it: routed by Google or estimated here. */
export interface RoutedLeg extends TravelLeg {
  source: "routes" | "estimate";
}

export function formatRoutedLeg(leg: RoutedLeg): string {
  const time = leg.minutes >= 60 ? `${Math.floor(leg.minutes / 60)} h ${leg.minutes % 60 ? `${leg.minutes % 60} min` : ""}`.trim() : `${leg.minutes} min`;
  const dist = leg.km < 1 ? `${Math.round(leg.km * 1000)} m` : `${leg.km} km`;
  return `${time} ${leg.mode} · ${dist} · ${leg.source === "routes" ? "via Google" : "est."}`;
}

/** Google Maps directions link through a day's placed stops, in order. */
export function directionsUrl(stops: ItineraryStop[], mode: DirectionsMode = "walk"): string | null {
  const points = stops.filter((s) => s.place).map((s) => `${s.place!.lat},${s.place!.lng}`);
  if (points.length < 2) return null;
  const origin = points[0];
  const destination = points[points.length - 1];
  const waypoints = points.slice(1, -1).join("|");
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  if (waypoints) url.searchParams.set("waypoints", waypoints);
  url.searchParams.set("travelmode", mode === "drive" ? "driving" : mode === "transit" ? "transit" : "walking");
  return url.toString();
}

/* ------------------------------- colors ------------------------------- */

export const DAY_COLORS = ["#2563eb", "#059669", "#d97706", "#db2777", "#7c3aed", "#0891b2", "#dc2626", "#65a30d", "#9333ea", "#0d9488"];

export function dayColor(dayIndex: number): string {
  return DAY_COLORS[((dayIndex % DAY_COLORS.length) + DAY_COLORS.length) % DAY_COLORS.length];
}

export function stopPinKey(stop: ItineraryStop): string {
  return `stop:${stop.id}`;
}
