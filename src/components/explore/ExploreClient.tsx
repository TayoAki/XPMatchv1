"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import clsx from "clsx";
import { ChevronDown, Heart, LocateFixed, MapPin, Plus, Search, SquarePlus, Star, X } from "lucide-react";
import { api } from "@/lib/api";
import type { ResolvedPlace } from "@/lib/places/types";
import type { Guide } from "@/lib/types";
import { resolvePlaces } from "@/lib/places/client";
import { parseSearch } from "@/lib/search-parser";
import { findSaved, useTravelStore } from "@/lib/store";
import { useMediaQuery } from "@/lib/use-media-query";
import { EmptyState } from "@/components/PageFrame";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { PlacesMap } from "@/components/map/PlacesMap";
import type { MapPin as Pin } from "@/components/map/GoogleMap";
import { GuideCard } from "@/components/guides/GuideCard";
import { useUiState } from "@/components/providers/UiState";

type Category = "for-you" | "restaurants" | "experiences" | "stays";
type Tab = Category | "guides";

const TABS: { key: Tab; label: string }[] = [
  { key: "for-you", label: "For you" },
  { key: "restaurants", label: "Restaurants" },
  { key: "experiences", label: "Experiences" },
  { key: "stays", label: "Stays" },
  { key: "guides", label: "Guides" },
];

interface Center {
  place: ResolvedPlace;
  source: "home" | "geo" | "search";
}

function compact(n?: number): string {
  if (!n) return "";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function Photo({ src, alt, queries, className }: { src?: string; alt: string; queries: string[]; className: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
    return <img src={src} alt={alt} onError={() => setFailed(true)} className={clsx(className, "object-cover")} loading="lazy" />;
  }
  return <PlaceImage queries={queries} alt={alt} className={className} />;
}

function NearbyCard({
  place,
  areaName,
  selected,
  onSelect,
  onHover,
}: {
  place: ResolvedPlace;
  areaName: string;
  selected: boolean;
  onSelect: () => void;
  onHover: (on: boolean) => void;
}) {
  const { saved, toggleSaved } = useTravelStore();
  const { openAddToTrip } = useUiState();
  const isSaved = !!findSaved(saved, { kind: place.kind, title: place.name, refId: place.id });
  return (
    <article
      className={clsx("group overflow-hidden rounded-3xl border bg-white transition-shadow", selected ? "border-neutral-900 shadow-md" : "border-border")}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      data-testid="nearby-card"
    >
      <button type="button" onClick={onSelect} className="relative block aspect-[4/3] w-full overflow-hidden bg-neutral-200 text-left" aria-label={`Show ${place.name} on the map`}>
        <Photo src={place.photos?.[0]} alt={place.name} queries={[place.name, areaName]} className="absolute inset-0 h-full w-full transition-transform duration-300 group-hover:scale-[1.02]" />
      </button>
      <div className="absolute right-3 top-3 flex gap-1.5">
        <button
          type="button"
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${place.name} from saved` : `Save ${place.name}`}
          onClick={() => toggleSaved({ kind: place.kind, title: place.name, subtitle: place.locality, destination: areaName, url: place.googleMapsUri, place, refId: place.id })}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur hover:bg-white"
        >
          <Heart className={clsx("h-4 w-4", isSaved ? "fill-red-500 text-red-500" : "text-neutral-700")} />
        </button>
        <button type="button" aria-label={`Add ${place.name} to a trip`} onClick={() => openAddToTrip({ place })} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur hover:bg-white">
          <Plus className="h-4 w-4 text-neutral-700" />
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[16px] font-semibold leading-snug">{place.name}</h3>
          {place.rating ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-[14px] font-semibold">
              <Star className="h-3.5 w-3.5 fill-current" /> {place.rating.toFixed(1)}
              {place.userRatingCount ? <span className="font-normal text-muted">({compact(place.userRatingCount)})</span> : null}
            </span>
          ) : null}
        </div>
        <div className="mt-1 text-[13px] text-neutral-700">{place.category ?? (place.kind === "hotel" ? "Stay" : place.kind === "restaurant" ? "Restaurant" : "Experience")}</div>
        <div className="text-[13px] text-muted">{place.locality ?? place.address}</div>
        {place.priceLevel ? <div className="mt-1 text-[13px] text-neutral-700">{place.priceLevel}</div> : null}
      </div>
    </article>
  );
}

/** Explore: things near the traveler (home city, current location or any searched place), Mindtrip-style. */
export function ExploreClient() {
  const { profile, hydrated } = useTravelStore();
  const { openAssistant } = useUiState();
  const wide = useMediaQuery("(min-width: 1280px)");
  const homeCity = profile.homeCity.trim();

  const [homeState, setHomeState] = useState<{ query: string; place: ResolvedPlace | null } | null>(null);
  const [override, setOverride] = useState<Center | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<Tab>("for-you");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ key: string; items: ResolvedPlace[]; error: string | null } | null>(null);
  const [guidesState, setGuidesState] = useState<{ key: string; guides: Guide[] } | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Resolve the home city once the profile is known (and whenever it changes).
  useEffect(() => {
    if (!hydrated || !homeCity) return;
    let active = true;
    const query = homeCity;
    resolvePlaces({ items: [{ key: "home", query, kind: "destination" }] }).then((res) => {
      if (active) setHomeState({ query, place: res?.items[0]?.place ?? null });
    });
    return () => {
      active = false;
    };
  }, [hydrated, homeCity]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const home: Center | null = homeState?.query === homeCity && homeState.place ? { place: homeState.place, source: "home" } : null;
  const center = override ?? home;
  const resolvingHome = hydrated && !!homeCity && homeState?.query !== homeCity && !override;

  // The search box is read deterministically: price words, ratings and "open now" become Places
  // filters, vibe words stay in the text query; both are shown as chips so nothing is hidden.
  const parsed = useMemo(() => parseSearch(q), [q]);
  const resultKey = center ? `${center.place.id}|${tab}|${q}` : "";
  useEffect(() => {
    if (!center || tab === "guides") return;
    let active = true;
    const key = resultKey;
    const params = new URLSearchParams({ lat: center.place.lat.toFixed(5), lng: center.place.lng.toFixed(5), category: tab });
    if (parsed.query) params.set("q", parsed.query);
    if (parsed.priceLevels?.length) params.set("levels", parsed.priceLevels.join(","));
    if (parsed.minRating) params.set("minRating", String(parsed.minRating));
    if (parsed.openNow) params.set("openNow", "1");
    api<{ items: ResolvedPlace[] }>(`/api/places/nearby?${params.toString()}`)
      .then((data) => active && setResults({ key, items: data.items, error: null }))
      .catch((err: unknown) => active && setResults({ key, items: [], error: err instanceof Error ? err.message : "Could not load places" }));
    return () => {
      active = false;
    };
    // `center` and `parsed` are summarized by resultKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultKey, tab, q]);

  const guidesKey = center ? `${center.place.id}` : "";
  useEffect(() => {
    if (!center || tab !== "guides") return;
    let active = true;
    const key = guidesKey;
    api<{ guides: Guide[] }>(`/api/guides?lat=${center.place.lat.toFixed(5)}&lng=${center.place.lng.toFixed(5)}`)
      .then((data) => active && setGuidesState({ key, guides: data.guides }))
      .catch(() => active && setGuidesState({ key, guides: [] }));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guidesKey, tab]);

  const items = results?.key === resultKey ? results.items : null;
  const error = results?.key === resultKey ? results.error : null;
  const guides = guidesState?.key === guidesKey ? guidesState.guides : null;
  const pins = useMemo<Pin[]>(() => (items ?? []).map((p) => ({ ...p, key: p.id })), [items]);

  const useMyLocation = () => {
    setMenuOpen(false);
    setLocationError(null);
    if (!("geolocation" in navigator)) return setLocationError("Location is not available in this browser.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setOverride({
          place: { id: "est:here", name: "Your location", kind: "destination", lat: pos.coords.latitude, lng: pos.coords.longitude, photos: [], source: "estimate" },
          source: "geo",
        });
      },
      () => {
        setLocating(false);
        setLocationError("Couldn't get your location. Check the browser permission and try again.");
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  };

  const searchPlace = async (e: FormEvent) => {
    e.preventDefault();
    const query = placeQuery.trim();
    if (!query) return;
    setLocating(true);
    const res = await resolvePlaces({ items: [{ key: "area", query, kind: "destination" }] });
    setLocating(false);
    const place = res?.items[0]?.place;
    if (!place) return setLocationError(`Couldn't find "${query}".`);
    setOverride({ place, source: "search" });
    setPlaceQuery("");
    setMenuOpen(false);
  };

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    setQ(search.trim());
    if (tab === "guides") setTab("for-you");
  };

  const areaName = center?.place.name ?? homeCity;
  const map = center ? (
    <PlacesMap
      focus={center.place}
      focusLabel={center.place.name}
      pins={pins}
      selectedKey={selectedKey}
      onSelect={setSelectedKey}
      hoveredKey={hoveredKey}
      onHover={setHoveredKey}
      testId="explore-map"
      className={wide ? "relative h-full w-full" : "relative h-[320px] overflow-hidden rounded-3xl"}
    />
  ) : null;

  return (
    <div className="flex h-full min-h-0">
      <section className="xp-scroll min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[980px] px-6 py-6">
          <div className="relative flex flex-wrap items-center gap-3" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-1 text-[28px] font-semibold tracking-tight hover:underline"
            >
              {center ? center.place.name : resolvingHome ? homeCity : "Explore"}
              <ChevronDown className="h-6 w-6" />
            </button>
            {locating ? <span className="text-[13px] text-muted">Locating…</span> : null}
            {menuOpen ? (
              <div role="menu" className="absolute left-0 top-12 z-30 w-80 rounded-2xl border border-border bg-white p-2 shadow-xl">
                {homeCity ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOverride(null);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-surface"
                  >
                    <MapPin className="h-4 w-4" /> Home: {homeCity}
                  </button>
                ) : (
                  <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); openAssistant(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-surface">
                    <MapPin className="h-4 w-4" /> Set your home city
                  </button>
                )}
                <button type="button" role="menuitem" onClick={useMyLocation} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-surface">
                  <LocateFixed className="h-4 w-4" /> Use my location
                </button>
                <form onSubmit={searchPlace} className="mt-1 flex gap-2 border-t border-border px-1 pt-2">
                  <TextInput value={placeQuery} onChange={(e) => setPlaceQuery(e.target.value)} placeholder="Another city…" aria-label="Explore another place" />
                  <Button type="submit" size="sm" disabled={!placeQuery.trim()} className="h-10">
                    Go
                  </Button>
                </form>
              </div>
            ) : null}
          </div>
          {locationError ? <p className="mt-1 text-[13px] text-red-600">{locationError}</p> : null}

          <form onSubmit={submitSearch} className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={areaName ? `Search near ${areaName}` : "Search"}
                aria-label="Search nearby"
                className="h-12 w-full rounded-full border border-border bg-surface pl-11 pr-11 text-[15px] outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white"
              />
              {q ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearch("");
                    setQ("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-neutral-500 hover:bg-white"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <Button type="submit" size="lg" disabled={!search.trim() && !q}>
              Search
            </Button>
          </form>

          {q && parsed.chips.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[13px] text-muted" data-testid="explore-understood">
              <span>Understood as:</span>
              {parsed.chips.map((c) => (
                <span
                  key={c.label}
                  title={c.applied ? "Applied as a Google Places filter" : "Searched in the text"}
                  className={clsx("rounded-full px-2.5 py-0.5 font-medium", c.applied ? "bg-neutral-900 text-white" : "bg-surface text-neutral-700")}
                >
                  {c.label}
                </span>
              ))}
              {parsed.query ? <span className="text-neutral-700">· “{parsed.query}”</span> : null}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={clsx(
                  "h-9 rounded-full px-4 text-[14px] font-medium transition-colors",
                  tab === t.key ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-surface",
                  t.key === "guides" && "ml-2 border-l border-border pl-6",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {!wide && map ? <div className="mt-5">{map}</div> : null}

          <div className="mt-6">
            {!hydrated || resolvingHome ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="xp-skeleton aspect-[4/3] rounded-3xl" />
                ))}
              </div>
            ) : !center ? (
              <EmptyState
                title={homeCity ? `Couldn't place ${homeCity} on the map` : "Where are you?"}
                body={homeCity ? "Try another spelling in your assistant settings, or use your location." : "Set your home city so Explore can show what's around you, or use your current location."}
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={openAssistant}>
                      <MapPin className="h-4 w-4" /> Set home city
                    </Button>
                    <Button variant="outline" onClick={useMyLocation}>
                      <LocateFixed className="h-4 w-4" /> Use my location
                    </Button>
                  </div>
                }
              />
            ) : tab === "guides" ? (
              guides === null ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="xp-skeleton aspect-[16/11] rounded-3xl" />
                  ))}
                </div>
              ) : guides.length === 0 ? (
                <EmptyState
                  title={`No community guides near ${areaName} yet`}
                  body="Know the area? Write the first guide and it will show up here for everyone nearby."
                  action={
                    <Link href="/create" className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-white hover:bg-neutral-800">
                      <SquarePlus className="h-4 w-4" /> Create a guide
                    </Link>
                  }
                />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {guides.map((g) => (
                    <GuideCard key={g.id} guide={g} />
                  ))}
                </div>
              )
            ) : items === null ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="xp-skeleton aspect-[4/3] rounded-3xl" />
                ))}
              </div>
            ) : error ? (
              <EmptyState title="Couldn't load places" body={error} />
            ) : items.length === 0 ? (
              <EmptyState
                title={q ? `Nothing found for "${q}" near ${areaName}` : `Nothing to show near ${areaName}`}
                body="Google Places returned no results here. Try a broader search or another area."
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <div key={p.id} className="relative">
                    <NearbyCard place={p} areaName={areaName} selected={selectedKey === p.id} onSelect={() => setSelectedKey(p.id)} onHover={(on) => setHoveredKey(on ? p.id : null)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      {wide ? <aside className="flex w-[46%] min-w-[440px] max-w-[960px] shrink-0 border-l border-border/60 bg-white">{map ?? <div className="flex h-full w-full items-center justify-center text-[14px] text-muted">Pick a place to explore</div>}</aside> : null}
    </div>
  );
}
