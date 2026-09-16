"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ExternalLink, Heart, PanelLeftClose, Plus, Sparkles, Star, X } from "lucide-react";
import { findSaved, useTravelStore } from "@/lib/store";
import { fetchPlaceDetails } from "@/lib/places/client";
import { googleMapsSearchUrl, wikipediaSummaryUrl } from "@/lib/travel/links";
import type { PlaceDetails, PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { useUiState } from "@/components/providers/UiState";
import { useTripScope } from "@/components/trips/TripScope";
import { iconSvg } from "./markerIcons";
import { DestinationTab, type DestinationTabKind } from "./DestinationTab";

type Tab = "overview" | "reviews" | "location" | DestinationTabKind;

const KIND_LABEL: Record<PlaceKind, string> = {
  destination: "Destination",
  hotel: "Stay",
  restaurant: "Restaurant",
  attraction: "Attraction",
};

function compact(n?: number): string {
  if (!n) return "";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 0 }).format(n);
}

function Photo({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={clsx("h-full w-full bg-gradient-to-br from-neutral-200 to-neutral-300", className)} aria-hidden="true" />;
  // eslint-disable-next-line @next/next/no-img-element -- Google Places photos are proxied through /api/places/photo
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={clsx("h-full w-full object-cover", className)} />;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={clsx("h-3.5 w-3.5", i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-neutral-300")} />
      ))}
    </span>
  );
}

/**
 * Mindtrip-style place sheet. Mounted with a `key` per selection, so local
 * state (tab, fetched details) starts fresh for every place.
 */
export function PlaceDetailSheet({
  place,
  focusName,
  onClose,
  onCollapse,
}: {
  place: ResolvedPlace;
  focusName?: string;
  onClose: () => void;
  onCollapse: () => void;
}) {
  const { saved, toggleSaved } = useTravelStore();
  const send = useSendMessage();
  const { openAddToTrip } = useUiState();
  const tripScope = useTripScope();
  const [detailsState, setDetailsState] = useState<{ id: string; data: PlaceDetails | null } | null>(null);
  const [wikiState, setWikiState] = useState<{ id: string; text: string } | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const details = detailsState?.id === place.id ? detailsState.data : null;
  const detailsPending = place.source === "google" && detailsState?.id !== place.id;
  const wiki = wikiState?.id === place.id ? wikiState.text : null;

  useEffect(() => {
    let active = true;
    const id = place.id;
    if (place.source === "google") {
      fetchPlaceDetails(id).then((data) => {
        if (active) setDetailsState({ id, data });
      });
    }
    if (place.kind === "destination") {
      fetch(wikipediaSummaryUrl(place.name), { headers: { Accept: "application/json" } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { extract?: string } | null) => {
          if (active && d?.extract) setWikiState({ id, text: d.extract });
        })
        .catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, [place.id, place.source, place.kind, place.name]);

  const data: ResolvedPlace = details ?? place;
  const photos = (details?.photos?.length ? details.photos : place.photos).slice(0, 5);
  const isSaved = !!findSaved(saved, { kind: place.kind, title: place.name, refId: place.source === "google" ? place.id : undefined });
  const isDestination = place.kind === "destination";
  const mapsUrl = data.googleMapsUri ?? googleMapsSearchUrl(`${place.name}${place.locality ? `, ${place.locality}` : ""}`);

  const save = () =>
    toggleSaved({
      kind: place.kind,
      title: place.name,
      subtitle: data.locality ?? data.address,
      destination: focusName ?? (isDestination ? place.name : undefined),
      url: mapsUrl,
      place: data,
      refId: place.source === "google" ? place.id : undefined,
    });

  const addToTrip = () => openAddToTrip({ place: data, tripId: tripScope ?? undefined });

  const suggestion = isDestination
    ? { label: "Recommend hotels", prompt: `Recommend hotels in ${place.name} for me.` }
    : place.kind === "restaurant"
      ? { label: "Things to do nearby", prompt: `What are the best things to do near ${place.name}${focusName ? ` in ${focusName}` : ""}?` }
      : { label: "Restaurants nearby", prompt: `Recommend restaurants near ${place.name}${focusName ? ` in ${focusName}` : ""}.` };

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-white" data-testid="place-sheet">
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white hover:bg-surface">
            <X className="h-5 w-5" />
          </button>
          <button type="button" onClick={onCollapse} aria-label="Hide map" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white hover:bg-surface">
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            aria-pressed={isSaved}
            className="flex h-11 items-center gap-2 rounded-full border border-border bg-white px-4 text-[14px] font-semibold hover:bg-surface"
          >
            <Heart className={clsx("h-4 w-4", isSaved && "fill-red-500 text-red-500")} /> {isSaved ? "Saved" : "Save"}
          </button>
          <button type="button" onClick={addToTrip} className="flex h-11 items-center gap-2 rounded-full border border-border bg-white px-4 text-[14px] font-semibold hover:bg-surface">
            <Plus className="h-4 w-4" /> Add to trip
          </button>
          <a href={mapsUrl} target="_blank" rel="noreferrer noopener" aria-label="Open in Google Maps" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white hover:bg-surface">
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="xp-scroll relative flex-1 overflow-y-auto px-5 pb-28 pt-6">
        {isDestination ? (
          <div className="relative -mx-5 -mt-6 mb-5 h-[360px]">
            {photos[0] ? (
              <Photo src={photos[0]} alt={place.name} className="absolute inset-0" />
            ) : (
              <PlaceImage queries={[place.name, `${place.name}, ${place.locality ?? ""}`]} alt={place.name} className="absolute inset-0" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white drop-shadow">
              <div className="text-[44px] font-semibold leading-none tracking-tight">{place.name}</div>
              {data.locality ? <div className="mt-2 flex items-center gap-1 text-[16px]">📍 {data.locality}</div> : null}
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-[32px] font-semibold leading-tight tracking-tight">{place.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[15px] text-neutral-700">
              {data.rating ? (
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <Star className="h-4 w-4 fill-current" /> {data.rating.toFixed(1)}
                </span>
              ) : null}
              {data.userRatingCount ? <span className="text-muted">· {compact(data.userRatingCount)} reviews</span> : null}
              {data.locality ? <span className="text-muted">· {data.locality}</span> : null}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[15px] text-neutral-700">
              <span dangerouslySetInnerHTML={{ __html: iconSvg(place.kind, 16) }} />
              {data.category ?? KIND_LABEL[place.kind]}
              {data.priceLevel ? <span className="text-muted">· {data.priceLevel}</span> : null}
              {place.source === "estimate" ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[12px] text-amber-700">Approximate location</span> : null}
            </div>

            {photos.length ? (
              <div className="mt-5 grid h-[300px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl">
                <div className="col-span-2 row-span-2">
                  <Photo src={photos[0]} alt={place.name} />
                </div>
                {photos.slice(1, 5).map((src, i) => (
                  <div key={src} className="col-span-1 row-span-1">
                    <Photo src={src} alt={`${place.name} photo ${i + 2}`} />
                  </div>
                ))}
              </div>
            ) : (
              <PlaceImage queries={[place.name, focusName ?? ""]} alt={place.name} className="mt-5 h-[220px] rounded-2xl" />
            )}
          </>
        )}

        {/* Tabs */}
        <div className="mt-6 flex gap-6 border-b border-border text-[16px]">
          {isDestination ? (
            <>
              <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>Overview</TabButton>
              <TabButton active={tab === "stays"} onClick={() => setTab("stays")}>Stays</TabButton>
              <TabButton active={tab === "restaurants"} onClick={() => setTab("restaurants")}>Restaurants</TabButton>
              <TabButton active={tab === "experiences"} onClick={() => setTab("experiences")}>Things to do</TabButton>
              <TabButton active={tab === "location"} onClick={() => setTab("location")}>Location</TabButton>
            </>
          ) : (
            <>
              <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>Overview</TabButton>
              <TabButton active={tab === "reviews"} onClick={() => setTab("reviews")}>Reviews</TabButton>
              <TabButton active={tab === "location"} onClick={() => setTab("location")}>Location</TabButton>
            </>
          )}
        </div>

        <div className="mt-5 text-[16px] leading-relaxed text-neutral-800">
          {tab === "overview" ? (
            <>
              <p>{data.summary ?? wiki ?? (place.source === "estimate" ? "Location is estimated from the assistant's recommendation. Open in Google Maps to confirm details." : "No description available yet.")}</p>
              {details?.openingHours?.length ? (
                <div className="mt-5">
                  <div className="text-[14px] font-semibold">Hours</div>
                  <ul className="mt-1 text-[14px] text-neutral-700">
                    {details.openingHours.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2 text-[14px]">
                {data.websiteUri ? (
                  <a href={data.websiteUri} target="_blank" rel="noreferrer noopener" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 font-medium hover:bg-surface">
                    Website <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
                {details?.phone ? <span className="inline-flex h-9 items-center rounded-full border border-border px-3">{details.phone}</span> : null}
              </div>
            </>
          ) : null}

          {isDestination && (tab === "stays" || tab === "restaurants" || tab === "experiences") ? (
            <DestinationTab kind={tab} destination={data} />
          ) : null}

          {tab === "reviews" ? (
            detailsPending ? (
              <p className="text-muted">Loading reviews…</p>
            ) : details?.reviews?.length ? (
              <ul className="grid gap-5">
                {details.reviews.map((r, i) => (
                  <li key={i}>
                    <div className="flex items-center gap-2 text-[14px]">
                      <span className="font-semibold">{r.author}</span>
                      {r.rating ? <Stars rating={r.rating} /> : null}
                      {r.relativeTime ? <span className="text-muted">· {r.relativeTime}</span> : null}
                    </div>
                    <p className="mt-1 text-[15px] text-neutral-700">{r.text}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No Google reviews available for this place.</p>
            )
          ) : null}

          {tab === "location" ? (
            <div className="grid gap-3 text-[15px]">
              {data.address ? <p>{data.address}</p> : null}
              <p className="text-muted">
                {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
              </p>
              <div className="flex flex-wrap gap-2">
                <a href={mapsUrl} target="_blank" rel="noreferrer noopener" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-neutral-900 px-3 text-[14px] font-medium text-white">
                  Open in Google Maps <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-[14px] font-medium hover:bg-surface"
                >
                  Directions <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => send(suggestion.prompt)}
        className="absolute bottom-6 right-6 flex h-12 items-center gap-2 rounded-full bg-neutral-900 px-5 text-[15px] font-semibold text-white shadow-xl hover:bg-neutral-800"
      >
        <Sparkles className="h-4 w-4" /> {suggestion.label}
      </button>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "-mb-px border-b-2 pb-3 font-medium transition-colors",
        active ? "border-neutral-900 text-foreground" : "border-transparent text-neutral-500 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
