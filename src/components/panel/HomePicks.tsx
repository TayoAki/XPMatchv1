"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronDown, Heart, LocateFixed, Map, MapPin, MessageCircle, Plus, Star } from "lucide-react";
import { api } from "@/lib/api";
import type { ResolvedPlace } from "@/lib/places/types";
import { candidateFromPlace, scoreMatch, type MatchResult } from "@/lib/match";
import { findSaved, formatDateRange, useTravelStore } from "@/lib/store";
import { googleMapsSearchUrl } from "@/lib/travel/links";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { useUiState } from "@/components/providers/UiState";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { PhotoCredit } from "@/components/ui/PhotoCredit";
import { TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { MatchBadge } from "@/components/recs/MatchBadge";
import { RecThumbs } from "@/components/recs/RecThumbs";

interface HomeRowData {
  key: "things" | "stays" | "eat";
  title: string;
  basedOn: string[];
  items: { place: ResolvedPlace; match: MatchResult }[];
}

interface HomePicksData {
  destination: ResolvedPlace;
  rows: HomeRowData[];
  provider: "google" | "fallback";
}

export interface FocusOption {
  key: string;
  label: string;
  destination: string;
  hint?: string;
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

function PickCard({ place, match, destination, context, className }: { place: ResolvedPlace; match: MatchResult; destination: string; context: "home"; className?: string }) {
  const { saved, toggleSaved } = useTravelStore();
  const { openAddToTrip } = useUiState();
  const send = useSendMessage();
  const isSaved = !!findSaved(saved, { kind: place.kind, title: place.name, refId: place.id });
  const kindWord = place.kind === "hotel" ? "stay" : place.kind === "restaurant" ? "restaurant" : "place";
  return (
    <article className={clsx("flex flex-col overflow-hidden rounded-2xl border border-border bg-white", className)} data-testid="home-pick">
      <div className="relative">
        <Photo src={place.photos?.[0]} alt={place.name} queries={[place.name, destination]} className="h-[150px] w-full" />
        {place.photos?.[0] ? <PhotoCredit credit={place.photoCredits?.[0]} /> : null}
        <div className="absolute right-2 top-2 flex gap-1.5">
          <button
            type="button"
            aria-pressed={isSaved}
            aria-label={isSaved ? `Remove ${place.name} from saved` : `Save ${place.name}`}
            onClick={() => toggleSaved({ kind: place.kind, title: place.name, subtitle: place.locality, destination, url: place.googleMapsUri, place, refId: place.id })}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur hover:bg-white"
          >
            <Heart className={clsx("h-4 w-4", isSaved ? "fill-red-500 text-red-500" : "text-neutral-700")} />
          </button>
          <button type="button" aria-label={`Add ${place.name} to a trip`} onClick={() => openAddToTrip({ place })} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur hover:bg-white">
            <Plus className="h-4 w-4 text-neutral-700" />
          </button>
        </div>
        <div className="absolute left-2 top-2">
          <MatchBadge match={match} size="sm" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug" title={place.name}>
          {place.name}
        </h3>
        <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
          {place.rating ? (
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Star className="h-3 w-3 fill-current" /> {place.rating.toFixed(1)}
              {place.userRatingCount ? <span className="font-normal text-muted">({compact(place.userRatingCount)})</span> : null}
            </span>
          ) : null}
          <span className="truncate">{[place.category, place.priceLevel].filter(Boolean).join(" · ")}</span>
        </div>
        {match.reasons[0] && match.reasons[0].delta > 0 && match.reasons[0].factor !== "quality" ? <div className="line-clamp-2 text-[12px] text-neutral-700">{match.reasons[0].text}</div> : null}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <RecThumbs name={place.name} kind={place.kind} place={place} destination={destination} context={context} match={match} size="sm" />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => send(`Tell me about ${place.name} in ${destination}: is this ${kindWord} right for me, and what should I know before going?`)}
              aria-label={`Ask about ${place.name}`}
              title="Ask the assistant"
              className="rounded-full p-1.5 text-neutral-500 hover:bg-surface hover:text-foreground pointer-coarse:p-2.5"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            <a href={place.googleMapsUri ?? googleMapsSearchUrl(`${place.name}, ${destination}`)} target="_blank" rel="noreferrer noopener" aria-label={`${place.name} on Google Maps`} title="Google Maps" className="rounded-full p-1.5 text-neutral-500 hover:bg-surface hover:text-foreground pointer-coarse:p-2.5">
              <MapPin className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function RowSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "flex gap-3 overflow-hidden" : "grid grid-cols-3 gap-4"} aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className={clsx("xp-skeleton h-[260px] rounded-2xl", compact && "w-[230px] shrink-0")} />
      ))}
    </div>
  );
}

/**
 * "For you in Rome": three rows of three picks for the destination in focus,
 * scored against the traveler's profile, with thumbs so the score learns.
 */
export function HomePicks({ options, initialKey, compact = false }: { options: FocusOption[]; initialKey: string; compact?: boolean }) {
  const { profile, taste, preferences, recFeedback, packageCalibration, hydrated, profileSaving } = useTravelStore();
  const { openAssistant } = useUiState();
  const [chosenKey, setChosenKey] = useState<string | null>(null);
  const [custom, setCustom] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<{ destination: string; data: HomePicksData | null; error: string | null } | null>(null);

  const selected = options.find((o) => o.key === (chosenKey ?? initialKey)) ?? options[0];
  const destination = custom ?? selected?.destination ?? "";

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  // The server scores picks against the stored profile, so a fetch waits for an in-flight profile
  // save (finishing the quiz, Update my assistant) and runs again once it has landed.
  useEffect(() => {
    if (!hydrated || !destination || profileSaving) return;
    let active = true;
    const target = destination;
    api<HomePicksData>(`/api/recs/home?destination=${encodeURIComponent(target)}`)
      .then((data) => active && setState({ destination: target, data, error: null }))
      .catch((err: unknown) => active && setState({ destination: target, data: null, error: err instanceof Error ? err.message : "Could not load picks" }));
    return () => {
      active = false;
    };
  }, [hydrated, destination, profileSaving]);

  // Scores are recomputed on the client so thumbs and reactions move the badges at once.
  const data = state?.destination === destination ? state.data : null;
  const rows = useMemo(() => {
    if (!data) return null;
    return data.rows.map((row) => ({ ...row, items: row.items.map((item) => ({ place: item.place, match: scoreMatch(candidateFromPlace(item.place), { profile, taste, preferences, recFeedback, packageCalibration }) })) }));
  }, [data, profile, taste, preferences, recFeedback, packageCalibration]);
  const error = state?.destination === destination ? state.error : null;
  const headerName = data?.destination.name ?? destination;

  const pickOption = (o: FocusOption) => {
    setCustom(null);
    setChosenKey(o.key);
    setMenuOpen(false);
  };

  return (
    <section className={compact ? "mt-6" : "mt-8"} data-testid="home-picks">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex flex-wrap items-center gap-2" ref={menuRef}>
          <h2 className={clsx("font-semibold tracking-tight", compact ? "text-[17px]" : "text-[19px]")}>For you in</h2>
          <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen} className={clsx("flex items-center gap-1 font-semibold tracking-tight hover:underline", compact ? "text-[17px]" : "text-[19px]")}>
            <span aria-hidden="true">📍</span>
            {headerName || "your city"}
            <ChevronDown className="h-4 w-4" />
          </button>
          {headerName ? (
            <a href={googleMapsSearchUrl(headerName)} target="_blank" rel="noreferrer noopener" className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-medium hover:bg-surface">
              <Map className="h-4 w-4" /> Map
            </a>
          ) : null}
          {menuOpen ? (
            <div role="menu" className="absolute left-0 top-9 z-30 w-80 rounded-2xl border border-border bg-white p-2 shadow-xl">
              {options.map((o) => (
                <button key={o.key} type="button" role="menuitem" onClick={() => pickOption(o)} className={clsx("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-surface", !custom && selected?.key === o.key && "font-semibold")}>
                  <LocateFixed className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{o.label}</span>
                    {o.hint ? <span className="block truncate text-[12px] text-muted">{o.hint}</span> : null}
                  </span>
                </button>
              ))}
              {!options.length ? (
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); openAssistant(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-surface">
                  <MapPin className="h-4 w-4" /> Tell XPMatch where you are headed
                </button>
              ) : null}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = customInput.trim();
                  if (!q) return;
                  setCustom(q);
                  setCustomInput("");
                  setMenuOpen(false);
                }}
                className="mt-1 flex gap-2 border-t border-border px-1 pt-2"
              >
                <TextInput value={customInput} onChange={(e) => setCustomInput(e.target.value)} placeholder="Another city…" aria-label="Picks for another place" />
                <Button type="submit" size="sm" disabled={!customInput.trim()} className="h-10">
                  Go
                </Button>
              </form>
            </div>
          ) : null}
        </div>
        <Link href="/explore" className="text-[13px] font-medium text-neutral-700 hover:underline">
          Explore
        </Link>
      </div>

      {!destination ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted">
          Tell XPMatch where you are dreaming of going (or your home city) and it will line up things to do, stays and places to eat that fit you.
          <div className="mt-3">
            <Button size="sm" onClick={openAssistant}>
              Update my assistant
            </Button>
          </div>
        </div>
      ) : error ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted">{error}</p>
      ) : !rows ? (
        <div className="mt-3 grid gap-6">
          <RowSkeleton compact={compact} />
        </div>
      ) : (
        <div className="mt-3 grid gap-6">
          {rows.map((row) => (
            <div key={row.key} className="min-w-0" data-testid={`home-row-${row.key}`}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[15px] font-semibold">{row.title}</h3>
                {row.basedOn.length ? <span className="truncate text-[12px] text-muted">Because you like {row.basedOn.slice(0, 2).join(" and ")}</span> : null}
              </div>
              {row.items.length ? (
                // Phones scroll each row sideways (three cards do not fit); wide screens show the trio in a grid.
                <div className={compact ? "xp-no-scrollbar -mx-4 mt-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1" : "mt-2 grid grid-cols-3 gap-4"}>
                  {row.items.map((item) => (
                    <PickCard key={item.place.id} place={item.place} match={item.match} destination={headerName} context="home" className={compact ? "w-[230px] shrink-0 snap-start" : undefined} />
                  ))}
                </div>
              ) : (
                <p className="mt-2 rounded-2xl border border-dashed border-border px-4 py-5 text-center text-[13px] text-muted">
                  {data?.provider === "fallback" ? "Google Places is not configured, so there are no picks to show." : "Nothing matched here yet. Try another place or widen your interests."}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Where the picks should point: the next trip, the onboarding answer, the planner, then home. */
export function focusOptions(input: { trips: { destination: string; startDate?: string; endDate?: string; title: string }[]; nextDestination: string; nextWhen: string; plannerWhere: string; homeCity: string }): { options: FocusOption[]; initialKey: string } {
  const today = new Date().toISOString().slice(0, 10);
  const options: FocusOption[] = [];
  const upcoming = input.trips
    .filter((t) => !t.endDate || t.endDate >= today)
    .sort((a, b) => (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999"));
  for (const t of upcoming.slice(0, 3)) {
    options.push({ key: `trip:${t.title}:${t.destination}`, label: t.destination, destination: t.destination, hint: `${t.title}${t.startDate ? ` · ${formatDateRange(t.startDate, t.endDate)}` : ""}` });
  }
  const next = input.nextDestination.trim();
  if (next && !options.some((o) => o.destination.toLowerCase() === next.toLowerCase())) options.push({ key: "next", label: next, destination: next, hint: input.nextWhen.trim() ? `Dreaming of it for ${input.nextWhen.trim()}` : "Where you're dreaming of going" });
  const planner = input.plannerWhere.trim();
  if (planner && !options.some((o) => o.destination.toLowerCase() === planner.toLowerCase())) options.push({ key: "planner", label: planner, destination: planner, hint: "From the trip planner" });
  const home = input.homeCity.trim();
  if (home && !options.some((o) => o.destination.toLowerCase() === home.toLowerCase())) options.push({ key: "home", label: home, destination: home, hint: "Home" });
  return { options, initialKey: options[0]?.key ?? "" };
}
