"use client";

import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ExternalLink, Plus, Route, Trash2 } from "lucide-react";
import type { ItineraryDay, ItineraryStop, TripItem } from "@/lib/types";
import type { PlaceKind } from "@/lib/places/types";
import { directionsUrl, stopPinKey, type DirectionsMode } from "@/lib/itinerary";
import { reservationTime } from "@/lib/reservations/types";
import { Button } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Field";
import { ReservationIcon } from "@/components/reservations/BookingMeta";
import { StopCard, type StopMove } from "./StopCard";
import { TravelLeg } from "./TravelLeg";
import { useDayLegs } from "./useDayLegs";
import { dayContainerId, isOverDay } from "./useItineraryDnd";

type AddKind = PlaceKind | "text";

const ADD_KINDS: { value: AddKind; label: string }[] = [
  { value: "attraction", label: "Thing to do" },
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Stay" },
  { value: "text", label: "Note only" },
];

export interface DayColumnProps {
  day: ItineraryDay;
  index: number;
  dayCount: number;
  dateLabel: string | null;
  color: string;
  canEdit: boolean;
  saving: boolean;
  /** Travel mode for legs and the Directions link. */
  mode: DirectionsMode;
  /** Bookings that start on this day (from confirmations), shown above the stops. */
  reservations: TripItem[];
  /** The trip's destination, passed to each stop's details. */
  destination?: string;
  hoveredKey: string | null | undefined;
  onHover?: (key: string | null) => void;
  onSelectPlace: (key: string) => void;
  onRename: (title: string) => void;
  /** Called when the theme input loses focus, so renames save once. */
  onRenameCommit: () => void;
  onAddStop: (title: string, kind?: PlaceKind) => void;
  onMoveStop: (stopId: string, to: StopMove) => void;
  /** One place up or down within the day (the phone's buttons instead of dragging). */
  onReorderStop?: (stopId: string, direction: -1 | 1) => void;
  onUpdateStop: (stopId: string, patch: Partial<Omit<ItineraryStop, "id">>) => void;
  onOptimize: () => void;
  onRemoveDay: () => void;
}

function AddStopForm({ dayNumber, onAdd }: { dayNumber: number; onAdd: (title: string, kind?: PlaceKind) => void }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<AddKind>("attraction");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onAdd(t, kind === "text" ? undefined : kind);
    setTitle("");
  };
  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-center gap-2">
      <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a stop (a place or a note)" aria-label={`Add a stop to day ${dayNumber}`} className="min-w-[160px] flex-1" />
      <Select value={kind} onChange={(e) => setKind(e.target.value as AddKind)} aria-label={`Kind of stop for day ${dayNumber}`} className="w-auto">
        {ADD_KINDS.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </Select>
      <Button size="sm" type="submit" disabled={!title.trim()} aria-label={`Add to day ${dayNumber}`}>
        <Plus className="h-4 w-4" /> Add
      </Button>
    </form>
  );
}

/** One day of the board: reservations that start on it, then a sortable, droppable list of stops with travel legs between placed stops. */
export function DayColumn({
  day,
  index,
  dayCount,
  dateLabel,
  color,
  canEdit,
  saving,
  mode,
  reservations,
  destination,
  hoveredKey,
  onHover,
  onSelectPlace,
  onRename,
  onRenameCommit,
  onAddStop,
  onMoveStop,
  onReorderStop,
  onUpdateStop,
  onOptimize,
  onRemoveDay,
}: DayColumnProps) {
  const { setNodeRef } = useDroppable({ id: dayContainerId(index), disabled: !canEdit });
  const { active, over } = useDndContext();
  // Highlight the day a card would drop into (unless it is just sorting inside its own day).
  const isOver = !!active && isOverDay(day, index, over?.id) && !day.stops.some((s) => s.id === String(active.id));
  const placed = day.stops.filter((s) => s.place);
  const legs = useDayLegs(day.stops, mode);
  const directions = directionsUrl(day.stops, mode);
  const rows: React.ReactNode[] = [];
  let placedIndex = -1;
  day.stops.forEach((stop, i) => {
    if (stop.place) {
      placedIndex += 1;
      if (placedIndex > 0 && legs[placedIndex - 1]) rows.push(<TravelLeg key={`leg-${stop.id}`} leg={legs[placedIndex - 1]} mode={mode} />);
    }
    rows.push(
      <StopCard
        key={stop.id}
        stop={stop}
        index={i}
        color={color}
        dayIndex={index}
        dayCount={dayCount}
        canEdit={canEdit}
        hovered={hoveredKey === stopPinKey(stop)}
        pending={saving}
        destination={destination}
        isFirst={i === 0}
        isLast={i === day.stops.length - 1}
        onHover={onHover}
        onSelectPlace={onSelectPlace}
        onMove={onMoveStop}
        onReorder={onReorderStop}
        onUpdate={onUpdateStop}
      />,
    );
  });
  const sortedReservations = [...reservations].sort((a, b) => (a.details?.startsAt ?? "").localeCompare(b.details?.startsAt ?? ""));

  return (
    <section className="rounded-3xl border border-border bg-surface/50 p-3" data-testid="day-column" aria-label={`Day ${index + 1}`}>
      <header className="flex flex-wrap items-center gap-2">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
        <h3 className="text-[15px] font-semibold">Day {index + 1}</h3>
        {dateLabel ? <span className="text-[13px] text-muted">{dateLabel}</span> : null}
        {canEdit ? (
          <input
            value={day.title}
            onChange={(e) => onRename(e.target.value)}
            onBlur={onRenameCommit}
            aria-label={`Day ${index + 1} theme`}
            placeholder="Theme of the day"
            className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 text-[14px] text-neutral-700 outline-none placeholder:text-neutral-400 focus:bg-white focus:ring-1 focus:ring-brand"
          />
        ) : (
          <span className="flex-1 truncate text-[14px] text-neutral-700">{day.title}</span>
        )}
        <span className="text-[12px] text-muted">{day.stops.length ? `${day.stops.length} stop${day.stops.length === 1 ? "" : "s"}` : ""}</span>
      </header>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {canEdit && placed.length >= 3 ? (
          <Button size="sm" variant="ghost" onClick={onOptimize} title="Reorder by nearest neighbor from the first stop">
            <Route className="h-4 w-4" /> Optimize order
          </Button>
        ) : null}
        {directions ? (
          <a href={directions} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-neutral-700 hover:bg-surface">
            <ExternalLink className="h-4 w-4" /> Directions
          </a>
        ) : null}
        {canEdit ? (
          <Button size="sm" variant="ghost" onClick={onRemoveDay} aria-label={`Remove day ${index + 1}`} className="ml-auto text-neutral-500 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {sortedReservations.length ? (
        <ul className="mt-2 grid gap-1" data-testid="day-reservations" aria-label={`Reservations on day ${index + 1}`}>
          {sortedReservations.map((item) => (
            <li key={item.id} className="flex items-center gap-2 rounded-xl border border-border/60 bg-white/80 px-3 py-1.5 text-[13px]">
              <ReservationIcon kind={item.details?.kind ?? "other"} className="h-3.5 w-3.5 shrink-0 text-neutral-600" />
              {reservationTime(item.details?.startsAt) ? <span className="font-medium">{reservationTime(item.details?.startsAt)}</span> : null}
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              {item.details?.confirmationCode ? <span className="font-mono text-[11px] text-muted">{item.details.confirmationCode}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <SortableContext items={day.stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          className={clsx("mt-2 grid grid-cols-[minmax(0,1fr)] min-h-[56px] gap-2 rounded-2xl transition-colors", isOver && "bg-blue-50 ring-2 ring-blue-200")}
          aria-label={`Day ${index + 1} stops`}
        >
          {rows}
          {day.stops.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-border px-4 py-4 text-center text-[13px] text-muted">
              {canEdit ? "Move a stop or an idea here, or add one below." : "Nothing planned yet."}
            </li>
          ) : null}
        </ul>
      </SortableContext>
      {canEdit ? <AddStopForm dayNumber={index + 1} onAdd={onAddStop} /> : null}
    </section>
  );
}
