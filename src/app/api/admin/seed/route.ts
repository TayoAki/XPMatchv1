import { z } from "zod";
import { requireAdmin } from "@/server/admin";
import { HttpError, json, parseBody, route } from "@/server/http";
import { resolveDestination } from "@/server/places";
import { seedDestination } from "@/server/seed";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ destination: z.string().trim().min(2).max(120) });

/** Admin: fill the catalog for a city with list searches (about twenty places per search, once). */
export const POST = route(async (request) => {
  await requireAdmin(request);
  const body = await parseBody(request, bodySchema);
  const destination = await resolveDestination(body.destination);
  if (!destination || destination.source !== "google") throw new HttpError(404, "Couldn't find that destination on Google Places");
  const result = await seedDestination(destination);
  return json({ destination: { id: destination.id, name: destination.name, locality: destination.locality ?? null }, ...result });
});
