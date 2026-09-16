import { getPlaceDetails } from "@/server/place-facts";
import { getSessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getSessionUser())) return Response.json({ error: "Please sign in" }, { status: 401 });
  const { id } = await context.params;
  if (!id || id.length > 200) return Response.json({ error: "Invalid id" }, { status: 400 });
  try {
    const details = await getPlaceDetails(id);
    if (!details) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(details, { headers: { "Cache-Control": "private, max-age=600" } });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Lookup failed" }, { status: 502 });
  }
}
