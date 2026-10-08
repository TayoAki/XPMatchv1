import { z } from "zod";
import { DEFAULT_PROFILE } from "@/lib/types";
import { json, parseBody, requireUser, route } from "@/server/http";
import { loadProfile, saveProfile } from "@/server/models";

// Lists over their size are trimmed rather than refused, so one long list never loses a whole save.
const labels = (max: number, length = 40) =>
  z
    .array(z.string().trim().min(1).max(length))
    .default([])
    .transform((list) => list.slice(0, max));
const isoDate = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).default("");

export const profileSchema = z.object({
  name: z.string().max(80).default(""),
  homeCity: z.string().max(120).default(""),
  homeAirport: z.string().max(8).default(""),
  travelStyles: labels(20),
  pace: z.enum(["relaxed", "balanced", "packed"]).default("balanced"),
  budgetTier: z.enum(["budget", "mid-range", "premium", "luxury"]).default("mid-range"),
  companions: z.enum(["solo", "partner", "family", "friends", "mixed"]).default("partner"),
  dietary: z.string().max(300).default(""),
  accommodation: z.string().max(300).default(""),
  notes: z.string().max(2000).default(""),
  learnFromChat: z.boolean().default(true),
  onboarded: z.boolean().default(true),
  interests: labels(20),
  stayTypes: labels(12),
  stayMustHaves: labels(16),
  cuisines: labels(20),
  dietaryTags: labels(10),
  foodAdventure: z.enum(["safe", "mix", "adventurous"]).default("mix"),
  dayRhythm: z.enum(["early", "balanced", "late"]).default("balanced"),
  walking: z.enum(["lots", "moderate", "little"]).default("moderate"),
  transport: z.enum(["walk-transit", "rideshare", "car", "mixed"]).default("mixed"),
  flightPreference: z.enum(["nonstop", "cheapest", "comfort", "flexible"]).default("flexible"),
  nextDestination: z.string().max(120).default(""),
  nextWhen: z.string().max(80).default(""),
  voice: z.string().trim().max(40).default("Aoede"),
  personality: z.enum(["casual", "neutral", "professional"]).default("neutral"),
  splurges: labels(8),
  loyaltyPrograms: labels(12),
  placesBeen: labels(20, 120),
  placesWant: labels(20, 120),
  tripInMind: z.enum(["yes", "no", ""]).default(""),
  nextNotes: z.string().max(2000).default(""),
  nextStartDate: isoDate,
  nextEndDate: isoDate,
  nextTravelers: z.number().int().min(0).max(30).default(0),
});

export const PUT = route(async (request) => {
  const user = await requireUser(request);
  const body = await parseBody(request, profileSchema);
  await saveProfile(user.id, { ...DEFAULT_PROFILE, ...body });
  return json({ profile: await loadProfile(user.id, user.name) });
});
