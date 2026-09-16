import { resolvePhotoUri } from "@/server/places";
import { getSessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";

/**
 * Serves a Places photo through our own origin: the API key never reaches the
 * browser and the image is not subject to third-party blocking. The upstream
 * URL is resolved once and cached; a stale one is refreshed on failure.
 */
export async function GET(request: Request) {
  if (!(await getSessionUser())) return new Response("Please sign in", { status: 401 });
  const url = new URL(request.url);
  const name = url.searchParams.get("name") ?? "";
  const width = Number(url.searchParams.get("w") ?? "800");
  if (!/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(name)) {
    return new Response("Invalid photo reference", { status: 400 });
  }
  const px = Number.isFinite(width) ? width : 800;
  try {
    let upstream = await fetchPhoto(name, px, false);
    if (!upstream) upstream = await fetchPhoto(name, px, true);
    if (!upstream) return new Response("Photo unavailable", { status: 404 });
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("Photo unavailable", { status: 502 });
  }
}

async function fetchPhoto(name: string, px: number, fresh: boolean): Promise<Response | null> {
  const photoUri = await resolvePhotoUri(name, px, fresh);
  if (!photoUri) return null;
  const res = await fetch(photoUri, { signal: AbortSignal.timeout(15000) });
  if (!res.ok || !res.body) return null;
  return res;
}
