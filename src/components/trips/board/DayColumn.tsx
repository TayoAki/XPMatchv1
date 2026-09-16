"use client";

import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ExternalLink, Plus, Route, Trash2 } from "lucide-react";
import type { ItineraryDay, ItineraryStop } from "@/lib/types";
import type { PlaceKind } from "@/lib/places/types";
import { directionsUrl, stopPinKey } from "@/lib/itinerary";
import { Button } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Field";
import { StopCard, type StopMove } from "./StopCard";
import { TravelLeg } from "./TravelLeg";
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
  hoveredKey: string | null | undefined;
  onHover?: (key: string | null) => void;
  onSelectPlace: (key: string) => void;
  onRename: (title: string) => void;
  /** Called when the theme input loses focus, so renames save once. */
  onRenameCommit: () => void;
  onAddStop: (title: string, kind?: PlaceKind) => void;
  onMoveStop: (stopId: string, to: StopMove) => void;
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

/** One day of the board: a sortable, droppable list of stops with travel legs between placed stops. */
export function DayColumn({
  day,
  index,
  dayCount,
  dateLabel,
  color,
  canEdit,
  saving,
  hoveredKey,
  onHover,
  onSelectPlace,
  onRename,
  onRenameCommit,
  onAddStop,
  onMoveStop,
  onUpdateStop,
  onOptimize,
  onRemoveDay,
}: DayColumnProps) {
  const { setNodeRef } = useDroppable({ id: dayContainerId(index), disabled: !canEdit });
  const { active, over } = useDndContext();
  // Highlight the day a card would drop into (unless it is just sorting inside its own day).
  const isOver = !!active && isOverDay(day, index, over?.id) && !day.stops.some((s) => s.id === String(active.id));
  const placed = day.stops.filter((s) => s.place);
  const directions = directionsUrl(day.stops);
  const rows: React.ReactNode[] = [];
  let previousPlaced: ItineraryStop | null = null;
  day.stops.forEach((stop, i) => {
    if (stop.place && previousPlaced) rows.push(<TravelLeg key={`leg-${previousPlaced.id}-${stop.id}`} from={previousPlaced} to={stop} />);
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
        onHover={onHover}
        onSelectPlace={onSelectPlace}
        onMove={onMoveStop}
        onUpdate={onUpdateStop}
      />,
    );
    if (stop.place) previousPlaced = stop;
  });

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
            className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 text-[14px] text-neutral-700 outline-none placeholder:text-neutral-400 focus:bg-white focus:ring-1 focus:ring-neutral-900"
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
      <SortableContext items={day.stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          className={clsx("mt-2 grid min-h-[56px] gap-2 rounded-2xl transition-colors", isOver && "bg-blue-50 ring-2 ring-blue-200")}
          aria-label={`Day ${index + 1} stops`}
        >
          {rows}
          {day.stops.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-border px-4 py-4 text-center text-[13px] text-muted">
              {canEdit ? "Drag a stop or an idea here, or add one below." : "Nothing planned yet."}
            </li>
          ) : null}
        </ul>
      </SortableContext>
      {canEdit ? <AddStopForm dayNumber={index + 1} onAdd={onAddStop} /> : null}
    </section>
  );
}
