import { z } from "zod";
import { HttpError, json, parseBody, requireUser, route } from "@/server/http";
import { assertLookupBudget } from "@/server/lookup-budget";
import { loadPreferences, loadProfile } from "@/server/models";
import { loadPackageCalibration } from "@/server/package-learning";
import { buildPackages } from "@/server/packages";
import { loadRecFeedback } from "@/server/recs";
import { loadTaste } from "@/server/taste";

export const dynamic = "force-dynamic";

const constraintsSchema = z.object({
  budgetShift: z.union([z.literal(-1), z.literal(0), z.literal(1)]).optional(),
  pace: z.enum(["relaxed", "balanced", "packed"]).optional(),
  walkable: z.boolean().optional(),
  interestsOff: z.array(z.string().max(60)).max(20).optional(),
  stayTypesOff: z.array(z.string().max(60)).max(20).optional(),
  cuisinesOff: z.array(z.string().max(60)).max(20).optional(),
  categoriesOff: z.array(z.string().max(60)).max(20).optional(),
});

const bodySchema = z.object({
  destination: z.string().trim().min(1).max(160),
  locks: z.array(z.string().max(200)).max(30).optional(),
  excluded: z.array(z.string().max(200)).max(200).optional(),
  constraints: constraintsSchema.optional(),
});

/** One personalized package for a destination in three variants, built from the place catalog. */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const body = await parseBody(request, bodySchema);
  // Building a package is one lookup for the budget: the places come from the catalog, Google only seeds a thin city.
  assertLookupBudget(user.id, 1);
  const [profile, taste, preferences, recFeedback, packageCalibration] = await Promise.all([
    loadProfile(user.id, user.name),
    loadTaste(user.id),
    loadPreferences(user.id),
    loadRecFeedback(user.id),
    loadPackageCalibration(user.id),
  ]);
  const result = await buildPackages(body, { profile, taste, preferences, recFeedback, packageCalibration });
  if (!result) throw new HttpError(404, `Couldn't place "${body.destination}" on the map`);
  return json({ package: result });
});
