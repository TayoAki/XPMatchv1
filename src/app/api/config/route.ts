import { modelMode, resolveModelSpec } from "@/server/agent";

export const dynamic = "force-dynamic";

/** Tells the client whether the assistant runs against a live model or in offline demo mode. */
export function GET() {
  const model = resolveModelSpec();
  return Response.json({ mode: modelMode(model), model });
}
