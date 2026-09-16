import { generateObject } from "ai";
import { z } from "zod";
import type { PlaceKind } from "@/lib/places/types";
import { RESERVATION_KINDS, RESERVATION_MAX, type FlightLeg, type Reservation, type ReservationKind } from "@/lib/reservations/types";
import { createOpenRouterModel, getHelperModel, OPENROUTER_PREFIX, resolveModelSpec } from "./model";
import { resolvePointOfInterest } from "./places";
import { ImportError, namesMatch } from "./import";

/**
 * Reservation import: a pasted confirmation email, a PDF or a screenshot
 * becomes structured bookings. The model only reads the text or image; dates,
 * codes and kinds are normalized here and places are verified through Places
 * with a name match before a booking gets a pin.
 */

const legSchema = z.object({
  from: z.string().describe("IATA airport code, e.g. ATL"),
  to: z.string().describe("IATA airport code, e.g. FCO"),
  flightNumber: z.string().optional().describe("e.g. DL 1234"),
  departsAt: z.string().optional().describe("Local departure as YYYY-MM-DDTHH:MM"),
  arrivesAt: z.string().optional().describe("Local arrival as YYYY-MM-DDTHH:MM"),
});

const reservationSchema = z.object({
  reservations: z
    .array(
      z.object({
        kind: z.enum(["flight", "hotel", "restaurant", "car", "train", "activity", "other"]),
        title: z.string().describe("Short label, e.g. 'Hotel Artemide, 3 nights' or 'Delta ATL → FCO'"),
        provider: z.string().optional().describe("Airline, hotel, restaurant, rental company or booking site"),
        confirmationCode: z.string().optional().describe("Booking reference / confirmation number exactly as written"),
        startsAt: z.string().optional().describe("Check-in, departure or reservation time as YYYY-MM-DD or YYYY-MM-DDTHH:MM (local)"),
        endsAt: z.string().optional().describe("Check-out, arrival or end, same format"),
        placeName: z.string().optional().describe("Hotel, restaurant or venue name as it would appear on Google Maps"),
        address: z.string().optional(),
        city: z.string().optional(),
        travelers: z.number().int().optional().describe("Guests or passengers"),
        price: z.number().optional().describe("Total paid or due, number only"),
        currency: z.string().optional().describe("ISO code like EUR or USD"),
        notes: z.string().optional().describe("Anything else worth keeping: room type, cancellation terms, seat, pickup point"),
        legs: z.array(legSchema).optional().describe("For flights and trains: each leg in order"),
      }),
    )
    .max(RESERVATION_MAX),
});

const SYSTEM = `You read travel confirmation emails, booking PDFs and screenshots for a trip planner. Extract the reservations they contain: flights (each leg with IATA codes and local times), hotels (check-in and check-out), restaurants, car rentals, trains, tours and tickets. Copy confirmation codes exactly as written. Use local dates and times as YYYY-MM-DD or YYYY-MM-DDTHH:MM and never guess a date the text does not give. Extract the reservations that are actually confirmed; ignore marketing, upsells and generic instructions. At most ${RESERVATION_MAX}.`;

function structuredModel() {
  const model = getHelperModel();
  if (!model) throw new ImportError(503, "No model is configured, so confirmations cannot be read right now.");
  return model;
}

function visionModel() {
  const spec = resolveModelSpec();
  if (spec.startsWith(OPENROUTER_PREFIX)) return createOpenRouterModel(process.env.HELPER_VISION_MODEL?.trim() || "openai/gpt-4o-mini");
  return structuredModel();
}

export const MAX_CONFIRMATION_TEXT = 40_000;

const DATE_RE = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2}))?/;

/** Keeps dates the model wrote in our format; anything else is dropped rather than guessed. */
export function normalizeWhen(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const m = value.trim().match(DATE_RE);
  if (!m) return undefined;
  const date = new Date(`${m[1]}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  return m[2] !== undefined ? `${m[1]}T${m[2]}:${m[3]}` : m[1];
}

const clean = (v: unknown, max: number): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.replace(/\s+/g, " ").trim().slice(0, max);
  return t || undefined;
};

function normalizeLeg(raw: Partial<FlightLeg> | undefined): FlightLeg | null {
  const from = clean(raw?.from, 8)?.toUpperCase();
  const to = clean(raw?.to, 8)?.toUpperCase();
  if (!from || !to) return null;
  const leg: FlightLeg = { from, to };
  const number = clean(raw?.flightNumber, 12);
  if (number) leg.flightNumber = number.toUpperCase();
  const dep = normalizeWhen(raw?.departsAt);
  const arr = normalizeWhen(raw?.arrivesAt);
  if (dep) leg.departsAt = dep;
  if (arr) leg.arrivesAt = arr;
  return leg;
}

export function normalizeReservations(raw: { reservations?: unknown }): Reservation[] {
  const out: Reservation[] = [];
  for (const entry of Array.isArray(raw.reservations) ? (raw.reservations as Record<string, unknown>[]) : []) {
    if (!entry || typeof entry !== "object") continue;
    const title = clean(entry.title, 120);
    if (!title) continue;
    const kind = RESERVATION_KINDS.includes(entry.kind as ReservationKind) ? (entry.kind as ReservationKind) : "other";
    const res: Reservation = { kind, title };
    const provider = clean(entry.provider, 80);
    const code = clean(entry.confirmationCode, 40);
    const placeName = clean(entry.placeName, 120);
    const address = clean(entry.address, 200);
    const city = clean(entry.city, 80);
    const notes = clean(entry.notes, 500);
    const currencyRaw = clean(entry.currency, 10);
    const currency = currencyRaw && /^[A-Za-z]{3}$/.test(currencyRaw) ? currencyRaw.toUpperCase() : undefined;
    if (provider) res.provider = provider;
    if (code) res.confirmationCode = code.toUpperCase();
    const startsAt = normalizeWhen(entry.startsAt);
    const endsAt = normalizeWhen(entry.endsAt);
    if (startsAt) res.startsAt = startsAt;
    if (endsAt) res.endsAt = endsAt;
    if (placeName) res.placeName = placeName;
    if (address) res.address = address;
    if (city) res.city = city;
    if (notes) res.notes = notes;
    if (typeof entry.travelers === "number" && entry.travelers > 0 && entry.travelers < 100) res.travelers = Math.round(entry.travelers);
    if (typeof entry.price === "number" && Number.isFinite(entry.price) && entry.price >= 0) res.price = Math.round(entry.price * 100) / 100;
    if (currency) res.currency = currency;
    const legs = Array.isArray(entry.legs) ? (entry.legs as Partial<FlightLeg>[]).map(normalizeLeg).filter((l): l is FlightLeg => l !== null).slice(0, 8) : [];
    if (legs.length) {
      res.legs = legs;
      if (!res.startsAt && legs[0].departsAt) res.startsAt = legs[0].departsAt;
      if (!res.endsAt && legs[legs.length - 1].arrivesAt) res.endsAt = legs[legs.length - 1].arrivesAt;
    }
    out.push(res);
    if (out.length >= RESERVATION_MAX) break;
  }
  return out;
}

const PLACE_KIND: Partial<Record<ReservationKind, PlaceKind>> = { hotel: "hotel", restaurant: "restaurant", activity: "attraction" };

/** Hotels, restaurants and venues get a pin when Places finds a matching name; everything else stays as written. */
export async function verifyReservations(reservations: Reservation[]): Promise<Reservation[]> {
  return Promise.all(
    reservations.map(async (res) => {
      const kind = PLACE_KIND[res.kind];
      const name = res.placeName ?? (kind ? res.title : undefined);
      if (!kind || !name) return res;
      try {
        const place = await resolvePointOfInterest([name, res.city].filter(Boolean).join(", "), kind, null);
        if (place && place.source === "google" && namesMatch(name, place.name)) return { ...res, place };
      } catch {
        // stays unpinned
      }
      return res;
    }),
  );
}

export async function reservationsFromText(text: string): Promise<Reservation[]> {
  const body = text.replace(/\r/g, "").trim().slice(0, MAX_CONFIRMATION_TEXT);
  if (body.length < 20) throw new ImportError(422, "That does not look like a confirmation. Paste the whole email or upload the PDF.");
  try {
    const { object } = await generateObject({ model: structuredModel(), schema: reservationSchema, system: SYSTEM, prompt: body, maxRetries: 1 });
    return verifyReservations(normalizeReservations(object));
  } catch (err) {
    if (err instanceof ImportError) throw err;
    throw new ImportError(502, `The model could not read that confirmation (${err instanceof Error ? err.message.slice(0, 120) : "error"}).`);
  }
}

export async function reservationsFromImage(bytes: Uint8Array, mediaType: string): Promise<Reservation[]> {
  try {
    const { object } = await generateObject({
      model: visionModel(),
      schema: reservationSchema,
      system: `${SYSTEM} The content is a screenshot or photo of a confirmation.`,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", image: bytes, mediaType },
            { type: "text", text: "Extract the reservations in this image." },
          ],
        },
      ],
      maxRetries: 1,
    });
    return verifyReservations(normalizeReservations(object));
  } catch (err) {
    if (err instanceof ImportError) throw err;
    throw new ImportError(502, `The model could not read that image (${err instanceof Error ? err.message.slice(0, 120) : "error"}).`);
  }
}

/** Text of a PDF confirmation (all pages), via a pure-JavaScript reader. */
export async function pdfText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  try {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  } catch (err) {
    throw new ImportError(422, `That PDF could not be read (${err instanceof Error ? err.message.slice(0, 80) : "error"}). Try a screenshot of it.`);
  }
}
