"use client";

import { useCallback, useEffect, useState } from "react";
import { Layers, MapPin, PanelLeftClose, Search, Sun, X } from "lucide-react";
import { FOCUS_KEY, mapActions, useMapView } from "@/lib/map-store";
import { fetchWeather, resolvePlaces, type CurrentWeather } from "@/lib/places/client";
import type { MapPlace } from "@/lib/places/types";
import { GoogleMap, type MapStatus } from "./GoogleMap";
import { PinStrip } from "./PinStrip";
import { PlaceDetailSheet } from "./PlaceDetailSheet";

/** Chat companion map: pins from the conversation, a destination chip, search, weather and the place sheet. */
export function MapPanel() {
  const view = useMapView();
  const { threadId, focus, placeList, selectedKey, hoveredKey, selected } = view;
  const [status, setStatus] = useState<MapStatus>("loading");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [weatherState, setWeatherState] = useState<{ id: string; data: CurrentWeather | null } | null>(null);
  const [satellite, setSatellite] = useState(false);
  const weather = focus && weatherState?.id === focus.id ? weatherState.data : null;

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

  const onStatusChange = useCallback((next: MapStatus) => setStatus(next), []);
  const onSelect = useCallback((key: string) => threadId && mapActions.selectPlace(threadId, key), [threadId]);
  const onHover = useCallback((key: string | null) => mapActions.setHovered(key), []);

  const runSearch = useCallback(async () => {
    const query = searchText.trim();
    if (!query || !threadId) return;
    setSearching(true);
    const key = `search:${Date.now()}`;
    const res = await resolvePlaces({ destination: focus?.name, items: [{ key, query, kind: "attraction" }] });
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
    <div className="relative h-full w-full" data-testid="map-panel">
      <GoogleMap
        focus={focus}
        pins={placeList}
        selectedKey={selectedKey}
        hoveredKey={hoveredKey}
        onSelect={onSelect}
        onHover={onHover}
        satellite={satellite}
        onStatusChange={onStatusChange}
      >
        {/* Top-left controls */}
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <button type="button" onClick={collapse} aria-label="Hide map" title="Hide map" className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md hover:bg-neutral-50">
            <PanelLeftClose className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setSearchOpen((v) => !v)} aria-label="Search the map" className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md hover:bg-neutral-50">
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
              <button type="submit" disabled={searching || !searchText.trim()} className="h-9 rounded-full bg-neutral-900 px-3 text-[13px] font-semibold text-white disabled:opacity-40">
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

        {status === "ready" ? (
          <button
            type="button"
            onClick={() => setSatellite((v) => !v)}
            aria-label="Toggle satellite view"
            aria-pressed={satellite}
            className="absolute bottom-[132px] right-[10px] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md hover:bg-neutral-50"
          >
            <Layers className="h-5 w-5" />
          </button>
        ) : null}

        {weather ? (
          <div className={`absolute left-4 flex h-9 items-center gap-1.5 rounded-full bg-white/95 px-3 text-[13px] font-medium shadow-md ${placeList.length && !selected ? "bottom-[104px]" : "bottom-6"}`}>
            <Sun className="h-4 w-4 text-amber-500" />
            <span>{weather.tempF}°F</span>
            <span className="text-muted">{weather.summary}</span>
          </div>
        ) : null}

        {/* Mini cards under the map: scan every pin without opening anything; a tap opens the full sheet. */}
        {placeList.length && !selected ? (
          <div className="absolute inset-x-0 bottom-0 z-[5] bg-gradient-to-t from-white/95 via-white/80 to-transparent pt-4">
            <PinStrip places={placeList} selectedKey={selectedKey} hoveredKey={hoveredKey} onSelect={onSelect} onHover={onHover} />
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
      </GoogleMap>
    </div>
  );
}
