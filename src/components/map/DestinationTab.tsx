"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ExternalLink, Heart, Plus, Sparkles, Star } from "lucide-react";
import { api } from "@/lib/api";
import type { MapPlace, PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { findSaved, useTravelStore, type TravelerProfile } from "@/lib/store";
import { mapActions, useMapView } from "@/lib/map-store";
import { googleMapsSearchUrl } from "@/lib/travel/links";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { useUiState } from "@/components/providers/UiState";

export type DestinationTabKind = "stays" | "restaurants" | "experiences";

const KIND: Record<DestinationTabKind, PlaceKind> = { stays: "hotel", restaurants: "restaurant", experiences: "attraction" };
const BUDGET_LABEL: Record<string, string> = { budget: "Budget", "mid-range": "Mid-range", premium: "Premium", luxury: "Luxury" };
const STYLE_QUERY: Record<string, string> = {
  "Food & drink": "food markets and food tours",
  "Culture & history": "museums and historic sites",
  "Outdoors & hiking": "parks and hiking trails",
  Beaches: "beaches",
  Nightlife: "live music venues and bars",
  "Art & design": "art galleries and design landmarks",
  "Family friendly": "family attractions",
  Luxury: "top attractions",
  "Budget travel": "free things to do",
  "Road trips": "scenic viewpoints",
  Photography: "scenic viewpoints and landmarks",
  Wellness: "spas and gardens",
};

/** Builds the Places query from the traveler's profile so results reflect their preferences. */
export function preferenceQuery(kind: DestinationTabKind, profile: TravelerProfile): { q: string; chips: string[] } {
  const chips: string[] = [];
  if (kind === "stays") {
    const acc = profile.accommodation.trim();
    const budgetWord = ({ budget: "budget", "mid-range": "", premium: "upscale", luxury: "luxury" } as Record<string, string>)[profile.budgetTier] ?? "";
    if (acc) chips.push(acc);
    if (profile.budgetTier) chips.push(BUDGET_LABEL[profile.budgetTier] ?? profile.budgetTier);
    const base = acc ? (/hotel|hostel|resort|apartment|b&b|inn|villa|stay|lodge|airbnb/i.test(acc) ? acc : `${acc} hotels`) : "hotels";
    const q = [budgetWord, base].filter(Boolean).join(" ");
    return { q: q === "hotels" ? "" : q, chips };
  }
  if (kind === "restaurants") {
    const diet = profile.dietary.trim();
    const meaningful = diet && !/^(none|no|n\/a|nothing|-)/i.test(diet);
    if (meaningful) chips.push(diet);
    if (profile.budgetTier) chips.push(BUDGET_LABEL[profile.budgetTier] ?? profile.budgetTier);
    return { q: meaningful ? `${diet} restaurants` : "", chips };
  }
  const style = profile.travelStyles[0];
  if (style) chips.push(style);
  return { q: style ? STYLE_QUERY[style] ?? "" : "", chips };
}

function compact(n?: number): string {
  if (!n) return "";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function Thumb({ place, fallback }: { place: ResolvedPlace; fallback: string }) {
  const [failed, setFailed] = useState(false);
  const src = place.photos?.[0];
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
    return <img src={src} alt={place.name} onError={() => setFailed(true)} className="h-[76px] w-[96px] shrink-0 rounded-xl object-cover" loading="lazy" />;
  }
  return <PlaceImage queries={[place.name, fallback]} alt={place.name} className="h-[76px] w-[96px] shrink-0 rounded-xl" />;
}

function Row({ place, destination, onOpen }: { place: ResolvedPlace; destination: string; onOpen?: () => void }) {
  const { saved, toggleSaved } = useTravelStore();
  const { openAddToTrip } = useUiState();
  const isSaved = !!findSaved(saved, { kind: place.kind, title: place.name, refId: place.source === "google" ? place.id : undefined });
  const meta = [place.category, place.locality].filter(Boolean).join(" · ");
  const inner = (
    <>
      <Thumb place={place} fallback={destination} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">{place.name}</div>
        <div className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
          {place.rating ? (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Star className="h-3.5 w-3.5 fill-current" /> {place.rating.toFixed(1)}
              {place.userRatingCount ? <span className="font-normal text-muted">({compact(place.userRatingCount)})</span> : null}
            </span>
          ) : null}
          {meta ? <span className="truncate">{meta}</span> : null}
          {place.priceLevel ? <span>· {place.priceLevel}</span> : null}
        </div>
      </div>
    </>
  );
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border p-2.5" data-testid="destination-tab-row">
      {onOpen ? (
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Show ${place.name} on the map`}>
          {inner}
        </button>
      ) : (
        <a href={place.googleMapsUri ?? googleMapsSearchUrl(`${place.name}, ${destination}`)} target="_blank" rel="noreferrer noopener" className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {inner}
        </a>
      )}
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${place.name} from saved` : `Save ${place.name}`}
          onClick={() => toggleSaved({ kind: place.kind, title: place.name, subtitle: place.locality, destination, url: place.googleMapsUri, place, refId: place.source === "google" ? place.id : undefined })}
          className="rounded-full p-2 text-neutral-500 hover:bg-surface hover:text-foreground"
        >
          <Heart className={clsx("h-4 w-4", isSaved && "fill-red-500 text-red-500")} />
        </button>
        <button type="button" aria-label={`Add ${place.name} to a trip`} onClick={() => openAddToTrip({ place })} className="rounded-full p-2 text-neutral-500 hover:bg-surface hover:text-foreground">
          <Plus className="h-4 w-4" />
        </button>
        {!onOpen ? <ExternalLink className="mr-1 h-3.5 w-3.5 text-neutral-400" /> : null}
      </div>
    </li>
  );
}

const PROMPT: Record<DestinationTabKind, (d: string) => string> = {
  stays: (d) => `Find hotels in ${d} for me that fit my budget and style.`,
  restaurants: (d) => `Recommend restaurants in ${d} that fit my tastes.`,
  experiences: (d) => `What are the top things to do in ${d} for someone like me?`,
};

/**
 * Stays / Restaurants / Things to do inside a destination's sheet: the
 * assistant's own picks from this chat first, then places near the
 * destination queried with the traveler's preferences.
 */
export function DestinationTab({ kind, destination }: { kind: DestinationTabKind; destination: ResolvedPlace }) {
  const { profile, hydrated } = useTravelStore();
  const view = useMapView();
  const send = useSendMessage();
  const [state, setState] = useState<{ key: string; items: ResolvedPlace[]; error: string | null } | null>(null);

  const { q, chips } = preferenceQuery(kind, profile);
  const key = `${destination.id}|${kind}|${q}|${profile.budgetTier}`;

  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    const params = new URLSearchParams({ lat: destination.lat.toFixed(5), lng: destination.lng.toFixed(5), category: kind });
    if (q) params.set("q", q);
    if (profile.budgetTier) params.set("price", profile.budgetTier);
    api<{ items: ResolvedPlace[] }>(`/api/places/nearby?${params.toString()}`)
      .then((data) => active && setState({ key, items: data.items, error: null }))
      .catch((err: unknown) => active && setState({ key, items: [], error: err instanceof Error ? err.message : "Could not load places" }));
    return () => {
      active = false;
    };
    // `key` summarizes destination, kind, query and budget.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hydrated]);

  const picks = view.placeList.filter((p) => p.kind === KIND[kind]);
  const pickIds = new Set(picks.map((p) => p.id));
  const results = state?.key === key ? state.items.filter((p) => !pickIds.has(p.id)) : null;
  const error = state?.key === key ? state.error : null;
  const threadId = view.threadId;

  const openResult = (place: ResolvedPlace) => {
    if (!threadId) return;
    const pinKey = `sheet:${place.id}`;
    const pinned: MapPlace = { ...place, key: pinKey, toolCallId: "sheet" };
    mapActions.addPlaces(threadId, [pinned]);
    mapActions.selectPlace(threadId, pinKey);
  };

  return (
    <div className="grid gap-5">
      {chips.length ? (
        <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
          <span>Based on your profile:</span>
          {chips.map((c) => (
            <span key={c} className="rounded-full bg-surface px-2.5 py-0.5 font-medium text-neutral-700">
              {c}
            </span>
          ))}
        </div>
      ) : null}

      {picks.length ? (
        <section>
          <div className="flex items-baseline justify-between">
            <h3 className="text-[15px] font-semibold">Picked for you</h3>
            <span className="text-[12px] text-muted">From your chat with XPMatch</span>
          </div>
          <ul className="mt-2 grid gap-2">
            {picks.map((p) => (
              <Row key={p.key} place={p} destination={destination.name} onOpen={threadId ? () => mapActions.selectPlace(threadId, p.key) : undefined} />
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="flex items-baseline justify-between">
          <h3 className="text-[15px] font-semibold">{q ? "Matching your preferences" : `Popular in ${destination.name}`}</h3>
          <span className="text-[12px] text-muted">Google Places</span>
        </div>
        {results === null ? (
          <ul className="mt-2 grid gap-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="xp-skeleton h-[96px] rounded-2xl" />
            ))}
          </ul>
        ) : error ? (
          <p className="mt-2 text-[14px] text-red-600">{error}</p>
        ) : results.length === 0 ? (
          <p className="mt-2 text-[14px] text-muted">Nothing found for these preferences here. Ask XPMatch for picks instead.</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {results.map((p) => (
              <Row key={p.id} place={p} destination={destination.name} onOpen={threadId ? () => openResult(p) : undefined} />
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={() => send(PROMPT[kind](destination.name))}
        className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-neutral-900 px-4 text-[14px] font-semibold text-white hover:bg-neutral-800"
      >
        <Sparkles className="h-4 w-4" /> Ask XPMatch for personalized picks
      </button>
    </div>
  );
}
