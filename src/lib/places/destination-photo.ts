"use client";

import { useEffect, useState } from "react";
import { resolvePlaces } from "@/lib/places/client";
import type { ResolvedPlace } from "@/lib/places/types";

const cache = new Map<string, Promise<ResolvedPlace | null>>();

/**
 * Resolves a destination once per browser session. The server answers from its place
 * catalog first, so a destination every visitor sees (the hero, the collection cards)
 * costs one Google lookup per 30 days across all users.
 */
export function resolveDestinationOnce(query: string): Promise<ResolvedPlace | null> {
  const key = query.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  const pending = resolvePlaces({ items: [{ key: "destination", query: query.trim(), kind: "destination" }] })
    .then((res) => res?.items[0]?.place ?? null)
    .catch(() => null);
  cache.set(key, pending);
  return pending;
}

/** The resolved destination for a query (null while loading, or when nothing matched). */
export function useDestinationPlace(query: string | null): { place: ResolvedPlace | null; loading: boolean } {
  const [state, setState] = useState<{ query: string; place: ResolvedPlace | null } | null>(null);
  useEffect(() => {
    if (!query) return;
    let active = true;
    resolveDestinationOnce(query).then((place) => {
      if (active) setState({ query, place });
    });
    return () => {
      active = false;
    };
  }, [query]);
  const ready = !!query && state?.query === query;
  return { place: ready && state ? state.place : null, loading: !!query && !ready };
}

/** The same proxied Places photo at another maximum width (the proxy honors `w`). */
export function photoAtWidth(url: string, width: number): string {
  try {
    const u = new URL(url, "http://local.invalid");
    u.searchParams.set("w", String(width));
    return `${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

/** "Paros, Greece": the place name and the country from its formatted address. */
export function destinationCaption(place: ResolvedPlace | null, fallback: string): string {
  if (!place) return fallback;
  const country = place.address?.split(",").map((s) => s.trim()).filter(Boolean).pop();
  if (country && country.toLowerCase() !== place.name.toLowerCase()) return `${place.name}, ${country}`;
  return place.locality && place.locality.toLowerCase() !== place.name.toLowerCase() ? place.locality : place.name;
}
