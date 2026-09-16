export const dynamic = "force-dynamic";

const WMO: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Icy fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Showers",
  81: "Heavy showers",
  82: "Violent showers",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Severe thunderstorm",
};

/** Current conditions for the map's weather chip (Open-Meteo, no key needed). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "lat and lng are required" }, { status: 400 });
  }
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=auto`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return Response.json({ error: "Weather unavailable" }, { status: 502 });
    const data = (await res.json()) as { current?: { temperature_2m: number; weather_code: number } };
    const current = data.current;
    if (!current) return Response.json({ error: "Weather unavailable" }, { status: 502 });
    return Response.json(
      {
        tempC: Math.round(current.temperature_2m),
        tempF: Math.round((current.temperature_2m * 9) / 5 + 32),
        code: current.weather_code,
        summary: WMO[current.weather_code] ?? "Mixed",
      },
      { headers: { "Cache-Control": "public, max-age=900" } },
    );
  } catch {
    return Response.json({ error: "Weather unavailable" }, { status: 502 });
  }
}
