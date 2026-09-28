"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeftRight, Bed, Check, Heart, Loader2, MapPin, PenLine, Search, Sparkles } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { ShowDestinationsArgs, Streaming } from "@/lib/travel/schemas";
import { formatDateRange, useTravelStore } from "@/lib/store";
import { mapActions, useMapView } from "@/lib/map-store";
import type { MapPlace, PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { photoAtWidth } from "@/lib/places/destination-photo";
import { useDestinationPicks, type DestinationPicks, type PickRowKey } from "@/lib/recs/destination-picks";
import {
  applyOrder,
  applySwaps,
  asBuilt,
  draftMatch,
  draftPicks,
  draftTripInput,
  moveStopTo,
  planPick,
  planSignature,
  swapsForMisses,
  useItineraryDraft,
  type StopOrder,
  type Swaps,
} from "@/lib/recs/itinerary-draft";
import { planPickerKey, useRegisterPlanPicker, type PlanPicker } from "@/lib/plan-picker";
import { putChatPlan, rememberChatPlan, useChatPlans } from "@/lib/chat-plans";
import { MAX_ITINERARY_DAYS, daysBetween, daysFromStay } from "@/lib/itinerary";
import { shortPlaceName } from "@/lib/places/names";
import type { DraftPick } from "@/server/itineraries";
import type { MatchCandidate, MatchResult } from "@/lib/match";
import { useCardThreadId, usePlacePin, useRegisterPlaces } from "@/components/map/useRegisterPlaces";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { draftMessage } from "@/components/chat/draft";
import { HiddenPlaceCard, useReaction } from "@/components/feedback/ReactionControl";
import { MatchBadge, useMatch } from "@/components/recs/MatchBadge";
import { RecThumbs } from "@/components/recs/RecThumbs";
import { photoCreditTitle } from "@/components/ui/PhotoCredit";
import { CardPhoto, CardRow, SectionHeader, Skeleton, Text } from "./shared";
import { ItineraryDays, PLAN_COLOR, planPinKey, type PlanMoveProps } from "./ItineraryDays";
import type { PlanSwapProps } from "./PlanParts";

type DestinationArgs = Streaming<ShowDestinationsArgs>["destinations"] extends (infer U)[] | undefined ? U : never;

const ROW_KIND: Record<PickRowKey, PlaceKind> = { things: "attraction", stays: "hotel", eat: "restaurant" };
const KIND_ROW: Partial<Record<PlaceKind, PickRowKey>> = { hotel: "stays", attraction: "things", restaurant: "eat" };
const KIND_LABEL: Partial<Record<PlaceKind, string>> = { hotel: "stays", attraction: "things to do", restaurant: "restaurants" };
const CHOOSE_NOUN: Partial<Record<PlaceKind, string>> = { hotel: "a stay", attraction: "something to do", restaurant: "a place to eat" };

/** A place of the plan being replaced from its kind's full list: its id in the plan as built, its kind and the name on show. */
interface Choosing {
  id: string;
  kind: PlaceKind;
  name: string;
}

/** What a list's rows can do with the plan: make a hotel the stay, or put a place in for the stop being replaced. */
interface RowPlan {
  stayId: string | null;
  taken: ReadonlySet<string>;
  missed: ReadonlySet<string>;
  choosing: Choosing | null;
  onUse: (place: ResolvedPlace, match: MatchResult, kind: PlaceKind) => void;
  onCancel: () => void;
}
const TAGLINE_MAX = 72;

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** The id a city's pins are scoped under on the map: its place, or its name until the place is known. */
const cityScope = (place: ResolvedPlace | undefined, name: string) => place?.id ?? `name:${slug(name)}`;

/** Makes a city the one whose itinerary owns the map (its day, its places). */
function activateCity(threadId: string | null, name: string, place: ResolvedPlace | undefined) {
  if (!threadId || !name) return;
  const id = cityScope(place, name);
  if (mapActions.getState().threads[threadId]?.activeDestination?.id === id) return;
  mapActions.setActiveDestination(threadId, { id, name, lat: place?.lat, lng: place?.lng });
  if (place) mapActions.setFocus(threadId, place);
}

/** The strongest reason behind a score, in words, for a recommendation row. */
function topReason(match: MatchResult): string | undefined {
  const best = [...match.reasons].filter((r) => r.delta !== 0).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  return best?.text;
}

/** A destination as the match model reads it. */
function useDestinationMatch(d: DestinationArgs, place: ResolvedPlace | undefined): MatchResult | null {
  const name = d.name ?? "";
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
  return useMatch(candidate);
}

/** Whether the element has come on screen (once it has, it stays true); an itinerary loads then. */
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

/** A city's recommendation set of one kind as pins, while a stop is being replaced from it. */
function picksToPins(picks: DestinationPicks, kind: PlaceKind, scope: string, toolCallId: string): MapPlace[] {
  const row = picks.rows.find((r) => ROW_KIND[r.key] === kind);
  return (row?.items ?? []).map(({ place }) => ({ ...place, kind, key: planPinKey(scope, place.id), toolCallId: `reco:${toolCallId}`, scope }));
}

/**
 * A trip request's answer: one destination is its itinerary, right in the chat; several are a row of
 * city cards (thumbs order them) above the itinerary of the one picked.
 */
export function DestinationCards({ args, status, toolCallId }: { args: Streaming<ShowDestinationsArgs>; status: ToolCallStatus; toolCallId: string }) {
  const items = (args.destinations ?? []).filter((d) => d && d.name);
  const title = args.title || "Destinations for you";
  const threadId = useCardThreadId();
  useRegisterPlaces({
    toolCallId,
    status,
    kind: "destination",
    items: items.map((d) => ({ name: d.name, hint: d.country })),
  });
  const [selected, setSelected] = useState(0);
  const current = Math.min(selected, Math.max(0, items.length - 1));
  const multi = items.length > 1;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3" data-testid="destination-cards">
      {multi ? <SectionHeader title={title} subtitle="Pick one to see its itinerary" status={status} /> : null}
      {multi ? (
        <CardRow
          kind="destination"
          label={title}
          compact
          className="!mt-0"
          items={items.map((d, i) => ({
            id: `${i}`,
            name: d.name,
            node: (
              <CityCard
                destination={d}
                index={i}
                toolCallId={toolCallId}
                selected={i === current}
                onSelect={(place) => {
                  setSelected(i);
                  activateCity(threadId, d.name ?? "", place);
                }}
              />
            ),
          }))}
        />
      ) : null}
      <div>
        {items.length ? (
          items.map((d, i) => <DestinationItinerary key={i} destination={d} index={i} toolCallId={toolCallId} shown={i === current} />)
        ) : (
          <ItinerarySkeleton />
        )}
      </div>
    </div>
  );
}

/** One city of several: its photo and name, its match and thumbs; picking it shows its itinerary below the row. */
function CityCard({ destination: d, index, toolCallId, selected, onSelect }: { destination: DestinationArgs; index: number; toolCallId: string; selected: boolean; onSelect: (place: ResolvedPlace | undefined) => void }) {
  const name = d.name ?? "";
  const place = usePlacePin(toolCallId, index).place;
  const match = useDestinationMatch(d, place);
  const label = [d.name, d.country].filter(Boolean).join(", ");
  const tagline = d.tagline && d.tagline.length > TAGLINE_MAX ? `${d.tagline.slice(0, TAGLINE_MAX - 1).trimEnd()}…` : d.tagline;
  return (
    <div className={clsx("flex w-full flex-col overflow-hidden rounded-2xl border bg-white transition-[border-color,box-shadow]", selected ? "border-brand ring-2 ring-brand/25" : "border-border")} data-testid="city-card" data-selected={selected || undefined}>
      <button type="button" onClick={() => onSelect(place)} aria-pressed={selected} aria-label={`Show the ${name} itinerary`} className="block text-left">
        <CardPhoto place={place} queries={[name, label]} alt={label} className="h-[104px]" creditClassName="left-1.5 top-1.5">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-3 pb-2 text-white drop-shadow">
            <div className="truncate font-serif text-[22px] leading-tight">{name}</div>
            {d.country ? <div className="truncate text-[12px] text-white/90">{d.country}</div> : null}
          </div>
        </CardPhoto>
        {tagline ? <p className="line-clamp-2 px-3 pt-2 text-[12px] leading-snug text-neutral-700">{tagline}</p> : null}
      </button>
      <div className="mt-auto flex items-center justify-between gap-2 px-3 pb-2.5 pt-2">
        {match ? <MatchBadge match={match} size="sm" /> : <Skeleton className="h-5 w-20" />}
        <RecThumbs name={name} kind="destination" place={place} destination={name} context="chat" match={match} size="sm" />
      </div>
    </div>
  );
}

function ItinerarySkeleton() {
  return (
    <div className="overflow-hidden rounded-[18px] border border-border bg-white" aria-busy="true" aria-label="Building your itinerary">
      <div className="xp-skeleton h-[150px]" />
      <div className="grid gap-3 px-4 py-4 sm:px-6">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <div className="xp-skeleton h-[76px] rounded-2xl" />
        <div className="xp-skeleton h-[180px] rounded-2xl" />
      </div>
    </div>
  );
}

/**
 * One destination as a complete itinerary built for this traveler, all of it on the card: a photo
 * with the city, "Your {city} itinerary" with the plan's match, where they'll stay, and a tab per day
 * with its stops, each opening its details and reviews on the map. Click to edit turns every place
 * into something to swap, judge or move; Save keeps the plan as it stands with this chat (and in
 * Trips), so reopening the chat shows it. While the traveler works on it, the city owns the map: its
 * stay and the day on show, numbered, with the day's route.
 */
function DestinationItinerary({ destination: d, index, toolCallId, shown: visible }: { destination: DestinationArgs; index: number; toolCallId: string; shown: boolean }) {
  const name = d.name ?? "";
  const place = usePlacePin(toolCallId, index).place;
  const threadId = useCardThreadId();
  const view = useMapView(threadId);
  const { planner, profile, recFeedback, addTrip, patchTrip, upsertChat } = useTravelStore();
  const send = useSendMessage();
  const reaction = useReaction({ name: d.name, kind: "destination", place, destination: d.name });
  const headingId = useId();
  const label = [d.name, d.country].filter(Boolean).join(", ");
  const scopeId = cityScope(place, name);
  const isActive = !!view.activeDestination && view.activeDestination.id === scopeId;
  const match = useDestinationMatch(d, place);

  // The plan saved with this chat for this card, when there is one, is the plan; otherwise one is
  // built once the card is on screen and the city is placed (its name is final then), as long as the
  // chat's dates say or the suggested stay ("3–4 nights").
  const planKey = `${toolCallId}:${index}`;
  const chatPlans = useChatPlans(threadId);
  const saved = chatPlans.ready ? chatPlans.plans[planKey] ?? null : null;
  const savedBase = useMemo(() => (saved ? asBuilt(saved.draft) : null), [saved]);
  const articleRef = useRef<HTMLElement>(null);
  const seen = useSeen(articleRef);
  const days = Math.min(MAX_ITINERARY_DAYS, daysBetween(planner.startDate, planner.endDate) ?? daysFromStay(d.suggestedStay));
  const plan = useItineraryDraft(seen && place && name && chatPlans.ready && !saved ? label : null, days);
  const base = savedBase ?? plan.draft;

  // The plan as the traveler shaped it: their swaps, and a place marked not a fit (in its own
  // panel, a row, anywhere) giving way to its first alternate that is not a miss too.
  const [swaps, setSwaps] = useState<Swaps>({});
  // The order they put the stops in (dragged, moved a step, or to another day); times follow it.
  const [order, setOrder] = useState<StopOrder>({});
  const missed = useMemo(() => new Set(recFeedback.filter((f) => f.verdict === "down").map((f) => f.placeId)), [recFeedback]);
  const shown = useMemo(() => (base ? applyOrder(applySwaps(base, { ...swaps, ...swapsForMisses(base, swaps, missed) }), order) : null), [base, swaps, missed, order]);
  // Places a swap must not offer: already in the plan, or marked not a fit.
  const taken = useMemo(() => new Set(shown ? draftPicks(shown).map((p) => p.place.id) : []), [shown]);
  const unavailable = useMemo(() => new Set([...taken, ...missed]), [taken, missed]);
  // "See all" from a pick's swap list: the stop being replaced from its kind's list, and the place just chosen.
  const [choosing, setChoosing] = useState<Choosing | null>(null);
  const [recentId, setRecentId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [day, setDay] = useState(1);
  const planMatch = useMemo(() => (shown?.days.length ? draftMatch(shown) : null), [shown]);
  const shownMatch = planMatch ?? match;
  const ready = !!shown?.days.length;
  // Saved, and changed since: the card offers to save the changes.
  const dirty = !!savedBase && !!shown && planSignature(shown) !== planSignature(savedBase);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "failed">("idle");

  // A kind's full list loads when a stop is being replaced from it, once per destination for the session.
  const { picks, loading: picksLoading, error: picksError, retry: picksRetry } = useDestinationPicks(choosing && name ? label : null);

  const dayIndex = shown ? Math.max(0, shown.days.findIndex((x) => x.day === day)) : 0;

  // While this city owns the map: its stay and the day on show, numbered, with the day's route; while
  // a stop is being replaced, the places of its kind to choose from.
  useEffect(() => {
    if (!isActive || !threadId || !shown) return;
    const reco = `reco:${toolCallId}`;
    if (choosing && picks) {
      mapActions.setScopedPlaces(threadId, scopeId, picksToPins(picks, choosing.kind, scopeId, toolCallId));
      mapActions.setRoute(threadId, null);
      return;
    }
    const stay = shown.stay;
    const today = shown.days[dayIndex];
    const pins: MapPlace[] = [];
    if (stay) pins.push({ ...stay.place, kind: "hotel", key: planPinKey(scopeId, stay.place.id), toolCallId: reco, scope: scopeId, group: "Where you'll stay" });
    today?.stops.forEach((s, i) =>
      pins.push({ ...s.place, kind: s.kind, key: planPinKey(scopeId, s.place.id), toolCallId: reco, scope: scopeId, badge: String(i + 1), color: PLAN_COLOR, group: `Day ${today.day}` }),
    );
    mapActions.setScopedPlaces(threadId, scopeId, pins);
    const path = [...(stay ? [stay.place] : []), ...(today?.stops ?? []).map((s) => s.place)].map((p) => ({ lat: p.lat, lng: p.lng }));
    mapActions.setRoute(
      threadId,
      today && path.length >= 2
        ? { scope: scopeId, key: `day:${today.day}`, label: `Day ${today.day} of your itinerary · ${today.stops.length} ${today.stops.length === 1 ? "stop" : "stops"}`, color: PLAN_COLOR, path }
        : null,
    );
  }, [isActive, threadId, shown, dayIndex, scopeId, toolCallId, choosing, picks]);

  const activate = useCallback(() => activateCity(threadId, name, place), [threadId, name, place]);

  /** Puts `to` where the plan's place `original` (its id as built) is; the place as built again clears the swap. */
  const swapTo = (original: string, to: DraftPick) =>
    setSwaps((prev) => {
      const next = { ...prev };
      if (to.place.id === original) delete next[original];
      else next[original] = { place: to.place, match: to.match, why: to.why };
      return next;
    });

  /** A swap picked in a pick's list: one of its ready options (the place it replaced among them). */
  const swapIn = (pick: DraftPick, to: DraftPick) => {
    setRecentId(null);
    swapTo(pick.swappedFrom ?? pick.place.id, to);
  };

  /** "See all" in a pick's list: every place of its kind, to choose any other instead. */
  const seeAll = (pick: DraftPick, kind: PlaceKind) => {
    if (!KIND_ROW[kind]) return;
    setChoosing({ id: pick.swappedFrom ?? pick.place.id, kind, name: pick.place.name });
    activate();
  };

  /**
   * A place chosen from a list or its own panel goes into the plan: a hotel as the stay, anything else
   * instead of the stop being replaced.
   */
  const choose = (item: ResolvedPlace, itemMatch: MatchResult, kind: PlaceKind) => {
    const stay = shown?.stay;
    const original = kind === "hotel" ? (stay ? (stay.swappedFrom ?? stay.place.id) : null) : choosing?.kind === kind ? choosing.id : null;
    if (!original) return;
    swapTo(original, planPick(item, itemMatch, kind));
    setChoosing(null);
    setRecentId(item.id);
    if (threadId) mapActions.selectPlace(threadId, null);
  };

  // The plan, for the panel of any of this city's places (wherever it opens): Use as my stay, Use instead of.
  const chooseRef = useRef(choose);
  useEffect(() => {
    chooseRef.current = choose;
  });
  const planPicker = useMemo<PlanPicker | null>(
    () =>
      shown
        ? {
            city: name,
            stayId: shown.stay?.place.id ?? null,
            taken,
            missed,
            choosing: choosing ? { kind: choosing.kind, name: choosing.name } : null,
            choose: (item, itemMatch, kind) => chooseRef.current(item, itemMatch, kind),
          }
        : null,
    [shown, name, taken, missed, choosing],
  );
  useRegisterPlanPicker(planPickerKey(`reco:${toolCallId}`, scopeId), planPicker);
  const swapProps: PlanSwapProps = { unavailable, recentId, onSwap: swapIn, onSeeAll: seeAll };
  const moveProps: PlanMoveProps = {
    onMove: (key, toDay, toIndex) => {
      if (!shown) return;
      setRecentId(null);
      setOrder(moveStopTo(shown, key, toDay, toIndex));
    },
  };
  const rowPlan: RowPlan | null = shown
    ? { stayId: shown.stay?.place.id ?? null, taken, missed, choosing, onUse: (item, itemMatch, kind) => choose(item, itemMatch, kind), onCancel: () => setChoosing(null) }
    : null;

  /** A place's details and reviews: on the map beside the chat (or over the chat on a phone), its pin picked. */
  const openPlace = (item: ResolvedPlace, kind: PlaceKind) => {
    if (!threadId) return;
    activate();
    const key = planPinKey(scopeId, item.id);
    // A pin the plan already put on the map keeps its number.
    if (!mapActions.getState().threads[threadId]?.places[key]) mapActions.addPlaces(threadId, [{ ...item, kind, key, toolCallId: `reco:${toolCallId}`, scope: scopeId }]);
    const filter = mapActions.getState().threads[threadId]?.filter;
    if (filter && filter !== "all" && filter !== kind) mapActions.setFilter(threadId, "all");
    mapActions.selectPlace(threadId, key, "card");
  };

  const showDay = (next: number) => {
    setDay(next);
    activate();
  };

  const toggleEditing = () => {
    if (editing) setChoosing(null);
    setEditing(!editing);
    activate();
  };

  const ask = (text: string) => {
    if (!draftMessage(text)) void send(text);
  };

  /** Keeps the plan as it stands: a trip the first time (or its days updated), stored with this chat and linked to it. */
  const save = async () => {
    if (!shown || !ready || !threadId || saveState === "saving" || (saved && !dirty)) return;
    setSaveState("saving");
    try {
      const input = draftTripInput(shown, { name, label, planner, profile });
      let tripId = saved?.tripId ?? null;
      if (tripId) await patchTrip(tripId, { itinerary: input.itinerary, summary: input.summary });
      else tripId = (await addTrip(input)).id;
      const next = await putChatPlan(threadId, planKey, tripId, shown);
      // The saved plan is the new plan as built: the edits are in it now.
      setSwaps({});
      setOrder({});
      setRecentId(null);
      setChoosing(null);
      rememberChatPlan(threadId, next);
      mapActions.setThreadTrip(threadId, tripId);
      upsertChat({ id: threadId, tripId });
      setSaveState("idle");
    } catch {
      setSaveState("failed");
    }
  };

  // A city judged a miss folds away.
  const hidden = reaction.current?.verdict === "disliked" && !!name;
  if (hidden && reaction.current) return visible ? <HiddenPlaceCard name={name} feedbackId={reaction.current.id} /> : null;

  const planDays = shown?.days.length || days;
  const dates = planner.startDate && planner.endDate ? formatDateRange(planner.startDate, planner.endDate) : "";
  const travelers = planner.travelers ? `${planner.travelers} ${planner.travelers === 1 ? "traveler" : "travelers"}` : "";
  const meta = [`${planDays} ${planDays === 1 ? "day" : "days"}`, dates, travelers].filter(Boolean).join(" · ");
  const planTheDays = `Plan the days for ${label} yourself: a ${days}-day itinerary.`;
  const failed = !base && !!plan.error;
  const empty = !!base && !base.days.length;
  const choosingRow = choosing ? KIND_ROW[choosing.kind] : undefined;
  const chooserItems = choosingRow ? (picks?.rows.find((r) => r.key === choosingRow)?.items ?? []) : [];
  const pickedPrefix = `reco:${scopeId}:`;
  const pickedId = view.selectedKey?.startsWith(pickedPrefix) ? view.selectedKey.slice(pickedPrefix.length) : null;

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "failed" ? "Try again" : saved ? (dirty ? "Save changes" : "Saved") : "Save";
  const saveAria = saved ? (dirty ? `Save changes to the ${name} itinerary` : `${name} itinerary saved`) : `Save the ${name} itinerary`;

  return (
    <article
      ref={articleRef}
      hidden={!visible}
      aria-labelledby={headingId}
      data-testid="destination-card"
      data-active={isActive || undefined}
      data-saved={saved ? (dirty ? "changed" : "saved") : undefined}
      className="overflow-hidden rounded-[18px] border border-border bg-white shadow-card"
    >
      <CardPhoto place={place} queries={[name, label]} alt={label} className="h-[136px] sm:h-[148px]" onOpen={activate} creditClassName="bottom-1.5 right-1.5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/5" />
        <div className="absolute right-3 top-3 rounded-full bg-white/90 p-0.5 shadow-sm backdrop-blur">
          <RecThumbs name={name} kind="destination" place={place} destination={name} context="chat" match={match} size="sm" />
        </div>
        <div className="absolute inset-x-0 bottom-0 px-4 pb-4 text-white drop-shadow sm:px-6">
          <div className="font-serif text-[40px] leading-[1.02] sm:text-[48px]">{name}</div>
          {d.country ? (
            <p className="mt-1 flex items-center gap-1 text-[15px] sm:text-[17px]">
              <MapPin className="h-4 w-4" aria-hidden="true" /> {d.country}
            </p>
          ) : null}
        </div>
      </CardPhoto>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 px-4 pb-5 pt-4 sm:px-6">
        <header className="flex flex-wrap items-start gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h3 id={headingId} className="font-serif text-[26px] leading-tight sm:text-[30px]">
                Your {name} itinerary
              </h3>
              <span className="flex items-center" data-testid="destination-match">
                {shownMatch ? <MatchBadge match={shownMatch} size="lg" /> : <Skeleton className="h-9 w-40 rounded-full" />}
              </span>
            </div>
            <p className="mt-1 text-[15px] text-muted" data-testid="itinerary-meta">
              {meta}
              {saved ? (
                <>
                  {" · "}
                  <Link href={`/trips/${saved.tripId}`} className="font-medium text-brand underline-offset-2 hover:underline">
                    In your trips
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          {/* Nothing to edit or keep when no plan could be built. */}
          {failed || empty ? null : (
            <div className="flex w-full gap-2 sm:w-auto">
              <button
                type="button"
                onClick={toggleEditing}
                disabled={!ready}
                aria-pressed={editing}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-[16px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-wait disabled:bg-brand/50 sm:flex-none"
              >
                {editing ? <Check className="h-4 w-4" aria-hidden="true" /> : <PenLine className="h-4 w-4" aria-hidden="true" />}
                {editing ? "Done editing" : "Click to edit"}
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={!ready || saveState === "saving"}
                aria-disabled={!!saved && !dirty ? true : undefined}
                aria-label={saveAria}
                aria-busy={saveState === "saving" || undefined}
                title={saved && !dirty ? "Saved with this chat and in your trips" : undefined}
                data-testid="itinerary-save"
                className={clsx(
                  "flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-5 text-[16px] font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 sm:flex-none",
                  saved && !dirty ? "border-brand bg-brand-soft text-brand" : "border-brand bg-white text-brand hover:bg-brand-soft",
                )}
              >
                {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Heart className={clsx("h-4 w-4", saved && !dirty && "fill-current")} aria-hidden="true" />}
                {saveLabel}
              </button>
            </div>
          )}
        </header>

        {ready && shown ? (
          <ItineraryDays
            draft={shown}
            scope={scopeId}
            destination={name}
            selectedKey={view.selectedKey}
            day={shown.days[dayIndex]?.day ?? 1}
            onDay={showDay}
            editing={editing}
            onOpen={openPlace}
            swap={swapProps}
            move={moveProps}
            replaceDay={
              choosing && rowPlan ? (
                <div data-testid="itinerary-chooser">
                  <CategoryRows
                    kind={choosing.kind}
                    items={chooserItems}
                    loading={picksLoading}
                    error={picksError}
                    onRetry={picksRetry}
                    onAsk={() => ask(`Recommend ${KIND_LABEL[choosing.kind] ?? "places"} in ${name} that fit me.`)}
                    onShow={(item) => openPlace(item, choosing.kind)}
                    selectedId={pickedId}
                    plan={rowPlan}
                  />
                </div>
              ) : undefined
            }
          />
        ) : failed ? (
          <div className="rounded-2xl border border-dashed border-border bg-white px-4 py-4 text-[14px] text-muted">
            Couldn&apos;t build the itinerary.{" "}
            <button type="button" onClick={plan.retry} className="font-semibold text-brand hover:underline">
              Retry
            </button>
          </div>
        ) : empty ? (
          <div className="grid gap-3" data-testid="itinerary-empty">
            <p className="text-[15px] leading-snug text-neutral-800">
              <Text value={d.whyItFits} lines={2} />
            </p>
            {(d.highlights ?? []).filter(Boolean).length ? (
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
            ) : null}
            <p className="rounded-2xl border border-dashed border-border bg-white px-4 py-3 text-[14px] text-muted">
              Not enough places here yet to plan the days.{" "}
              <button type="button" onClick={() => ask(planTheDays)} className="font-semibold text-brand hover:underline">
                Ask the concierge
              </button>
            </p>
          </div>
        ) : (
          <div className="grid gap-4" aria-busy="true" aria-label="Building your itinerary" data-testid="itinerary-loading">
            <div className="xp-skeleton h-[88px] rounded-2xl" />
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="xp-skeleton h-9 w-20 rounded-full" />
              ))}
            </div>
            <div className="xp-skeleton h-[240px] rounded-2xl" />
          </div>
        )}
      </div>
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

/** Every place of a kind in the city, to choose one for the stop being replaced (or any hotel as the stay). */
function CategoryRows({
  kind,
  items,
  loading,
  error,
  onRetry,
  onAsk,
  onShow,
  selectedId,
  plan,
}: {
  kind: PlaceKind;
  items: { place: ResolvedPlace; match: MatchResult }[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAsk: () => void;
  onShow: (place: ResolvedPlace) => void;
  selectedId: string | null;
  plan: RowPlan;
}) {
  const choosingHere = plan.choosing && plan.choosing.kind === kind ? plan.choosing : null;
  const banner = choosingHere ? (
    <div className="mb-2 flex items-center gap-2 rounded-[10px] border border-brand/30 bg-brand-soft/60 px-3 py-2 text-[13px]" data-testid="choose-banner">
      <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        Choose {CHOOSE_NOUN[kind]} to replace <span className="font-semibold">{shortPlaceName(choosingHere.name)}</span>
      </span>
      <button type="button" onClick={plan.onCancel} className="shrink-0 font-semibold text-brand hover:underline pointer-coarse:min-h-10">
        Cancel
      </button>
    </div>
  ) : null;
  // What a row can do with the plan: every hotel can become the stay; while a stop is being
  // replaced, every place of its kind can take its place (unless the plan already has it).
  const actionFor = (place: ResolvedPlace, match: MatchResult): ReactNode => {
    if (kind === "hotel") {
      if (!plan.stayId) return null;
      if (place.id === plan.stayId) {
        return (
          <RowTag brand>
            <Bed className="h-3 w-3" aria-hidden="true" /> Your stay
          </RowTag>
        );
      }
      if (plan.missed.has(place.id)) return <RowTag>Not a fit</RowTag>;
      return (
        <RowAction filled={!!choosingHere} label={`Use ${place.name} as my stay`} onClick={() => plan.onUse(place, match, kind)}>
          Use as my stay
        </RowAction>
      );
    }
    if (!choosingHere) return null;
    if (plan.taken.has(place.id)) return <RowTag>In your plan</RowTag>;
    if (plan.missed.has(place.id)) return <RowTag>Not a fit</RowTag>;
    return (
      <RowAction filled label={`Use ${place.name} instead of ${choosingHere.name}`} onClick={() => plan.onUse(place, match, kind)}>
        Use this
      </RowAction>
    );
  };
  if (loading && !items.length) {
    return (
      <div>
        {banner}
        <SkeletonRows />
      </div>
    );
  }
  if (error && !items.length) {
    return (
      <div>
        {banner}
        <div className="rounded-[10px] border border-dashed border-border bg-white px-3 py-3 text-[13px] text-muted">
          Couldn&apos;t load recommendations.{" "}
          <button type="button" onClick={onRetry} className="font-semibold text-brand hover:underline">
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (!items.length) {
    return (
      <div>
        {banner}
        <div className="rounded-[10px] border border-dashed border-border bg-white px-3 py-3 text-[13px] text-muted" data-testid="reco-empty">
          No {KIND_LABEL[kind] ?? "places"} to choose from yet.{" "}
          <button type="button" onClick={onAsk} className="font-semibold text-brand hover:underline">
            Ask for recommendations
          </button>
        </div>
      </div>
    );
  }
  return (
    <div>
      {banner}
      <ul className="grid gap-2">
        {items.map(({ place, match }) => (
          <RecoRow key={place.id} place={place} match={match} kind={kind} selected={place.id === selectedId} onShow={() => onShow(place)} action={actionFor(place, match)} />
        ))}
      </ul>
    </div>
  );
}

function RowTag({ children, brand = false }: { children: ReactNode; brand?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", brand ? "bg-brand-soft text-brand" : "bg-surface text-muted")} data-testid="row-tag">
      {children}
    </span>
  );
}

function RowAction({ children, label, filled = false, onClick }: { children: ReactNode; label: string; filled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={clsx(
        "inline-flex h-8 items-center rounded-full px-3 text-[12px] font-semibold transition-colors pointer-coarse:h-10",
        filled ? "bg-brand text-white hover:bg-brand-hover" : "border border-brand bg-white text-brand hover:bg-brand-soft",
      )}
    >
      {children}
    </button>
  );
}

/**
 * One place to choose from: thumbnail, name, category and area, the reason it fits, and its score;
 * the row opens its details on the map. `action` (Use as my stay, Use this, Your stay) sits under it.
 */
function RecoRow({
  place,
  match,
  kind,
  selected,
  onShow,
  action,
}: {
  place: ResolvedPlace;
  match: MatchResult;
  kind: PlaceKind;
  selected: boolean;
  onShow: () => void;
  action?: ReactNode;
}) {
  const photo = place.photos?.[0];
  const reason = topReason(match);
  const area = place.locality?.split(",")[0]?.trim();
  const ref = useRef<HTMLLIElement>(null);
  // A place picked on the map brings its row into view.
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);
  return (
    <li
      ref={ref}
      className={clsx("rounded-[10px] border transition-colors", selected ? "border-brand bg-brand-soft/60" : "border-border bg-white")}
      data-testid="destination-reco-row"
      data-kind={kind}
      data-place-id={place.id}
      data-selected={selected || undefined}
    >
      <button
        type="button"
        onClick={onShow}
        aria-label={`Show ${place.name} on map`}
        aria-current={selected || undefined}
        className={clsx("flex w-full items-start gap-3 rounded-[10px] p-2.5 text-left transition-colors", !selected && "hover:bg-surface")}
      >
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
      {action ? <div className="-mt-1 flex items-center justify-end gap-2 px-2.5 pb-2.5">{action}</div> : null}
    </li>
  );
}
