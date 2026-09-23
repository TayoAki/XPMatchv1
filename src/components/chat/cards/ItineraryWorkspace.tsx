"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { closestCorners, DndContext, KeyboardSensor, PointerSensor, pointerWithin, useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeftRight, Bed, ChevronDown, ChevronRight, ChevronUp, GripVertical, Map as MapIcon } from "lucide-react";
import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { shortPlaceName } from "@/lib/places/names";
import { dayColor } from "@/lib/itinerary";
import { stopKey } from "@/lib/recs/itinerary-draft";
import type { DraftDay, DraftPick, DraftStop, ItineraryDraft } from "@/server/itineraries";
import { GoogleMap, type MapPin as Pin, type MapRoute } from "@/components/map/GoogleMap";
import { RecThumbs } from "@/components/recs/RecThumbs";
import { Score, SwapOptions, SwappedTag, Thumb, type PlanSwapProps } from "./PlanParts";

/** The key a plan's place has on the conversation's map, so a pick here and a pin there are the same selection. */
export const planPinKey = (scope: string, placeId: string) => `reco:${scope}:${placeId}`;

/** Moving the plan's stops: a stop (by its id as built, `stopKey`) goes to a day (by number) at a position in its list. */
export interface PlanMoveProps {
  onMove: (key: string, toDay: number, toIndex: number) => void;
}

/** What one stop can do to move: earlier or later by one (across into the next day at a day's end), to another day, or dragged. */
interface StopReorder {
  dragId: string;
  day: number;
  days: number[];
  onEarlier?: () => void;
  onLater?: () => void;
  onDay: (day: number) => void;
}

const planDragId = (key: string) => `plan-stop:${key}`;
const planDayId = (day: number) => `plan-day:${day}`;

/** Pointer drags drop where the pointer is (a stop or a day's list); keyboard drags fall back to the nearest corners. */
const planCollision: CollisionDetection = (args) => {
  const under = pointerWithin(args);
  return under.length ? under : closestCorners(args);
};

interface PlanItemProps {
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
  /** Set on a day's stops: moving it earlier, later or to another day, or by dragging its handle. */
  reorder?: StopReorder;
}

/**
 * One place of the plan: its time, photo, name and why it fits, then what the traveler can do with
 * it: open its details (reviews, photos, booking links), swap it for one of the ready alternates or
 * any other place of its kind, say it is a good fit or not a fit (not a fit swaps it out on the
 * spot), and, for a day's stops, move it: by its handle, one step earlier or later, or to another
 * day.
 */
function PlanItem({ pick, kind, badge, color, time, meal, selected, destination, onOpen, swap, reorder }: PlanItemProps) {
  const [swapOpen, setSwapOpen] = useState(false);
  const ref = useRef<HTMLLIElement | null>(null);
  // The stay (no reorder) registers a disabled sortable, which takes no part in drags.
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: reorder?.dragId ?? `plan-fixed:${pick.place.id}`, disabled: !reorder });
  const meta = [meal ? (meal === "lunch" ? "Lunch" : "Dinner") : null, pick.place.category, pick.place.rating ? `★ ${pick.place.rating.toFixed(1)}` : null].filter(Boolean).join(" · ");
  const options = (pick.alternates ?? []).filter((a) => !swap.unavailable.has(a.place.id));
  const recent = swap.recentId === pick.place.id;
  const name = pick.place.name;
  // A place picked on a day's map, or just chosen from a list, brings its row into view.
  useEffect(() => {
    if (selected || recent) ref.current?.scrollIntoView({ block: recent ? "center" : "nearest", behavior: "smooth" });
  }, [selected, recent]);
  const step = "flex h-5 w-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-surface hover:text-foreground disabled:pointer-events-none disabled:opacity-25";
  return (
    <li
      ref={(el) => {
        ref.current = el;
        setNodeRef(el);
      }}
      style={reorder ? { transform: CSS.Transform.toString(transform), transition } : undefined}
      className={clsx(
        "rounded-2xl border transition-colors",
        selected ? "border-brand bg-brand-soft/50" : recent ? "border-emerald-300 bg-emerald-50/40" : "border-border bg-white",
        isDragging && "relative z-10 opacity-80 shadow-lg",
      )}
      data-testid="itinerary-stop"
      data-kind={kind}
      data-place-id={pick.place.id}
      data-selected={selected || undefined}
      data-recent={recent || undefined}
    >
      <div className="flex items-start gap-3 p-3">
        {reorder ? (
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag ${name}`}
            title="Drag to move"
            className="-ml-1 mt-4 h-6 shrink-0 cursor-grab touch-none rounded-md text-neutral-400 hover:bg-surface hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
        {reorder ? (
          <span className="flex shrink-0 flex-col items-center">
            <button type="button" onClick={reorder.onEarlier} disabled={!reorder.onEarlier} aria-label={`Move ${name} earlier`} title="Earlier" className={step}>
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: color }} aria-hidden="true">
              {badge}
            </span>
            <button type="button" onClick={reorder.onLater} disabled={!reorder.onLater} aria-label={`Move ${name} later`} title="Later" className={step}>
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </span>
        ) : badge ? (
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
            {reorder && reorder.days.length > 1 ? (
              <select
                value={reorder.day}
                onChange={(e) => reorder.onDay(Number(e.target.value))}
                aria-label={`Day for ${name}`}
                className="h-8 rounded-full border border-border bg-white px-2.5 text-[12px] font-semibold text-foreground hover:bg-surface pointer-coarse:h-10"
              >
                {reorder.days.map((day) => (
                  <option key={day} value={day}>
                    Day {day}
                  </option>
                ))}
              </select>
            ) : null}
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

/** A day's list of stops: sortable, and a place to drop a stop dragged from another day (it goes to the end). */
function DayStops({ day, children, movable }: { day: DraftDay; children: ReactNode; movable: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: planDayId(day.day), disabled: !movable });
  return (
    <SortableContext id={planDayId(day.day)} items={day.stops.map((s) => planDragId(stopKey(s)))} strategy={verticalListSortingStrategy} disabled={!movable}>
      <ol ref={setNodeRef} className={clsx("grid min-h-[56px] grid-cols-[minmax(0,1fr)] gap-2 p-3 transition-colors", isOver && "bg-brand-soft/40")} data-testid="itinerary-day-stops">
        {children}
        {!day.stops.length ? <li className="rounded-2xl border border-dashed border-border px-4 py-3 text-[13px] text-muted">A free day. Move a stop here, or ask the concierge for ideas.</li> : null}
      </ol>
    </SortableContext>
  );
}

/**
 * The plan as a workspace: where they'll stay, then a card per day. A day's card opens its own map
 * (one at a time, the first to begin with) above its stops, numbered like the pins; every place
 * can be opened, swapped or judged, and a day's stops can be moved: dragged by their handle (within
 * the day or onto another), one step earlier or later with the arrows, or to another day. Times,
 * numbers, the day's map and its title follow the new order.
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
  move,
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
  move?: PlanMoveProps;
}) {
  const [openDay, setOpenDay] = useState<number | null>(1);
  // Pointer drags start after 6px so clicks on a stop still open it; the keyboard sensor (space, arrows, space) is the accessible path.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
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
  const dayNumbers = draft.days.map((d) => d.day);
  const reorderFor = (i: number, n: number, s: DraftStop): StopReorder | undefined => {
    if (!move) return undefined;
    const d = draft.days[i];
    const key = stopKey(s);
    const before = draft.days[i - 1];
    const after = draft.days[i + 1];
    return {
      dragId: planDragId(key),
      day: d.day,
      days: dayNumbers,
      // At a day's edge a step crosses into the day before (at its end) or after (at its start).
      onEarlier: n > 0 ? () => move.onMove(key, d.day, n - 1) : before ? () => move.onMove(key, before.day, before.stops.length) : undefined,
      onLater: n < d.stops.length - 1 ? () => move.onMove(key, d.day, n + 1) : after ? () => move.onMove(key, after.day, 0) : undefined,
      onDay: (day) => {
        if (day !== d.day) move.onMove(key, day, draft.days.find((x) => x.day === day)?.stops.length ?? 0);
      },
    };
  };
  const dayOf = (key: string) => draft.days.find((d) => d.stops.some((s) => stopKey(s) === key));
  // Dropping on a stop takes its slot; dropping on a day's list puts it at the end.
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!move || !over) return;
    const key = String(active.id).replace(/^plan-stop:/, "");
    const overId = String(over.id);
    const from = dayOf(key);
    if (!from) return;
    const fromIndex = from.stops.findIndex((s) => stopKey(s) === key);
    let to: DraftDay | undefined;
    let toIndex: number;
    if (overId.startsWith("plan-day:")) {
      to = draft.days.find((d) => d.day === Number(overId.slice("plan-day:".length)));
      toIndex = to ? (to === from ? to.stops.length - 1 : to.stops.length) : 0;
    } else {
      const overKey = overId.replace(/^plan-stop:/, "");
      to = dayOf(overKey);
      toIndex = to ? to.stops.findIndex((s) => stopKey(s) === overKey) : 0;
    }
    if (!to || (to === from && toIndex === fromIndex)) return;
    move.onMove(key, to.day, toIndex);
  };
  return (
    <DndContext id={`plan-${scope}`} sensors={sensors} collisionDetection={planCollision} onDragEnd={onDragEnd}>
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
            <DayStops day={d} movable={!!move}>
              {d.stops.map((s, n) => {
                const item: PlanItemProps = {
                  pick: s,
                  kind: s.kind,
                  badge: String(n + 1),
                  color: dayColor(i),
                  time: s.startTime,
                  meal: s.meal,
                  selected: picked(s.place.id),
                  destination,
                  onOpen,
                  swap,
                };
                // Keyed by the stop as built, so a moved stop keeps its row (and the focus on its arrows).
                return <PlanItem key={stopKey(s)} {...item} reorder={reorderFor(i, n, s)} />;
              })}
            </DayStops>
          </section>
        );
      })}
    </div>
    </DndContext>
  );
}
