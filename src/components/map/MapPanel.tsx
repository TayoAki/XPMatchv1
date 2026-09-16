"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Layers, MapPin, PanelLeftClose, Search, Sun, X } from "lucide-react";
import { FOCUS_KEY, mapActions, useMapView } from "@/lib/map-store";
import { fetchWeather, resolvePlaces, type CurrentWeather } from "@/lib/places/client";
import type { MapPlace, ResolvedPlace } from "@/lib/places/types";
import { googleMapsBrowserKey, googleMapsMapId, loadGoogleMaps, onGoogleMapsAuthFailure } from "./googleMapsLoader";
import { buildMarkerElement, iconSvg, setMarkerState } from "./markerIcons";
import { PlaceDetailSheet } from "./PlaceDetailSheet";

type MapStatus = "loading" | "ready" | "error";

interface MarkerHandle {
  marker: google.maps.marker.AdvancedMarkerElement;
  element: HTMLElement;
}

interface WantedMarker {
  position: google.maps.LatLngLiteral;
  place: ResolvedPlace;
  focus: boolean;
}

/** Imperative reconciliation of Google marker objects against the wanted set. */
function syncMarkers(
  map: google.maps.Map,
  handles: Map<string, MarkerHandle>,
  wanted: Map<string, WantedMarker>,
  selectedKey: string | null,
  hoveredKey: string | null,
  onSelect: (key: string) => void,
) {
  const { AdvancedMarkerElement } = google.maps.marker;
  for (const [key, handle] of handles) {
    if (!wanted.has(key)) {
      handle.marker.map = null;
      handles.delete(key);
    }
  }
  for (const [key, item] of wanted) {
    let handle = handles.get(key);
    if (!handle) {
      const element = buildMarkerElement(item.place.kind, item.place.name, { focus: item.focus });
      const marker = new AdvancedMarkerElement({
        map,
        position: item.position,
        content: element,
        title: item.place.name,
      });
      marker.addListener("click", () => onSelect(key));
      element.addEventListener("mouseenter", () => mapActions.setHovered(key));
      element.addEventListener("mouseleave", () => mapActions.setHovered(null));
      handle = { marker, element };
      handles.set(key, handle);
    }
    setMarkerState(handle.element, { selected: selectedKey === key, hovered: hoveredKey === key });
    handle.marker.zIndex = selectedKey === key ? 100 : item.focus ? 1 : 10;
  }
}

function clearMarkers(handles: Map<string, MarkerHandle>) {
  handles.forEach(({ marker }) => {
    marker.map = null;
  });
  handles.clear();
}

function fitToPlaces(map: google.maps.Map, focus: ResolvedPlace | null, places: MapPlace[]) {
  if (places.length === 0 && focus) {
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
  if (places.length === 0) return;
  const bounds = new google.maps.LatLngBounds();
  for (const p of places) bounds.extend({ lat: p.lat, lng: p.lng });
  if (places.length === 1) {
    map.setCenter(bounds.getCenter());
    map.setZoom(places[0].kind === "destination" ? 11 : 15);
    return;
  }
  map.fitBounds(bounds, { top: 96, bottom: 96, left: 72, right: 72 });
}

export function MapPanel() {
  const view = useMapView();
  const { threadId, focus, placeList, selectedKey, hoveredKey, selected } = view;
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerHandle>>(new Map());
  const [status, setStatus] = useState<MapStatus>(googleMapsBrowserKey() ? "loading" : "error");
  const [error, setError] = useState<string | null>(
    googleMapsBrowserKey() ? null : "Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local to show the live map.",
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [weatherState, setWeatherState] = useState<{ id: string; data: CurrentWeather | null } | null>(null);
  const [satellite, setSatellite] = useState(false);
  const weather = focus && weatherState?.id === focus.id ? weatherState.data : null;

  /* ----- create the map once ----- */
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

  /* ----- keep markers in sync with pinned places ----- */
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || !threadId) return;
    const wanted = new Map<string, WantedMarker>();
    if (focus) wanted.set(FOCUS_KEY, { position: { lat: focus.lat, lng: focus.lng }, place: focus, focus: true });
    for (const p of placeList) wanted.set(p.key, { position: { lat: p.lat, lng: p.lng }, place: p, focus: false });
    syncMarkers(map, markersRef.current, wanted, selectedKey, hoveredKey, (key) => mapActions.selectPlace(threadId, key));
  }, [status, threadId, focus, placeList, selectedKey, hoveredKey]);

  /* ----- fit the view when the set of places changes ----- */
  const fitSignature = `${focus?.id ?? ""}|${placeList.map((p) => p.key).join(",")}`;
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map) return;
    fitToPlaces(map, focus, placeList);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fitSignature summarizes focus + placeList
  }, [status, fitSignature]);

  /* ----- pan to the selection if it is off screen ----- */
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || !selected) return;
    const pos = { lat: selected.lat, lng: selected.lng };
    const bounds = map.getBounds();
    if (!bounds || !bounds.contains(pos)) map.panTo(pos);
  }, [status, selected]);

  /* ----- weather chip for the destination ----- */
  useEffect(() => {
    if (!focus) return;
    let active = true;
    const id = focus.id;
    fetchWeather(focus.lat, focus.lng).then((data) => {
      if (active) setWeatherState({ id, data });
    });
    return () => {
      active = false;
    };
  }, [focus]);

  const toggleSatellite = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const next = !satellite;
    map.setMapTypeId(next ? "hybrid" : "roadmap");
    setSatellite(next);
  }, [satellite]);

  const runSearch = useCallback(async () => {
    const query = searchText.trim();
    if (!query || !threadId) return;
    setSearching(true);
    const key = `search:${Date.now()}`;
    const res = await resolvePlaces({
      destination: focus?.name,
      items: [{ key, query, kind: "attraction" }],
    });
    setSearching(false);
    const place = res?.items[0]?.place;
    if (!place) return;
    const pinned: MapPlace = { ...place, key, toolCallId: "search" };
    mapActions.addPlaces(threadId, [pinned]);
    mapActions.selectPlace(threadId, key);
    setSearchText("");
    setSearchOpen(false);
  }, [searchText, threadId, focus]);

  const collapse = () => threadId && mapActions.setCollapsed(threadId, true);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#e9e6df]" data-testid="map-panel">
      <div ref={mapEl} className="absolute inset-0" />

      {status !== "ready" ? (
        <MapFallback status={status} error={error} focus={focus} places={placeList} />
      ) : null}

      {/* Top-left controls */}
      <div className="absolute left-4 top-4 flex items-center gap-2">
        <button
          type="button"
          onClick={collapse}
          aria-label="Hide map"
          title="Hide map"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md hover:bg-neutral-50"
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setSearchOpen((v) => !v)}
          aria-label="Search the map"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md hover:bg-neutral-50"
        >
          {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
        </button>
        {searchOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch();
            }}
            className="flex h-11 items-center rounded-full bg-white pl-4 pr-1 shadow-md"
          >
            <input
              autoFocus
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={focus ? `Search near ${focus.name}` : "Search a place"}
              className="w-56 bg-transparent text-[14px] outline-none placeholder:text-neutral-400"
            />
            <button
              type="submit"
              disabled={searching || !searchText.trim()}
              className="h-9 rounded-full bg-neutral-900 px-3 text-[13px] font-semibold text-white disabled:opacity-40"
            >
              {searching ? "…" : "Pin it"}
            </button>
          </form>
        ) : focus ? (
          <button
            type="button"
            onClick={() => threadId && mapActions.selectPlace(threadId, FOCUS_KEY)}
            className="flex h-11 items-center gap-2 rounded-full bg-white pl-3 pr-4 text-[14px] font-semibold shadow-md hover:bg-neutral-50"
          >
            <MapPin className="h-4 w-4" />
            {focus.name}
            {placeList.length ? <span className="text-[12px] font-medium text-muted">{placeList.length} pinned</span> : null}
          </button>
        ) : null}
      </div>

      {/* Map type toggle */}
      {status === "ready" ? (
        <button
          type="button"
          onClick={toggleSatellite}
          aria-label="Toggle satellite view"
          aria-pressed={satellite}
          className="absolute bottom-[132px] right-[10px] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md hover:bg-neutral-50"
        >
          <Layers className="h-5 w-5" />
        </button>
      ) : null}

      {/* Weather chip */}
      {weather ? (
        <div className="absolute bottom-6 left-4 flex h-9 items-center gap-1.5 rounded-full bg-white/95 px-3 text-[13px] font-medium shadow-md">
          <Sun className="h-4 w-4 text-amber-500" />
          <span>{weather.tempF}°F</span>
          <span className="text-muted">{weather.summary}</span>
        </div>
      ) : null}

      {selected ? (
        <PlaceDetailSheet
          key={selectedKey ?? "none"}
          place={selected}
          focusName={focus?.name}
          onClose={() => threadId && mapActions.selectPlace(threadId, null)}
          onCollapse={collapse}
        />
      ) : null}
    </div>
  );
}

function MapFallback({
  status,
  error,
  focus,
  places,
}: {
  status: MapStatus;
  error: string | null;
  focus: ResolvedPlace | null;
  places: MapPlace[];
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_50%_40%,#f3f4f6,#e5e7eb)] px-8 text-center">
      {status === "loading" ? (
        <div className="text-[14px] text-muted">Loading map…</div>
      ) : (
        <>
          <div className="max-w-md text-[14px] text-neutral-700">{error}</div>
          {focus ? (
            <div className="rounded-2xl bg-white px-5 py-4 text-left shadow-sm">
              <div className="text-[15px] font-semibold">{focus.name}</div>
              {focus.locality ? <div className="text-[13px] text-muted">{focus.locality}</div> : null}
              {places.length ? (
                <ul className="mt-3 grid gap-1.5">
                  {places.slice(0, 8).map((p) => (
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
