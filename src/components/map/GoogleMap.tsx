"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ResolvedPlace } from "@/lib/places/types";
import { googleMapsBrowserKey, googleMapsMapId, loadGoogleMaps, onGoogleMapsAuthFailure } from "./googleMapsLoader";
import { buildMarkerElement, iconSvg, setMarkerState } from "./markerIcons";

export type MapStatus = "loading" | "ready" | "error";

export interface MapPin extends ResolvedPlace {
  key: string;
}

interface MarkerHandle {
  marker: google.maps.marker.AdvancedMarkerElement;
  element: HTMLElement;
}

export const FOCUS_PIN_KEY = "__focus__";

/** Imperative reconciliation of Google marker objects against the wanted set. */
function syncMarkers(
  map: google.maps.Map,
  handles: Map<string, MarkerHandle>,
  focus: ResolvedPlace | null,
  pins: MapPin[],
  selectedKey: string | null,
  hoveredKey: string | null,
  labels: boolean,
  onSelect: (key: string) => void,
  onHover: (key: string | null) => void,
) {
  const { AdvancedMarkerElement } = google.maps.marker;
  const wanted = new Map<string, { place: ResolvedPlace; focus: boolean }>();
  if (focus) wanted.set(FOCUS_PIN_KEY, { place: focus, focus: true });
  for (const p of pins) wanted.set(p.key, { place: p, focus: false });

  for (const [key, handle] of handles) {
    if (!wanted.has(key)) {
      handle.marker.map = null;
      handles.delete(key);
    }
  }
  for (const [key, item] of wanted) {
    let handle = handles.get(key);
    if (!handle) {
      const element = buildMarkerElement(item.place.kind, item.place.name, {
        focus: item.focus,
        label: labels && !item.focus ? item.place.name : undefined,
      });
      const marker = new AdvancedMarkerElement({
        map,
        position: { lat: item.place.lat, lng: item.place.lng },
        content: element,
        title: item.place.name,
      });
      marker.addListener("click", () => onSelect(key));
      element.addEventListener("mouseenter", () => onHover(key));
      element.addEventListener("mouseleave", () => onHover(null));
      handle = { marker, element };
      handles.set(key, handle);
    } else {
      handle.marker.position = { lat: item.place.lat, lng: item.place.lng };
    }
    setMarkerState(handle.element, { selected: selectedKey === key, hovered: hoveredKey === key });
    handle.marker.zIndex = selectedKey === key ? 100 : hoveredKey === key ? 50 : item.focus ? 1 : 10;
  }
}

function clearMarkers(handles: Map<string, MarkerHandle>) {
  handles.forEach(({ marker }) => {
    marker.map = null;
  });
  handles.clear();
}

function fitToPlaces(map: google.maps.Map, focus: ResolvedPlace | null, pins: MapPin[]) {
  if (pins.length === 0 && focus) {
    if (focus.viewport) {
      map.fitBounds(
        new google.maps.LatLngBounds(
          { lat: focus.viewport.south, lng: focus.viewport.west },
          { lat: focus.viewport.north, lng: focus.viewport.east },
        ),
        40,
      );
    } else {
      map.setCenter({ lat: focus.lat, lng: focus.lng });
      map.setZoom(11);
    }
    return;
  }
  if (pins.length === 0) return;
  const bounds = new google.maps.LatLngBounds();
  for (const p of pins) bounds.extend({ lat: p.lat, lng: p.lng });
  if (pins.length === 1) {
    map.setCenter(bounds.getCenter());
    map.setZoom(pins[0].kind === "destination" ? 11 : 15);
    return;
  }
  map.fitBounds(bounds, { top: 96, bottom: 96, left: 72, right: 72 });
}

export interface GoogleMapProps {
  focus?: ResolvedPlace | null;
  pins: MapPin[];
  selectedKey?: string | null;
  hoveredKey?: string | null;
  onSelect?: (key: string) => void;
  onHover?: (key: string | null) => void;
  /** Show place names next to markers (Explore style). */
  labels?: boolean;
  /** Satellite imagery toggle, controlled by the parent. */
  satellite?: boolean;
  className?: string;
  /** Overlay content rendered above the map (controls, chips, sheets). */
  children?: ReactNode;
  onStatusChange?: (status: MapStatus, error: string | null) => void;
}

/**
 * Reusable Google Map with advanced markers: a black destination pin plus teal
 * category pins that stay in sync with `pins`, fitting the view as they change.
 * Renders a list fallback when the Maps script cannot load.
 */
export function GoogleMap({
  focus = null,
  pins,
  selectedKey = null,
  hoveredKey = null,
  onSelect,
  onHover,
  labels = false,
  satellite = false,
  className,
  children,
  onStatusChange,
}: GoogleMapProps) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerHandle>>(new Map());
  const [status, setStatus] = useState<MapStatus>(googleMapsBrowserKey() ? "loading" : "error");
  const [error, setError] = useState<string | null>(
    googleMapsBrowserKey() ? null : "Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local to show the live map.",
  );
  const selectRef = useRef(onSelect);
  const hoverRef = useRef(onHover);
  useEffect(() => {
    selectRef.current = onSelect;
    hoverRef.current = onHover;
  }, [onSelect, onHover]);

  useEffect(() => {
    onStatusChange?.(status, error);
  }, [status, error, onStatusChange]);

  useEffect(() => {
    if (!googleMapsBrowserKey()) return;
    let cancelled = false;
    const stopAuthWatch = onGoogleMapsAuthFailure(() => {
      setError("Google Maps rejected this API key for this origin. Check the key's restrictions in Google Cloud.");
      setStatus("error");
    });
    loadGoogleMaps()
      .then(async (g) => {
        if (cancelled || !mapEl.current) return;
        const { Map: GMap } = (await g.maps.importLibrary("maps")) as google.maps.MapsLibrary;
        await g.maps.importLibrary("marker");
        if (cancelled || !mapEl.current) return;
        mapRef.current = new GMap(mapEl.current, {
          center: { lat: 20, lng: 0 },
          zoom: 2,
          mapId: googleMapsMapId(),
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: g.maps.ControlPosition.RIGHT_BOTTOM },
          clickableIcons: false,
          gestureHandling: "greedy",
        });
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load Google Maps");
        setStatus("error");
      });
    const handles = markersRef.current;
    return () => {
      cancelled = true;
      stopAuthWatch();
      clearMarkers(handles);
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map) return;
    syncMarkers(
      map,
      markersRef.current,
      focus,
      pins,
      selectedKey,
      hoveredKey,
      labels,
      (key) => selectRef.current?.(key),
      (key) => hoverRef.current?.(key),
    );
  }, [status, focus, pins, selectedKey, hoveredKey, labels]);

  const fitSignature = `${focus?.id ?? ""}|${pins.map((p) => p.key).join(",")}`;
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map) return;
    fitToPlaces(map, focus, pins);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fitSignature summarizes focus + pins
  }, [status, fitSignature]);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || !selectedKey) return;
    const target = selectedKey === FOCUS_PIN_KEY ? focus : pins.find((p) => p.key === selectedKey);
    if (!target) return;
    const pos = { lat: target.lat, lng: target.lng };
    const bounds = map.getBounds();
    if (!bounds || !bounds.contains(pos)) map.panTo(pos);
  }, [status, selectedKey, focus, pins]);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map) return;
    map.setMapTypeId(satellite ? "hybrid" : "roadmap");
  }, [status, satellite]);

  return (
    <div className={className ?? "relative h-full w-full overflow-hidden bg-[#e9e6df]"}>
      <div ref={mapEl} className="absolute inset-0" />
      {status !== "ready" ? <MapFallback status={status} error={error} focus={focus} pins={pins} /> : null}
      {children}
    </div>
  );
}

function MapFallback({ status, error, focus, pins }: { status: MapStatus; error: string | null; focus: ResolvedPlace | null; pins: MapPin[] }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_50%_40%,#f3f4f6,#e5e7eb)] px-8 text-center">
      {status === "loading" ? (
        <div className="text-[14px] text-muted">Loading map…</div>
      ) : (
        <>
          <div className="max-w-md text-[14px] text-neutral-700">{error}</div>
          {focus || pins.length ? (
            <div className="max-h-[60%] overflow-y-auto rounded-2xl bg-white px-5 py-4 text-left shadow-sm">
              {focus ? (
                <>
                  <div className="text-[15px] font-semibold">{focus.name}</div>
                  {focus.locality ? <div className="text-[13px] text-muted">{focus.locality}</div> : null}
                </>
              ) : null}
              {pins.length ? (
                <ul className="mt-3 grid gap-1.5">
                  {pins.slice(0, 12).map((p) => (
                    <li key={p.key} className="flex items-center gap-2 text-[13px]">
                      <span className="text-neutral-500" dangerouslySetInnerHTML={{ __html: iconSvg(p.kind, 14) }} />
                      {p.name}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
