import { z } from "zod";
import { DEFAULT_PROFILE } from "@/lib/types";
import { json, parseBody, requireUser, route } from "@/server/http";
import { loadProfile, saveProfile } from "@/server/models";

const schema = z.object({
  name: z.string().max(80).default(""),
  homeCity: z.string().max(120).default(""),
  homeAirport: z.string().max(8).default(""),
  travelStyles: z.array(z.string().max(40)).max(20).default([]),
  pace: z.enum(["relaxed", "balanced", "packed"]).default("balanced"),
  budgetTier: z.enum(["budget", "mid-range", "premium", "luxury"]).default("mid-range"),
  companions: z.enum(["solo", "partner", "family", "friends", "mixed"]).default("partner"),
  dietary: z.string().max(300).default(""),
  accommodation: z.string().max(300).default(""),
  notes: z.string().max(2000).default(""),
  learnFromChat: z.boolean().default(true),
  onboarded: z.boolean().default(true),
});

export const PUT = route(async (request) => {
  const user = await requireUser(request);
  const body = await parseBody(request, schema);
  await saveProfile(user.id, { ...DEFAULT_PROFILE, ...body });
  return json({ profile: await loadProfile(user.id, user.name) });
});
