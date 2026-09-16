"use client";

/**
 * Minimal loader for the Maps JavaScript API (async bootstrap + callback).
 * The browser key is public by design; restrict it to your domains in Google
 * Cloud (HTTP referrers) and to the Maps JavaScript API only.
 */

type GoogleGlobal = typeof google;
type MapsWindow = Window & {
  google?: GoogleGlobal;
  __xpMapsReady?: () => void;
  gm_authFailure?: () => void;
};

let loading: Promise<GoogleGlobal> | null = null;
const authFailureListeners = new Set<() => void>();
let authFailed = false;

export function googleMapsBrowserKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined;
}

export function googleMapsMapId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
}

/** Google calls `gm_authFailure` when the key is invalid or blocked for this origin. */
export function onGoogleMapsAuthFailure(listener: () => void): () => void {
  if (authFailed) listener();
  authFailureListeners.add(listener);
  return () => {
    authFailureListeners.delete(listener);
  };
}

export function loadGoogleMaps(): Promise<GoogleGlobal> {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Maps can only load in the browser"));
  const w = window as MapsWindow;
  if (w.google?.maps?.importLibrary) return Promise.resolve(w.google);
  if (loading) return loading;
  const key = googleMapsBrowserKey();
  if (!key) return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set"));

  loading = new Promise<GoogleGlobal>((resolve, reject) => {
    w.__xpMapsReady = () => {
      if (w.google) resolve(w.google);
      else reject(new Error("Google Maps did not initialize"));
    };
    w.gm_authFailure = () => {
      authFailed = true;
      authFailureListeners.forEach((l) => l());
    };
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key,
      v: "weekly",
      loading: "async",
      libraries: "marker",
      callback: "__xpMapsReady",
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(new Error("Could not load Google Maps (network blocked or key restricted)"));
    };
    document.head.appendChild(script);
  });
  return loading;
}
