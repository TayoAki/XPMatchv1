import { getDb } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    await db.query("SELECT 1");
    return Response.json({ ok: true, db: db.driver });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "db unavailable" }, { status: 503 });
  }
}
