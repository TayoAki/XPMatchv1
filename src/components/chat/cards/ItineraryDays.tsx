"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import clsx from "clsx";
import { closestCorners, DndContext, KeyboardSensor, PointerSensor, pointerWithin, useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeftRight, Bed, ChevronDown, ChevronRight, ChevronUp, GripVertical, MapPin } from "lucide-react";
import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { shortPlaceName } from "@/lib/places/names";
import { photoAtWidth } from "@/lib/places/destination-photo";
import { CUISINES, INTERESTS, STAY_TYPES, matchingOptions } from "@/lib/profile/options";
import { stopKey } from "@/lib/recs/itinerary-draft";
import type { DraftDay, DraftPick, DraftStop, ItineraryDraft } from "@/server/itineraries";
import { RecThumbs } from "@/components/recs/RecThumbs";
import { photoCreditTitle } from "@/components/ui/PhotoCredit";
import { Score, SwapOptions, SwappedTag, Thumb, type PlanSwapProps } from "./PlanParts";

/** The key a plan's place has on the conversation's map, so a pick here and a pin there are the same selection. */
export const planPinKey = (scope: string, placeId: string) => `reco:${scope}:${placeId}`;

/** The plan's color: the stop numbers in the list, and the day's pins and route on the map. */
export const PLAN_COLOR = "#064650";

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
const planTabId = (day: number) => `plan-tab:${day}`;

/** Pointer drags drop where the pointer is (a stop, a day's list or a day's tab); keyboard drags fall back to the nearest corners. */
const planCollision: CollisionDetection = (args) => {
  const under = pointerWithin(args);
  return under.length ? under : closestCorners(args);
};

/** A place's second line: what it is and why it is there ("Garden · Nature & hiking", "Lunch · Italian", "Luxury resort"). */
export function placeLine(place: ResolvedPlace, kind: PlaceKind, meal?: "lunch" | "dinner"): string {
  const text = [place.category, place.name, ...(place.types ?? [])].filter(Boolean).join(" ").toLowerCase();
  if (kind === "hotel") return matchingOptions(STAY_TYPES, `${text} ${place.summary ?? ""}`)[0]?.label ?? place.category ?? "Hotel";
  if (kind === "restaurant") {
    const cuisine = matchingOptions(CUISINES, text)[0]?.label ?? place.category?.replace(/\s*restaurant$/i, "");
    return [meal ? (meal === "lunch" ? "Lunch" : "Dinner") : null, cuisine].filter(Boolean).join(" · ");
  }
  const interest = matchingOptions(INTERESTS, text)[0]?.label;
  return [place.category, interest && interest.toLowerCase() !== place.category?.toLowerCase() ? interest : null].filter(Boolean).join(" · ");
}

/** A landscape photo for the plan's rows. */
function RowPhoto({ place, className }: { place: ResolvedPlace; className: string }) {
  const photo = place.photos?.[0];
  if (!photo) {
    return (
      <span className={clsx("flex shrink-0 items-center justify-center rounded-lg bg-surface text-neutral-500", className)}>
        <MapPin className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
  return <img src={photoAtWidth(photo, 240)} alt="" title={photoCreditTitle(place.photoCredits?.[0])} loading="lazy" className={clsx("shrink-0 rounded-lg object-cover", className)} />;
}

const detailsLink = (
  <>
    <span className="hidden shrink-0 items-center gap-0.5 text-[13px] font-semibold text-brand sm:inline-flex">
      Details &amp; reviews <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 sm:hidden" aria-hidden="true" />
  </>
);

/** A day's stop as it reads: its number, photo, time, name and what it is, and a way into its details and reviews. */
function ViewStop({ stop, n, selected, onOpen }: { stop: DraftStop; n: number; selected: boolean; onOpen: (place: ResolvedPlace, kind: PlaceKind) => void }) {
  const ref = useRef<HTMLLIElement>(null);
  // A place picked on the map brings its row into view.
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);
  const line = placeLine(stop.place, stop.kind, stop.meal);
  return (
    <li ref={ref} data-testid="itinerary-stop" data-kind={stop.kind} data-place-id={stop.place.id} data-selected={selected || undefined}>
      <button
        type="button"
        onClick={() => onOpen(stop.place, stop.kind)}
        aria-label={`Details for ${stop.place.name}`}
        className={clsx("flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors sm:gap-4 sm:px-4", selected ? "bg-brand-soft/60" : "hover:bg-surface/60")}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-white" aria-hidden="true">
          {n}
        </span>
        <RowPhoto place={stop.place} className="h-10 w-14 sm:h-11 sm:w-16" />
        <span className="hidden w-12 shrink-0 text-[14px] tabular-nums text-neutral-700 sm:block">{stop.startTime}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[15px] font-semibold leading-tight sm:text-[16px]" title={stop.place.name}>
              {shortPlaceName(stop.place.name)}
            </span>
            {stop.swappedFrom ? <SwappedTag /> : null}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-muted">
            <span className="tabular-nums sm:hidden">{stop.startTime}</span>
            {line ? <span className="sm:hidden"> · </span> : null}
            {line}
          </span>
        </span>
        {detailsLink}
      </button>
    </li>
  );
}

interface PlanItemProps {
  pick: DraftPick;
  kind: PlaceKind;
  badge?: string;
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
 * One place of the plan while it is being edited: its time, photo, name and why it fits, then what
 * the traveler can do with it: open its details (reviews, photos, booking links), swap it for one of
 * the ready alternates or any other place of its kind, say it is a good fit or not a fit (not a fit
 * swaps it out on the spot), and, for a day's stops, move it: by its handle, one step earlier or
 * later, or to another day.
 */
function PlanItem({ pick, kind, badge, time, meal, selected, destination, onOpen, swap, reorder }: PlanItemProps) {
  const [swapOpen, setSwapOpen] = useState(false);
  const ref = useRef<HTMLLIElement | null>(null);
  // The stay (no reorder) registers a disabled sortable, which takes no part in drags.
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: reorder?.dragId ?? `plan-fixed:${pick.place.id}`, disabled: !reorder });
  const meta = [meal ? (meal === "lunch" ? "Lunch" : "Dinner") : null, pick.place.category, pick.place.rating ? `★ ${pick.place.rating.toFixed(1)}` : null].filter(Boolean).join(" · ");
  const options = (pick.alternates ?? []).filter((a) => !swap.unavailable.has(a.place.id));
  const recent = swap.recentId === pick.place.id;
  const name = pick.place.name;
  // A place picked on the map, or just chosen from a list, brings its row into view.
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
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[12px] font-bold text-white" aria-hidden="true">
              {badge}
            </span>
            <button type="button" onClick={reorder.onLater} disabled={!reorder.onLater} aria-label={`Move ${name} later`} title="Later" className={step}>
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </span>
        ) : (
          <span className="mt-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-white" aria-hidden="true">
            <Bed className="h-3.5 w-3.5" />
          </span>
        )}
        {/* On a phone the name keeps the room; the name and Details open the place too. */}
        <button type="button" onClick={() => onOpen(pick.place, kind)} className="hidden shrink-0 sm:block" aria-label={`Show ${pick.place.name} on map`} tabIndex={-1}>
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

/** A day's list of stops while editing: sortable, and a place to drop a stop dragged from its day (it goes to the end). */
function DayStops({ day, children }: { day: DraftDay; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: planDayId(day.day) });
  return (
    <SortableContext id={planDayId(day.day)} items={day.stops.map((s) => planDragId(stopKey(s)))} strategy={verticalListSortingStrategy}>
      <ol ref={setNodeRef} className={clsx("grid min-h-[56px] grid-cols-[minmax(0,1fr)] gap-2 p-3 transition-colors", isOver && "bg-brand-soft/40")} data-testid="itinerary-day-stops">
        {children}
        {!day.stops.length ? <li className="rounded-2xl border border-dashed border-border px-4 py-3 text-[13px] text-muted">A free day. Move a stop here, or ask the concierge for ideas.</li> : null}
      </ol>
    </SortableContext>
  );
}

/** A day's tab; while editing, a stop dragged onto it moves to the end of that day. */
function DayTab({ day, selected, droppable, id, panelId, onSelect, onKeyDown }: { day: number; selected: boolean; droppable: boolean; id: string; panelId: string; onSelect: () => void; onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: planTabId(day), disabled: !droppable });
  return (
    <button
      ref={setNodeRef}
      id={id}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={panelId}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={clsx(
        "h-9 shrink-0 rounded-full border px-4 text-[14px] font-medium transition-colors sm:px-5",
        selected ? "border-brand bg-brand text-white" : "border-border bg-white text-foreground hover:bg-surface",
        isOver && !selected && "border-brand bg-brand-soft",
      )}
    >
      Day {day}
    </button>
  );
}

/**
 * The plan on the card: where they'll stay, a tab per day, and the day on show with its stops in
 * order, each with its time, photo and what it is, and a way into its details and reviews. While
 * editing, every place can be swapped or judged and the day's stops moved: dragged by their handle
 * (within the day, or onto another day's tab), one step earlier or later with the arrows, or to
 * another day with its picker. Times and numbers follow the new order. `replaceDay` takes the
 * day's place while a stop is being replaced from a full list.
 */
export function ItineraryDays({
  draft,
  scope,
  destination,
  selectedKey,
  day,
  onDay,
  editing,
  onOpen,
  swap,
  move,
  replaceDay,
}: {
  draft: ItineraryDraft;
  scope: string;
  destination: string;
  selectedKey: string | null;
  /** The day on show (its number). */
  day: number;
  onDay: (day: number) => void;
  editing: boolean;
  onOpen: (place: ResolvedPlace, kind: PlaceKind) => void;
  swap: PlanSwapProps;
  move: PlanMoveProps;
  replaceDay?: ReactNode;
}) {
  const ids = useId();
  // Pointer drags start after 6px so clicks on a stop still open it; the keyboard sensor (space, arrows, space) is the accessible path.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const shownIndex = Math.max(0, draft.days.findIndex((d) => d.day === day));
  const shownDay = draft.days[shownIndex];
  const picked = (id: string) => selectedKey === planPinKey(scope, id);
  const dayNumbers = draft.days.map((d) => d.day);
  const tabId = (n: number) => `${ids}-day-${n}`;
  const panelId = `${ids}-panel`;

  const reorderFor = (i: number, n: number, s: DraftStop): StopReorder => {
    const d = draft.days[i];
    const key = stopKey(s);
    const before = draft.days[i - 1];
    const after = draft.days[i + 1];
    // A stop moved to another day takes the tabs with it, so it stays in view.
    const moveTo = (to: number, index: number) => {
      move.onMove(key, to, index);
      if (to !== d.day) onDay(to);
    };
    return {
      dragId: planDragId(key),
      day: d.day,
      days: dayNumbers,
      // At a day's edge a step crosses into the day before (at its end) or after (at its start).
      onEarlier: n > 0 ? () => moveTo(d.day, n - 1) : before ? () => moveTo(before.day, before.stops.length) : undefined,
      onLater: n < d.stops.length - 1 ? () => moveTo(d.day, n + 1) : after ? () => moveTo(after.day, 0) : undefined,
      onDay: (to) => {
        if (to !== d.day) moveTo(to, draft.days.find((x) => x.day === to)?.stops.length ?? 0);
      },
    };
  };
  const dayOf = (key: string) => draft.days.find((d) => d.stops.some((s) => stopKey(s) === key));
  // Dropping on a stop takes its slot; dropping on a day's list or its tab puts it at the end of that day.
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const key = String(active.id).replace(/^plan-stop:/, "");
    const overId = String(over.id);
    const from = dayOf(key);
    if (!from) return;
    const fromIndex = from.stops.findIndex((s) => stopKey(s) === key);
    let to: DraftDay | undefined;
    let toIndex: number;
    const target = /^plan-(day|tab):(\d+)$/.exec(overId);
    if (target) {
      to = draft.days.find((d) => d.day === Number(target[2]));
      toIndex = to ? (to === from ? to.stops.length - 1 : to.stops.length) : 0;
    } else {
      const overKey = overId.replace(/^plan-stop:/, "");
      to = dayOf(overKey);
      toIndex = to ? to.stops.findIndex((s) => stopKey(s) === overKey) : 0;
    }
    if (!to || (to === from && toIndex === fromIndex)) return;
    move.onMove(key, to.day, toIndex);
    if (target?.[1] === "tab") onDay(to.day);
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = draft.days[(shownIndex + (e.key === "ArrowRight" ? 1 : draft.days.length - 1)) % draft.days.length];
    onDay(next.day);
    document.getElementById(tabId(next.day))?.focus();
  };

  const stay = draft.stay;
  return (
    <DndContext id={`plan-${scope}`} sensors={sensors} collisionDetection={planCollision} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4" data-testid="itinerary-plan">
        {stay ? (
          <section className="rounded-2xl border border-border bg-white px-3 pb-3 pt-2.5 sm:px-4" data-testid="itinerary-stay" aria-label="Where you'll stay">
            <h4 className="pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Where you&apos;ll stay</h4>
            <ul className="grid grid-cols-[minmax(0,1fr)]">
              {editing ? (
                <PlanItem pick={stay} kind="hotel" selected={picked(stay.place.id)} destination={destination} onOpen={onOpen} swap={swap} />
              ) : (
                <li data-testid="itinerary-stop" data-kind="hotel" data-place-id={stay.place.id} data-selected={picked(stay.place.id) || undefined}>
                  <button type="button" onClick={() => onOpen(stay.place, "hotel")} aria-label={`Details for ${stay.place.name}`} className="flex w-full items-center gap-3 rounded-xl text-left sm:gap-4">
                    <RowPhoto place={stay.place} className="h-14 w-20 sm:h-16 sm:w-28" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[16px] font-semibold leading-tight sm:text-[17px]" title={stay.place.name}>
                          {shortPlaceName(stay.place.name)}
                        </span>
                        {stay.swappedFrom ? <SwappedTag /> : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-muted sm:text-[14px]">{placeLine(stay.place, "hotel")}</span>
                    </span>
                    {detailsLink}
                  </button>
                </li>
              )}
            </ul>
          </section>
        ) : null}

        <div role="tablist" aria-label={`Days in ${destination}`} className="-mx-1 flex gap-2 overflow-x-auto px-1 py-0.5 xp-no-scrollbar" data-testid="day-tabs">
          {draft.days.map((d) => (
            <DayTab key={d.day} day={d.day} id={tabId(d.day)} panelId={panelId} selected={d.day === shownDay?.day} droppable={editing} onSelect={() => onDay(d.day)} onKeyDown={onTabKey} />
          ))}
        </div>

        {replaceDay ??
          (shownDay ? (
            <section id={panelId} role="tabpanel" aria-labelledby={tabId(shownDay.day)} className="overflow-hidden rounded-2xl border border-border bg-white" data-testid="itinerary-day" data-day={shownDay.day}>
              <header className="flex items-center gap-3 border-b border-border/70 bg-surface/40 px-4 py-3">
                <h4 className="min-w-0 flex-1 truncate font-serif text-[19px] leading-tight sm:text-[20px]">
                  Day {shownDay.day} · {shownDay.title}
                </h4>
                <span className="shrink-0 text-[13px] text-muted">
                  {shownDay.stops.length} {shownDay.stops.length === 1 ? "stop" : "stops"}
                </span>
              </header>
              {editing ? (
                <DayStops day={shownDay}>
                  {shownDay.stops.map((s, n) => (
                    // Keyed by the stop as built, so a moved stop keeps its row (and the focus on its arrows).
                    <PlanItem
                      key={stopKey(s)}
                      pick={s}
                      kind={s.kind}
                      badge={String(n + 1)}
                      time={s.startTime}
                      meal={s.meal}
                      selected={picked(s.place.id)}
                      destination={destination}
                      onOpen={onOpen}
                      swap={swap}
                      reorder={reorderFor(shownIndex, n, s)}
                    />
                  ))}
                </DayStops>
              ) : shownDay.stops.length ? (
                <ol className="divide-y divide-border/70">
                  {shownDay.stops.map((s, n) => (
                    <ViewStop key={stopKey(s)} stop={s} n={n + 1} selected={picked(s.place.id)} onOpen={onOpen} />
                  ))}
                </ol>
              ) : (
                <p className="px-4 py-4 text-[14px] text-muted">A free day. Click to edit to move a stop here, or ask the concierge for ideas.</p>
              )}
            </section>
          ) : null)}
      </div>
    </DndContext>
  );
}
