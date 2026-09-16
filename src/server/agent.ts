import { BuiltInAgent, defineTool } from "@copilotkit/runtime/v2";
import { z } from "zod";
import { TRAVEL_AGENT_PROMPT } from "@/lib/travel/prompt";
import { createDemoTravelModel } from "./demo-model";
import { OPENROUTER_PREFIX, createOpenRouterModel, modelMode, resolveModelSpec } from "./model";

export { DEFAULT_ANTHROPIC_MODEL, DEFAULT_OPENROUTER_MODEL, DEMO_MODEL, OPENROUTER_PREFIX, modelMode, resolveModelSpec, type ModelMode } from "./model";

/**
 * Provider options for Anthropic models that support adaptive thinking and the
 * effort parameter (Claude 4.6+ / 5 families). Older models reject these, so
 * they are only attached when the model id matches.
 */
function providerOptionsFor(spec: string): Record<string, unknown> | undefined {
  if (!spec.startsWith("anthropic/")) return undefined;
  const supportsEffort = /claude-(opus-5|opus-4-[6-9]|sonnet-5|sonnet-4-6|fable-5)/.test(spec);
  if (!supportsEffort) return undefined;
  const effort = process.env.COPILOT_EFFORT?.trim() || "medium";
  return {
    anthropic: {
      thinking: { type: "adaptive" },
      effort,
    },
  };
}

const fetchJson = async (url: string, init?: RequestInit): Promise<unknown> => {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "User-Agent": "XPMatch/0.1 (travel planner; contact: hello@xpmatch.local)",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

const WMO: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
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
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Heavy showers",
  82: "Violent showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Severe thunderstorm",
};

const cToF = (c: number) => Math.round((c * 9) / 5 + 32);

const weatherTool = defineTool({
  name: "get_weather_outlook",
  description:
    "Daily weather outlook for a city for up to the next 16 days (highs, lows, rain chance). Use it for packing advice or day-by-day timing when the trip is soon. Data from Open-Meteo.",
  parameters: z.object({
    location: z.string().describe("City name, optionally with region or country, e.g. 'Dallas, Texas'"),
    startDate: z.string().optional().describe("YYYY-MM-DD, within the next 16 days"),
    endDate: z.string().optional().describe("YYYY-MM-DD, within the next 16 days"),
  }),
  execute: async ({ location, startDate, endDate }) => {
    try {
      const geo = (await fetchJson(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
      )) as {
        results?: Array<{ latitude: number; longitude: number; name: string; country?: string; admin1?: string }>;
      };
      const place = geo.results?.[0];
      if (!place) return { error: `Could not find a location matching "${location}".` };

      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(place.latitude));
      url.searchParams.set("longitude", String(place.longitude));
      url.searchParams.set(
        "daily",
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      );
      url.searchParams.set("timezone", "auto");
      const iso = /^\d{4}-\d{2}-\d{2}$/;
      if (startDate && endDate && iso.test(startDate) && iso.test(endDate)) {
        url.searchParams.set("start_date", startDate);
        url.searchParams.set("end_date", endDate);
      } else {
        url.searchParams.set("forecast_days", "16");
      }
      const forecast = (await fetchJson(url.toString())) as {
        timezone?: string;
        daily?: {
          time: string[];
          weather_code: number[];
          temperature_2m_max: number[];
          temperature_2m_min: number[];
          precipitation_probability_max: (number | null)[];
        };
      };
      const daily = forecast.daily;
      if (!daily) return { error: "No forecast data returned." };
      return {
        location: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
        timezone: forecast.timezone,
        days: daily.time.map((date, i) => ({
          date,
          summary: WMO[daily.weather_code[i]] ?? "Mixed",
          highC: Math.round(daily.temperature_2m_max[i]),
          lowC: Math.round(daily.temperature_2m_min[i]),
          highF: cToF(daily.temperature_2m_max[i]),
          lowF: cToF(daily.temperature_2m_min[i]),
          rainChancePct: daily.precipitation_probability_max[i] ?? null,
        })),
      };
    } catch (err) {
      return { error: `Weather lookup failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
});

const destinationFactsTool = defineTool({
  name: "get_destination_facts",
  description:
    "Short encyclopedic summary of a destination or landmark (from Wikipedia). Use it to ground recommendations when you are unsure about a place.",
  parameters: z.object({
    title: z.string().describe("Place name as it would appear on Wikipedia, e.g. 'Lisbon' or 'Eiffel Tower'"),
  }),
  execute: async ({ title }) => {
    try {
      const data = (await fetchJson(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      )) as {
        title?: string;
        description?: string;
        extract?: string;
        content_urls?: { desktop?: { page?: string } };
        coordinates?: { lat: number; lon: number };
      };
      return {
        title: data.title,
        description: data.description,
        extract: data.extract,
        url: data.content_urls?.desktop?.page,
        coordinates: data.coordinates,
      };
    } catch (err) {
      return { error: `Lookup failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
});

export function createTravelAgent(): BuiltInAgent {
  const spec = resolveModelSpec();
  const demo = modelMode(spec) === "demo";
  const model = demo
    ? createDemoTravelModel()
    : spec.startsWith(OPENROUTER_PREFIX)
      ? createOpenRouterModel(spec.slice(OPENROUTER_PREFIX.length))
      : spec;
  return new BuiltInAgent({
    model,
    prompt: TRAVEL_AGENT_PROMPT,
    // Let the agent chain a lookup (weather/facts) into a recommendation within one run.
    maxSteps: 6,
    tools: [weatherTool, destinationFactsTool],
    providerOptions: providerOptionsFor(spec),
  });
}
