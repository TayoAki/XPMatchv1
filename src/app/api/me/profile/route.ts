import { z } from "zod";
import { DEFAULT_PROFILE } from "@/lib/types";
import { json, parseBody, requireUser, route } from "@/server/http";
import { loadProfile, saveProfile } from "@/server/models";

const labels = (max: number) => z.array(z.string().trim().min(1).max(40)).max(max).default([]);

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
});

export const PUT = route(async (request) => {
  const user = await requireUser(request);
  const body = await parseBody(request, profileSchema);
  await saveProfile(user.id, { ...DEFAULT_PROFILE, ...body });
  return json({ profile: await loadProfile(user.id, user.name) });
});
