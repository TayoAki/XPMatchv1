"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowLeftRight, Bed, ChevronRight, Map as MapIcon } from "lucide-react";
import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { shortPlaceName } from "@/lib/places/names";
import { dayColor } from "@/lib/itinerary";
import type { DraftDay, DraftPick, ItineraryDraft } from "@/server/itineraries";
import { GoogleMap, type MapPin as Pin, type MapRoute } from "@/components/map/GoogleMap";
import { RecThumbs } from "@/components/recs/RecThumbs";
import { Score, SwapOptions, SwappedTag, Thumb, type PlanSwapProps } from "./PlanParts";

/** The key a plan's place has on the conversation's map, so a pick here and a pin there are the same selection. */
export const planPinKey = (scope: string, placeId: string) => `reco:${scope}:${placeId}`;

/**
 * One place of the plan: its time, photo, name and why it fits, then what the traveler can do with
 * it: open its details (reviews, photos, booking links), swap it for one of the ready alternates or
 * any other place of its kind, or say it is a good fit or not a fit (not a fit swaps it out on the
 * spot).
 */
function PlanItem({
  pick,
  kind,
  badge,
  color,
  time,
  meal,
  selected,
  destination,
  onOpen,
  swap,
}: {
  pick: DraftPick;
  kind: PlaceKind;
  badge?: string;
  color?: string;
  time?: string;
  meal?: "lunch" | "dinner";
  selected: boolean;
  destination: string;
  onOpen: (place: ResolvedPlace, kind: PlaceKind) => void;
  swap: PlanSwapProps;
}) {
  const [swapOpen, setSwapOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  const meta = [meal ? (meal === "lunch" ? "Lunch" : "Dinner") : null, pick.place.category, pick.place.rating ? `★ ${pick.place.rating.toFixed(1)}` : null].filter(Boolean).join(" · ");
  const options = (pick.alternates ?? []).filter((a) => !swap.unavailable.has(a.place.id));
  const recent = swap.recentId === pick.place.id;
  // A place picked on a day's map, or just chosen from a list, brings its row into view.
  useEffect(() => {
    if (selected || recent) ref.current?.scrollIntoView({ block: recent ? "center" : "nearest", behavior: "smooth" });
  }, [selected, recent]);
  return (
    <li
      ref={ref}
      className={clsx("rounded-2xl border transition-colors", selected ? "border-brand bg-brand-soft/50" : recent ? "border-emerald-300 bg-emerald-50/40" : "border-border bg-white")}
      data-testid="itinerary-stop"
      data-kind={kind}
      data-place-id={pick.place.id}
      data-selected={selected || undefined}
      data-recent={recent || undefined}
    >
      <div className="flex items-start gap-3 p-3">
        {badge ? (
          <span className="mt-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: color }} aria-hidden="true">
            {badge}
          </span>
        ) : (
          <span className="mt-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-white" aria-hidden="true">
            <Bed className="h-3.5 w-3.5" />
          </span>
        )}
        <button type="button" onClick={() => onOpen(pick.place, kind)} className="shrink-0" aria-label={`Show ${pick.place.name} on map`} tabIndex={-1}>
          <Thumb place={pick.place} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button type="button" onClick={() => onOpen(pick.place, kind)} className="min-w-0 text-left" aria-label={`Details for ${pick.place.name}`}>
              <span className="flex items-baseline gap-2">
                {time ? <span className="shrink-0 text-[13px] font-semibold tabular-nums text-neutral-600">{time}</span> : null}
                <span className="truncate text-[15px] font-semibold leading-tight hover:underline" title={pick.place.name}>
                  {shortPlaceName(pick.place.name)}
                </span>
                {pick.swappedFrom ? <SwappedTag /> : null}
              </span>
              {meta ? <span className="mt-0.5 block truncate text-[12px] text-muted">{meta}</span> : null}
              {pick.why ? <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-neutral-700">{pick.why}</span> : null}
            </button>
            <Score pick={pick} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSwapOpen((v) => !v)}
              aria-expanded={swapOpen}
              aria-label={`Swap ${pick.place.name}`}
              className={clsx(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors pointer-coarse:h-10",
                swapOpen ? "border-brand bg-brand text-white" : "border-border bg-white text-foreground hover:bg-surface",
              )}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" /> Swap
            </button>
            <RecThumbs name={pick.place.name} kind={kind} place={pick.place} destination={destination} context="chat" match={pick.match} size="sm" />
            <button type="button" onClick={() => onOpen(pick.place, kind)} className="ml-auto inline-flex items-center gap-0.5 text-[12px] font-semibold text-brand hover:underline">
              Details &amp; reviews <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      {swapOpen ? (
        <SwapOptions
          pick={pick}
          kind={kind}
          options={options}
          onSwap={(to) => {
            setSwapOpen(false);
            swap.onSwap(pick, to);
          }}
          onSeeAll={() => {
            setSwapOpen(false);
            swap.onSeeAll(pick, kind);
          }}
        />
      ) : null}
    </li>
  );
}

/** A day's own map: the stay, the day's stops numbered in order and the walk between them. */
function DayMap({ day, index, stay, scope, selectedKey, onPick }: { day: DraftDay; index: number; stay: DraftPick | null; scope: string; selectedKey: string | null; onPick: (key: string) => void }) {
  const color = dayColor(index);
  const { pins, routes } = useMemo(() => {
    const pins: Pin[] = [];
    if (stay) pins.push({ ...stay.place, key: planPinKey(scope, stay.place.id), group: "Where you'll stay" });
    day.stops.forEach((s, i) => pins.push({ ...s.place, key: planPinKey(scope, s.place.id), badge: String(i + 1), color, group: `Day ${day.day}` }));
    const path = [...(stay ? [stay.place] : []), ...day.stops.map((s) => s.place)].map((p) => ({ lat: p.lat, lng: p.lng }));
    const routes: MapRoute[] = path.length >= 2 ? [{ key: `day:${day.day}`, color, path }] : [];
    return { pins, routes };
  }, [day, stay, scope, color]);
  return (
    <div className="relative h-[260px] border-y border-border/70" data-testid="day-map">
      <GoogleMap pins={pins} routes={routes} selectedKey={selectedKey} onSelect={onPick} className="relative h-full w-full overflow-hidden bg-[#e9e6df]" />
    </div>
  );
}

/**
 * The plan as a workspace: where they'll stay, then a card per day. A day's card opens its own map
 * (one at a time, the first to begin with) above its stops, numbered like the pins; every place
 * can be opened, swapped or judged.
 */
export function ItineraryWorkspace({
  draft,
  loading,
  error,
  scope,
  destination,
  selectedKey,
  onRetry,
  onAsk,
  onOpen,
  swap,
}: {
  draft: ItineraryDraft | null;
  loading: boolean;
  error: string | null;
  scope: string;
  destination: string;
  selectedKey: string | null;
  onRetry: () => void;
  onAsk: () => void;
  onOpen: (place: ResolvedPlace, kind: PlaceKind) => void;
  swap: PlanSwapProps;
}) {
  const [openDay, setOpenDay] = useState<number | null>(1);
  if (!draft && loading) {
    return (
      <div className="grid gap-3" aria-busy="true" aria-label="Building your itinerary">
        {[0, 1, 2].map((i) => (
          <div key={i} className="xp-skeleton h-[120px] rounded-2xl" />
        ))}
      </div>
    );
  }
  if (!draft && error) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white px-4 py-4 text-[14px] text-muted">
        Couldn&apos;t build the itinerary.{" "}
        <button type="button" onClick={onRetry} className="font-semibold text-brand hover:underline">
          Retry
        </button>
      </div>
    );
  }
  if (!draft || !draft.days.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white px-4 py-4 text-[14px] text-muted" data-testid="itinerary-empty">
        Not enough places here yet to plan the days.{" "}
        <button type="button" onClick={onAsk} className="font-semibold text-brand hover:underline">
          Ask the concierge
        </button>
      </div>
    );
  }
  const picked = (id: string) => selectedKey === planPinKey(scope, id);
  const pinned = (key: string) => {
    const all = [...(draft.stay ? [{ pick: draft.stay, kind: "hotel" as PlaceKind }] : []), ...draft.days.flatMap((d) => d.stops.map((s) => ({ pick: s as DraftPick, kind: s.kind as PlaceKind })))];
    const hit = all.find((p) => planPinKey(scope, p.pick.place.id) === key);
    if (hit) onOpen(hit.pick.place, hit.kind);
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4" data-testid="itinerary-plan">
      {draft.stay ? (
        <section className="rounded-2xl border border-border bg-surface/40 p-3" data-testid="itinerary-stay" aria-label="Where you'll stay">
          <h4 className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Where you&apos;ll stay</h4>
          <ul className="grid grid-cols-[minmax(0,1fr)]">
            <PlanItem pick={draft.stay} kind="hotel" selected={picked(draft.stay.place.id)} destination={destination} onOpen={onOpen} swap={swap} />
          </ul>
        </section>
      ) : null}
      {draft.days.map((d, i) => {
        const mapOpen = openDay === d.day;
        return (
          <section key={d.day} className="overflow-hidden rounded-2xl border border-border bg-white" data-testid="itinerary-day" aria-label={`Day ${d.day}`}>
            <header className="flex items-center gap-3 px-4 py-3">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: dayColor(i) }} aria-hidden="true" />
              <h4 className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                <span className="text-brand">Day {d.day}</span> · {d.title}
              </h4>
              <span className="hidden shrink-0 text-[12px] text-muted sm:inline">{d.stops.length} stops</span>
              <button
                type="button"
                onClick={() => setOpenDay(mapOpen ? null : d.day)}
                aria-expanded={mapOpen}
                aria-label={`${mapOpen ? "Hide" : "Show"} the map of day ${d.day}`}
                className={clsx(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors pointer-coarse:h-10",
                  mapOpen ? "border-brand bg-brand-soft text-brand" : "border-border bg-white hover:bg-surface",
                )}
              >
                <MapIcon className="h-3.5 w-3.5" aria-hidden="true" /> {mapOpen ? "Hide map" : "Map"}
              </button>
            </header>
            {mapOpen ? <DayMap day={d} index={i} stay={draft.stay} scope={scope} selectedKey={selectedKey} onPick={pinned} /> : null}
            <ol className="grid grid-cols-[minmax(0,1fr)] gap-2 p-3">
              {d.stops.map((s, n) => (
                <PlanItem
                  key={`${s.place.id}-${s.startTime}`}
                  pick={s}
                  kind={s.kind}
                  badge={String(n + 1)}
                  color={dayColor(i)}
                  time={s.startTime}
                  meal={s.meal}
                  selected={picked(s.place.id)}
                  destination={destination}
                  onOpen={onOpen}
                  swap={swap}
                />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
