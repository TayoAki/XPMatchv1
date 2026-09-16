import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";

/** A place the model found in the source and Places could verify. */
export interface ImportedPlace {
  name: string;
  kind: PlaceKind;
  /** "mentioned as…" line, at most 160 characters. */
  why: string;
  place: ResolvedPlace;
}

/** A mention that did not resolve through Places; listed, never shown as a card. */
export interface UnverifiedPlace {
  name: string;
  kind: PlaceKind;
  why: string;
}

export interface ImportRecord {
  id: string;
  sourceUrl?: string;
  sourceTitle: string;
  /** Hostname without "www.", or "screenshot" for an uploaded image. */
  site: string;
  destination?: string;
  place?: ResolvedPlace;
  places: ImportedPlace[];
  unverified: UnverifiedPlace[];
  createdAt: string;
  /** True when a repeated URL was served from the seven-day cache (no model call). */
  cached?: boolean;
}

/** Sites whose pages cannot be read without an app; the product answer is the screenshot path. */
export const SCREENSHOT_ONLY_HOSTS = ["instagram.com", "tiktok.com", "facebook.com", "threads.net", "x.com", "twitter.com", "pinterest.com"];

export function screenshotOnlyHost(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return SCREENSHOT_ONLY_HOSTS.find((h) => host === h || host.endsWith(`.${h}`)) ?? null;
}

export const IMPORT_MAX_PLACES = 20;
export const IMPORT_MAX_IMAGE_BYTES = 6 * 1024 * 1024;
