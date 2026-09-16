import { resolvePhotoUri } from "@/server/places";

export const dynamic = "force-dynamic";

/** Redirects a Places photo reference to its image so the API key never reaches the browser. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name") ?? "";
  const width = Number(url.searchParams.get("w") ?? "800");
  if (!/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(name)) {
    return new Response("Invalid photo reference", { status: 400 });
  }
  try {
    const photoUri = await resolvePhotoUri(name, Number.isFinite(width) ? width : 800);
    if (!photoUri) return new Response("Photo unavailable", { status: 404 });
    return new Response(null, {
      status: 302,
      headers: { Location: photoUri, "Cache-Control": "public, max-age=43200" },
    });
  } catch {
    return new Response("Photo unavailable", { status: 502 });
  }
}
