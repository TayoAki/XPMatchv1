"use client";

import type { PlaceDetails, ResolveRequest, ResolveResponse } from "@/lib/places/types";

export async function resolvePlaces(request: ResolveRequest): Promise<ResolveResponse | null> {
  try {
    const res = await fetch("/api/places/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) return null;
    return (await res.json()) as ResolveResponse;
  } catch {
    return null;
  }
}

const detailCache = new Map<string, Promise<PlaceDetails | null>>();

export function fetchPlaceDetails(id: string): Promise<PlaceDetails | null> {
  const hit = detailCache.get(id);
  if (hit) return hit;
  const p = fetch(`/api/places/${encodeURIComponent(id)}`)
    .then((r) => (r.ok ? (r.json() as Promise<PlaceDetails>) : null))
    .catch(() => null);
  detailCache.set(id, p);
  return p;
}

export interface CurrentWeather {
  tempC: number;
  tempF: number;
  code: number;
  summary: string;
}

export async function fetchWeather(lat: number, lng: number): Promise<CurrentWeather | null> {
  try {
    const res = await fetch(`/api/weather?lat=${lat.toFixed(3)}&lng=${lng.toFixed(3)}`);
    if (!res.ok) return null;
    return (await res.json()) as CurrentWeather;
  } catch {
    return null;
  }
}
