import { modelMode, resolveModelSpec } from "@/server/agent";
import { placesProvider } from "@/server/places";

export const dynamic = "force-dynamic";

/** Tells the client whether the assistant runs against a live model or in offline demo mode, and whether the voice interview is set up. */
export function GET() {
  const model = resolveModelSpec();
  return Response.json({ mode: modelMode(model), model, places: placesProvider(), voice: !!process.env.GEMINI_API_KEY?.trim() });
}
