"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, CalendarDays, Heart, MapPin, RefreshCw, Search, Sparkles } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { ShowDestinationsArgs, Streaming } from "@/lib/travel/schemas";
import { googleMapsSearchUrl } from "@/lib/travel/links";
import { findSaved, useTravelStore } from "@/lib/store";
import { mapActions, useMapView, type MapFilter } from "@/lib/map-store";
import type { MapPlace, PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { photoAtWidth } from "@/lib/places/destination-photo";
import { useMediaQuery } from "@/lib/use-media-query";
import { useDestinationPicks, type DestinationPicks, type PickRowKey } from "@/lib/recs/destination-picks";
import { draftMatch, draftPicks, loadItineraryDraft, useItineraryDraft } from "@/lib/recs/itinerary-draft";
import { MAX_ITINERARY_DAYS, daysBetween, daysFromStay } from "@/lib/itinerary";
import { shortPlaceName } from "@/lib/places/names";
import type { ItineraryDraft } from "@/server/itineraries";
import type { MatchCandidate, MatchResult } from "@/lib/match";
import { useCardThreadId, usePlacePin, useRegisterPlaces } from "@/components/map/useRegisterPlaces";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { draftMessage } from "@/components/chat/draft";
import { HiddenPlaceCard, useReaction } from "@/components/feedback/ReactionControl";
import { MatchBadge, useMatch } from "@/components/recs/MatchBadge";
import { RecThumbs } from "@/components/recs/RecThumbs";
import { photoCreditTitle } from "@/components/ui/PhotoCredit";
import { CardPhoto, CardRow, SectionHeader, Text } from "./shared";
import { ItineraryPlan, MakeItineraryButton } from "./ItineraryPlan";

type DestinationArgs = Streaming<ShowDestinationsArgs>["destinations"] extends (infer U)[] | undefined ? U : never;
type Tab = "itinerary" | "stays" | "activities" | "dining";
type Face = "photo" | "profile";
/** How the profile came to be showing: a hover that will close by itself, or a choice that stays. */
type Reveal = "closed" | "hover" | "pinned";

const TABS: Tab[] = ["itinerary", "stays", "activities", "dining"];
const TAB_LABEL: Record<Tab, string> = { itinerary: "Itinerary", stays: "Stays", activities: "Activities", dining: "Dining" };
const TAB_FILTER: Record<Tab, MapFilter> = { itinerary: "all", stays: "hotel", activities: "attraction", dining: "restaurant" };
const FILTER_TAB: Record<MapFilter, Tab> = { all: "itinerary", hotel: "stays", attraction: "activities", restaurant: "dining" };
const TAB_ROW: Record<Exclude<Tab, "itinerary">, PickRowKey> = { stays: "stays", activities: "things", dining: "eat" };
const ROW_KIND: Record<PickRowKey, PlaceKind> = { things: "attraction", stays: "hotel", eat: "restaurant" };
const HOVER_IN_MS = 250;
const HOVER_OUT_MS = 300;
const TAGLINE_MAX = 72;

export function DestinationCards({ args, status, toolCallId }: { args: Streaming<ShowDestinationsArgs>; status: ToolCallStatus; toolCallId: string }) {
  const items = (args.destinations ?? []).filter((d) => d && d.name);
  const title = args.title || "Destinations for you";
  useRegisterPlaces({
    toolCallId,
    status,
    kind: "destination",
    items: items.map((d) => ({ name: d.name, hint: d.country })),
  });
  return (
    <div>
      <SectionHeader title={title} status={status} />
      <CardRow
        kind="destination"
        label={title}
        items={items.map((d, i) => ({ id: `${d.name}-${i}`, name: d.name, node: <DestinationCard destination={d} index={i} toolCallId={toolCallId} /> }))}
      />
    </div>
  );
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** The strongest reason behind a score, in words, for a recommendation row. */
function topReason(match: MatchResult): string | undefined {
  const best = [...match.reasons].filter((r) => r.delta !== 0).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  return best?.text;
}

/** The pins a city's itinerary puts on the map while that city is selected: the stay and every stop. */
function itineraryToPins(draft: ItineraryDraft, scope: string, toolCallId: string): MapPlace[] {
  const seen = new Set<string>();
  return draftPicks(draft).flatMap(({ place }) => {
    if (seen.has(place.id)) return [];
    seen.add(place.id);
    return [{ ...place, key: `reco:${scope}:${place.id}`, toolCallId: `reco:${toolCallId}`, scope }];
  });
}

/** Whether the element has come on screen (once it has, it stays true); cards load their itinerary then. */
function useSeen(ref: RefObject<Element | null>): boolean {
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setSeen(true);
        observer.disconnect();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, seen]);
  return seen;
}

/** The pins a city's recommendation set puts on the map while that city is selected. */
function picksToPins(picks: DestinationPicks, scope: string, toolCallId: string): MapPlace[] {
  return picks.rows.flatMap((row) => row.items.map(({ place }) => ({ ...place, kind: ROW_KIND[row.key], key: `reco:${scope}:${place.id}`, toolCallId: `reco:${toolCallId}`, scope })));
}

/**
 * One destination as a complete itinerary built for this traveler: a photo face with the plan's
 * length, stay and match, that flips to the itinerary (quick facts, the match, the days with
 * their stops, and tabs with more stays, activities and dining), over a footer with the two
 * actions that never move: Make itinerary (saves the whole plan as a trip in one click) and Save.
 * Fine pointers reveal the back on hover; everyone gets the Itinerary control; selecting the card
 * or a row puts the city's places on the map.
 */
function DestinationCard({ destination: d, index, toolCallId }: { destination: DestinationArgs; index: number; toolCallId: string }) {
  const name = d.name ?? "";
  const pin = usePlacePin(toolCallId, index);
  const threadId = useCardThreadId();
  const view = useMapView(threadId);
  const { saved, toggleSaved, planner } = useTravelStore();
  const send = useSendMessage();
  const reaction = useReaction({ name: d.name, kind: "destination", place: pin.place, destination: d.name });
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)", false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)", false);
  const headingId = useId();
  const tabsId = useId();

  const [face, setFace] = useState<Face>("photo");
  const [reveal, setReveal] = useState<Reveal>("closed");
  const [localTab, setLocalTab] = useState<Tab>("itinerary");
  const [showAll, setShowAll] = useState(false);
  // Mirrors `reveal` for the hover timers, which fire outside a render.
  const revealRef = useRef<Reveal>("closed");
  useEffect(() => {
    revealRef.current = reveal;
  }, [reveal]);
  const inTimer = useRef<number | null>(null);
  const outTimer = useRef<number | null>(null);
  /** After an explicit "Photo", hover only reveals again once the pointer has left and returned. */
  const armed = useRef(true);
  const profileControl = useRef<HTMLButtonElement>(null);
  const photoControl = useRef<HTMLButtonElement>(null);

  const place = pin.place;
  const scopeId = place?.id ?? `name:${slug(name)}`;
  const isActive = !!view.activeDestination && view.activeDestination.id === scopeId;
  const tab: Tab = isActive ? FILTER_TAB[view.filter] : localTab;
  const label = [d.name, d.country].filter(Boolean).join(", ");
  const isSaved = !!findSaved(saved, { kind: "destination", title: name, refId: place?.id });

  const candidate = useMemo<MatchCandidate | null>(() => {
    if (!name) return null;
    return {
      kind: "destination",
      name,
      category: place?.category,
      rating: place?.rating,
      userRatingCount: place?.userRatingCount,
      text: [d.tagline, d.whyItFits, d.knownFor, d.cityFeel, ...(d.vibes ?? []), ...(d.highlights ?? []), place?.summary ?? ""].filter(Boolean).join(" "),
      tradeoffs: [],
    };
  }, [name, place, d.tagline, d.whyItFits, d.knownFor, d.cityFeel, d.vibes, d.highlights]);
  const match = useMatch(candidate);

  // The itinerary loads once the card is on screen and the city is placed (its name is final
  // then), as long as this chat's dates say or the suggested stay ("3–4 nights").
  const articleRef = useRef<HTMLElement>(null);
  const seen = useSeen(articleRef);
  const days = Math.min(MAX_ITINERARY_DAYS, daysBetween(planner.startDate, planner.endDate) ?? daysFromStay(d.suggestedStay));
  const plan = useItineraryDraft(seen && place && name ? label : null, days);
  const planMatch = useMemo(() => (plan.draft?.days.length ? draftMatch(plan.draft) : null), [plan.draft]);
  const shownMatch = planMatch ?? match;

  // The other tabs' recommendation sets load when one is chosen, never on a passing hover, and
  // once per destination for the whole session.
  const wantPicks = tab !== "itinerary";
  const { picks, loading, error, retry } = useDestinationPicks(wantPicks && name ? label : null);

  // While this city is selected, the tab on show is its pins: the itinerary, or a category's picks.
  useEffect(() => {
    if (!isActive || !threadId) return;
    if (tab === "itinerary" && plan.draft?.days.length) mapActions.setScopedPlaces(threadId, scopeId, itineraryToPins(plan.draft, scopeId, toolCallId));
    else if (tab !== "itinerary" && picks) mapActions.setScopedPlaces(threadId, scopeId, picksToPins(picks, scopeId, toolCallId));
  }, [isActive, threadId, tab, plan.draft, picks, scopeId, toolCallId]);

  const clearTimers = useCallback(() => {
    if (inTimer.current) window.clearTimeout(inTimer.current);
    if (outTimer.current) window.clearTimeout(outTimer.current);
    inTimer.current = null;
    outTimer.current = null;
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const focusLater = (ref: typeof profileControl) => requestAnimationFrame(() => ref.current?.focus({ preventScroll: true }));

  const activate = useCallback(() => {
    if (!threadId || !name) return;
    mapActions.setActiveDestination(threadId, { id: scopeId, name, lat: place?.lat, lng: place?.lng });
    if (place) mapActions.setFocus(threadId, place);
  }, [threadId, name, scopeId, place]);

  /** Keeps a hovered profile from closing by itself once the traveler has acted in it. */
  const pinIfHover = () => {
    if (revealRef.current === "hover") setReveal("pinned");
  };

  const openProfile = () => {
    clearTimers();
    setFace("profile");
    setReveal("pinned");
    activate();
    focusLater(photoControl);
  };

  const backToPhoto = () => {
    clearTimers();
    setFace("photo");
    setReveal("closed");
    armed.current = false;
    focusLater(profileControl);
  };

  const onFacePointerEnter = () => {
    if (!finePointer || !armed.current) return;
    if (outTimer.current) {
      window.clearTimeout(outTimer.current);
      outTimer.current = null;
    }
    if (face === "profile" || inTimer.current) return;
    inTimer.current = window.setTimeout(() => {
      inTimer.current = null;
      if (revealRef.current !== "closed") return;
      setFace("profile");
      setReveal("hover");
    }, HOVER_IN_MS);
  };

  const onCardPointerLeave = () => {
    if (!finePointer) return;
    if (inTimer.current) {
      window.clearTimeout(inTimer.current);
      inTimer.current = null;
    }
    armed.current = true;
    if (revealRef.current !== "hover") return;
    outTimer.current = window.setTimeout(() => {
      outTimer.current = null;
      if (revealRef.current !== "hover") return;
      setFace("photo");
      setReveal("closed");
    }, HOVER_OUT_MS);
  };

  const selectTab = (next: Tab) => {
    clearTimers();
    setReveal("pinned");
    setLocalTab(next);
    setShowAll(false);
    if (!isActive) activate();
    if (threadId) mapActions.setFilter(threadId, TAB_FILTER[next]);
  };

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const current = TABS.indexOf(tab);
    const next = TABS[(current + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    document.getElementById(`${tabsId}-${next}`)?.focus();
  };

  const showOnMap = (item: ResolvedPlace, kind: PlaceKind) => {
    if (!threadId) return;
    clearTimers();
    setReveal("pinned");
    if (!isActive) activate();
    if (view.filter !== "all" && view.filter !== kind) mapActions.setFilter(threadId, kind as MapFilter);
    const key = `reco:${scopeId}:${item.id}`;
    mapActions.addPlaces(threadId, [{ ...item, kind, key, toolCallId: `reco:${toolCallId}`, scope: scopeId }]);
    mapActions.selectPlace(threadId, key);
  };

  const ask = (text: string) => {
    pinIfHover();
    if (!draftMessage(text)) void send(text);
  };

  const save = () => {
    pinIfHover();
    toggleSaved({ kind: "destination", title: name, subtitle: d.country, destination: name, url: place?.googleMapsUri ?? googleMapsSearchUrl(label), place, refId: place?.id });
  };

  const getDraft = () => {
    clearTimers();
    if (revealRef.current === "hover") setReveal("pinned");
    return plan.draft ? Promise.resolve(plan.draft) : loadItineraryDraft(label, days);
  };

  if (reaction.current?.verdict === "disliked" && name) return <HiddenPlaceCard name={name} feedbackId={reaction.current.id} />;

  const tagline = d.tagline && d.tagline.length > TAGLINE_MAX ? `${d.tagline.slice(0, TAGLINE_MAX - 1).trimEnd()}…` : d.tagline;
  const facts = [
    { label: "Suggested stay", value: d.suggestedStay },
    { label: "City feel", value: d.cityFeel },
    { label: "Known for", value: d.knownFor },
    { label: "Best season", value: d.bestTime },
  ].filter((f): f is { label: string; value: string } => !!f.value);
  const rowsFor = (t: Exclude<Tab, "itinerary">) => picks?.rows.find((r) => r.key === TAB_ROW[t])?.items ?? [];
  const planDays = plan.draft?.days.length ?? 0;
  const planLine = planDays
    ? [`${planDays}-day itinerary`, plan.draft?.stay ? `stay at ${shortPlaceName(plan.draft.stay.place.name)}` : ""].filter(Boolean).join(" · ")
    : plan.loading
      ? "Building your itinerary…"
      : "";
  const showingPhoto = face === "photo";

  return (
    <article
      ref={articleRef}
      aria-labelledby={headingId}
      data-testid="destination-card"
      data-face={face}
      data-reveal={reveal}
      data-active={isActive || undefined}
      onPointerLeave={onCardPointerLeave}
      className="flex h-[560px] w-full flex-col overflow-hidden rounded-[18px] border border-border bg-white shadow-card"
    >
      <div className="relative min-h-0 flex-1 [perspective:1000px]" onPointerEnter={onFacePointerEnter}>
        <div className={clsx("xp-flip", reducedMotion && "xp-flip--fade")} data-face={face}>
          {/* Photo face */}
          <section className="xp-flip__front absolute inset-0 flex flex-col bg-white" inert={!showingPhoto} aria-hidden={!showingPhoto}>
            <CardPhoto place={place} queries={[name, label]} alt={label} className="min-h-0 flex-1" onOpen={openProfile}>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />
              {d.whyItFits ? (
                <span className="absolute left-3 top-3 rounded-full border border-white/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm">Curated for you</span>
              ) : null}
              <button
                ref={profileControl}
                type="button"
                onClick={openProfile}
                aria-label={`Itinerary for ${name}`}
                className="absolute right-3 top-3 flex h-9 items-center gap-1.5 rounded-full border border-white/70 bg-black/25 px-3 text-[13px] font-semibold text-white backdrop-blur transition-colors hover:bg-black/45"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Itinerary
              </button>
              <div className="absolute inset-x-0 bottom-0 px-4 pb-9 text-white drop-shadow">
                <h3 id={headingId} className="font-serif text-[36px] leading-[1.05]">
                  <button type="button" onClick={openProfile} className="text-left">
                    {name}
                  </button>
                </h3>
                {d.country ? (
                  <p className="mt-1 flex items-center gap-1 text-[14px]">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {d.country}
                  </p>
                ) : null}
                {tagline ? <p className="mt-2 max-w-[30ch] text-[14px] leading-snug text-white/90">{tagline}</p> : null}
                {planLine ? (
                  <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold" data-testid="itinerary-summary">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> <span className="truncate">{planLine}</span>
                  </p>
                ) : null}
                <p className="mt-1.5 text-[12px] text-white/75">{finePointer ? "Hover for your itinerary" : "Tap Itinerary for your days and picks"}</p>
              </div>
            </CardPhoto>
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-white px-4 py-2.5" data-testid="destination-match">
              {shownMatch ? <MatchBadge match={shownMatch} size="sm" /> : <Text value={undefined} className="h-4 w-28" />}
              <RecThumbs name={name} kind="destination" place={place} destination={name} context="chat" match={match} size="sm" />
            </div>
          </section>

          {/* Itinerary face */}
          <section
            className="xp-flip__back xp-scroll absolute inset-0 overflow-y-auto bg-surface-warm"
            inert={showingPhoto}
            aria-hidden={showingPhoto}
            onFocusCapture={() => {
              clearTimers();
              pinIfHover();
            }}
          >
            <div className="min-w-0 px-4 pb-4 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Built for you</span>
                <button
                  ref={photoControl}
                  type="button"
                  onClick={backToPhoto}
                  aria-label={`Show the photo of ${name}`}
                  className="flex h-8 items-center gap-1.5 rounded-full border border-border bg-white px-3 text-[12px] font-semibold transition-colors hover:bg-surface"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Photo
                </button>
              </div>
              <h3 className="mt-2 font-serif text-[30px] leading-[1.1]">
                <button type="button" onClick={activate} className="text-left">
                  {name}
                </button>
              </h3>
              {d.country ? (
                <p className="mt-1 flex items-center gap-1 text-[13px] text-muted">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {d.country}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-brand-soft/70 px-3 py-2" data-testid="your-match">
                <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                <span className="text-[12px] font-semibold text-brand">Your match</span>
                {shownMatch ? (
                  <>
                    <MatchBadge match={shownMatch} size="sm" />
                    <RecThumbs name={name} kind="destination" place={place} destination={name} context="chat" match={match} size="sm" />
                    {topReason(shownMatch) ? <span className="w-full text-[12px] text-neutral-700">{topReason(shownMatch)}</span> : null}
                  </>
                ) : (
                  <Text value={undefined} className="h-4 w-24" />
                )}
              </div>

              <div role="tablist" aria-label={`${name} recommendations`} className="mt-3 flex gap-1 border-b border-border" onKeyDown={onTabKey}>
                {TABS.map((t) => (
                  <button
                    key={t}
                    id={`${tabsId}-${t}`}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    aria-controls={`${tabsId}-panel`}
                    tabIndex={tab === t ? 0 : -1}
                    onClick={() => selectTab(t)}
                    className={clsx("-mb-px border-b-2 px-2.5 pb-2 pt-1 text-[13px] font-semibold transition-colors", tab === t ? "border-brand text-brand" : "border-transparent text-muted hover:text-foreground")}
                  >
                    {TAB_LABEL[t]}
                  </button>
                ))}
              </div>

              <div id={`${tabsId}-panel`} role="tabpanel" className="pt-3">
                {tab === "itinerary" ? (
                  <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
                    <p className="text-[14px] leading-snug text-neutral-800">
                      <Text value={d.whyItFits} lines={2} />
                    </p>
                    {!plan.loading && !plan.error && !planDays && (d.highlights ?? []).filter(Boolean).length ? (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Three to explore</div>
                        <ul className="mt-1.5 grid gap-1.5">
                          {(d.highlights ?? [])
                            .filter((h): h is string => !!h)
                            .slice(0, 3)
                            .map((h) => (
                              <li key={h}>
                                <button
                                  type="button"
                                  onClick={() => ask(`Find ${h} in ${name} for me.`)}
                                  className="flex w-full items-center gap-2.5 rounded-[10px] border border-border bg-white px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-surface"
                                >
                                  <Search className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden="true" />
                                  <span className="min-w-0 flex-1 truncate">{h}</span>
                                  <span className="shrink-0 text-[11px] font-semibold text-brand">Find options</span>
                                </button>
                              </li>
                            ))}
                        </ul>
                      </div>
                    ) : (
                      <ItineraryPlan
                        draft={plan.draft}
                        loading={plan.loading || (!place && !!name)}
                        error={plan.error}
                        onRetry={plan.retry}
                        onAsk={() => ask(`Make me a ${days}-day itinerary for ${label}.`)}
                        onShow={(item, kind) => showOnMap(item, kind)}
                      />
                    )}
                  </div>
                ) : (
                  <CategoryRows
                    tab={tab}
                    items={rowsFor(tab)}
                    loading={loading}
                    error={error}
                    showAll={showAll}
                    onShowAll={() => setShowAll(true)}
                    onRetry={retry}
                    onAsk={() => ask(`Recommend ${TAB_LABEL[tab].toLowerCase()} in ${name} that fit me.`)}
                    onShow={(item) => showOnMap(item, ROW_KIND[TAB_ROW[tab]])}
                  />
                )}
              </div>

              {facts.length ? (
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3" data-testid="quick-facts">
                  {facts.map((f) => (
                    <div key={f.label} className="min-w-0">
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{f.label}</dt>
                      <dd className="mt-0.5 text-[15px] font-medium leading-snug">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {place ? (
                <button type="button" onClick={pin.open} className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
                  Explore city details <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      {/* The two actions, outside the rotating faces so they never move. */}
      <footer className="flex h-[84px] shrink-0 items-center gap-3 border-t border-border bg-surface-warm px-4">
        {place ? (
          <MakeItineraryButton
            name={name}
            label={label}
            getDraft={getDraft}
            fallbackPrompt={`Make me a ${days}-day itinerary for ${label}.`}
            className="flex h-12 min-w-0 flex-[2] items-center justify-center gap-2 rounded-xl bg-brand px-4 text-[15px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-wait disabled:bg-brand/60"
          />
        ) : (
          <button
            type="button"
            disabled
            aria-label={`Make ${name} itinerary`}
            title="Finding it on the map…"
            className="flex h-12 min-w-0 flex-[2] cursor-wait items-center justify-center gap-2 rounded-xl bg-brand/50 px-4 text-[15px] font-semibold text-white"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" /> Make itinerary
          </button>
        )}
        <button
          type="button"
          onClick={save}
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${name} from saved` : `Save ${name}`}
          className="flex h-12 min-w-[104px] flex-1 items-center justify-center gap-2 rounded-xl border border-brand bg-white px-4 text-[15px] font-semibold text-brand transition-colors hover:bg-brand-soft"
        >
          <Heart className={clsx("h-4 w-4", isSaved && "fill-current")} aria-hidden="true" /> {isSaved ? "Saved" : "Save"}
        </button>
      </footer>
    </article>
  );
}

function SkeletonRows() {
  return (
    <ul className="grid gap-2" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="xp-skeleton h-[68px] rounded-[10px]" />
      ))}
    </ul>
  );
}

function CategoryRows({
  tab,
  items,
  loading,
  error,
  showAll,
  onShowAll,
  onRetry,
  onAsk,
  onShow,
}: {
  tab: Exclude<Tab, "itinerary">;
  items: { place: ResolvedPlace; match: MatchResult }[];
  loading: boolean;
  error: string | null;
  showAll: boolean;
  onShowAll: () => void;
  onRetry: () => void;
  onAsk: () => void;
  onShow: (place: ResolvedPlace) => void;
}) {
  if (loading && !items.length) return <SkeletonRows />;
  if (error && !items.length) {
    return (
      <div className="rounded-[10px] border border-dashed border-border bg-white px-3 py-3 text-[13px] text-muted">
        Couldn&apos;t load recommendations.{" "}
        <button type="button" onClick={onRetry} className="font-semibold text-brand hover:underline">
          Retry
        </button>
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="rounded-[10px] border border-dashed border-border bg-white px-3 py-3 text-[13px] text-muted" data-testid="reco-empty">
        No {TAB_LABEL[tab].toLowerCase()} recommendations yet.{" "}
        <button type="button" onClick={onAsk} className="font-semibold text-brand hover:underline">
          Ask for recommendations
        </button>
      </div>
    );
  }
  const visible = showAll ? items : items.slice(0, 3);
  const kind = ROW_KIND[TAB_ROW[tab]];
  return (
    <div>
      <ul className="grid gap-2">
        {visible.map(({ place, match }) => (
          <RecoRow key={place.id} place={place} match={match} kind={kind} onShow={() => onShow(place)} />
        ))}
      </ul>
      {!showAll && items.length > visible.length ? (
        <button type="button" onClick={onShowAll} className="mt-2 text-[13px] font-semibold text-brand hover:underline">
          Show all {items.length}
        </button>
      ) : null}
    </div>
  );
}

/** One recommended place: thumbnail, name, category and area, the reason it fits, and its score; the row shows it on the map. */
function RecoRow({ place, match, kind, onShow }: { place: ResolvedPlace; match: MatchResult; kind: PlaceKind; onShow: () => void }) {
  const photo = place.photos?.[0];
  const reason = topReason(match);
  const area = place.locality?.split(",")[0]?.trim();
  return (
    <li className="rounded-[10px] border border-border bg-white" data-testid="destination-reco-row" data-kind={kind}>
      <button type="button" onClick={onShow} aria-label={`Show ${place.name} on map`} className="flex w-full items-start gap-3 rounded-[10px] p-2.5 text-left transition-colors hover:bg-surface">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
          <img src={photoAtWidth(photo, 160)} alt="" title={photoCreditTitle(place.photoCredits?.[0])} loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface text-neutral-500">
            <MapPin className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold leading-tight" title={place.name}>
            {shortPlaceName(place.name)}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-muted">{[place.category, area].filter(Boolean).join(" · ")}</span>
          {reason ? <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-neutral-700">{reason}</span> : null}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-brand" title={`${match.label} · ${match.score}%`}>
            <Sparkles className="h-3 w-3" aria-hidden="true" /> {match.score}%
          </span>
          <MapPin className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
        </span>
      </button>
    </li>
  );
}
