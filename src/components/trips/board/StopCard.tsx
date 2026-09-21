"use client";

import { useState } from "react";
import clsx from "clsx";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Bed, ChevronDown, Clock, GripVertical, Landmark, MapPin, Pencil, Star, StickyNote, Utensils } from "lucide-react";
import type { ItineraryStop } from "@/lib/types";
import { stopPinKey } from "@/lib/itinerary";
import { useMediaQuery } from "@/lib/use-media-query";
import { Button } from "@/components/ui/Button";
import { TextArea, TextInput } from "@/components/ui/Field";
import { ReactionControl } from "@/components/feedback/ReactionControl";
import { photoCreditTitle } from "@/components/ui/PhotoCredit";
import { StopDetails } from "./StopDetails";

export type StopMove = `day:${number}` | "ideas" | "remove";

export interface StopCardProps {
  stop: ItineraryStop;
  index: number;
  color: string;
  dayIndex: number;
  dayCount: number;
  canEdit: boolean;
  hovered: boolean;
  /** True while the itinerary is being saved (new places are looked up during the save). */
  pending: boolean;
  /** The trip's destination, for links and the assistant's questions. */
  destination?: string;
  /** Position within the day, for the phone's up / down buttons. */
  isFirst?: boolean;
  isLast?: boolean;
  onHover?: (key: string | null) => void;
  onSelectPlace: (key: string) => void;
  onMove: (stopId: string, to: StopMove) => void;
  /** Moves the stop one place up (-1) or down (1) within its day (phones, instead of dragging). */
  onReorder?: (stopId: string, direction: -1 | 1) => void;
  onUpdate: (stopId: string, patch: Partial<Omit<ItineraryStop, "id">>) => void;
}

function KindIcon({ stop }: { stop: ItineraryStop }) {
  const kind = stop.place?.kind ?? stop.kind;
  const Icon = kind === "hotel" ? Bed : kind === "restaurant" ? Utensils : kind === "attraction" ? Landmark : StickyNote;
  return <Icon className="h-5 w-5" />;
}

function StopThumb({ stop }: { stop: ItineraryStop }) {
  const [failed, setFailed] = useState(false);
  const photo = stop.place?.photos?.[0];
  if (photo && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
    return <img src={photo} alt="" title={photoCreditTitle(stop.place?.photoCredits?.[0])} onError={() => setFailed(true)} className="h-14 w-14 shrink-0 rounded-xl object-cover" loading="lazy" />;
  }
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface text-neutral-500">
      <KindIcon stop={stop} />
    </span>
  );
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * One numbered stop of a day: sortable by its handle, editable inline, with a Move menu that
 * needs no dragging. Phones drop the handle and reorder with up / down buttons instead.
 */
export function StopCard({ stop, index, color, dayIndex, dayCount, canEdit, hovered, pending, destination, isFirst, isLast, onHover, onSelectPlace, onMove, onReorder, onUpdate }: StopCardProps) {
  const phone = !useMediaQuery("(min-width: 640px)");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id, disabled: !canEdit || phone });
  const [editing, setEditing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [draft, setDraft] = useState({ startTime: stop.startTime ?? "", durationMin: stop.durationMin ? String(stop.durationMin) : "", note: stop.note });
  const key = stopPinKey(stop);
  const place = stop.place;
  const meta = [place?.category, place?.locality].filter(Boolean).join(" · ");

  const startEditing = () => {
    setDraft({ startTime: stop.startTime ?? "", durationMin: stop.durationMin ? String(stop.durationMin) : "", note: stop.note });
    setEditing(true);
  };

  const applyEdit = () => {
    const duration = Number(draft.durationMin);
    onUpdate(stop.id, {
      startTime: /^\d{2}:\d{2}$/.test(draft.startTime) ? draft.startTime : undefined,
      durationMin: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : undefined,
      note: draft.note.trim(),
    });
    setEditing(false);
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid="stop-card"
      data-stop-id={stop.id}
      onMouseEnter={() => onHover?.(key)}
      onMouseLeave={() => onHover?.(null)}
      onClick={(e) => {
        // A click anywhere on the card shows the stop on the map; its own controls, links and fields keep their jobs.
        if (!place || editing) return;
        const target = e.target as HTMLElement;
        if (target.closest("button, a, input, textarea, select, label, [data-testid='stop-details']")) return;
        onSelectPlace(key);
      }}
      className={clsx(
        "relative flex gap-2 rounded-2xl border bg-white p-3 transition-colors",
        hovered ? "border-brand" : "border-border",
        isDragging && "z-10 opacity-70 shadow-lg",
        place && !editing && "cursor-pointer",
      )}
    >
      {canEdit && !phone ? (
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${stop.title}`}
          className="-ml-1 mt-4 h-6 shrink-0 cursor-grab touch-none rounded-md text-neutral-400 hover:bg-surface hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : null}
      <span className="mt-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: color }} aria-hidden="true">
        {index + 1}
      </span>
      <StopThumb stop={stop} />
      <div className="min-w-0 flex-1">
        {/* Wraps on phones: the actions drop under the title instead of widening the whole board. */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1 basis-[150px]">
            {place ? (
              <button type="button" onClick={() => onSelectPlace(key)} className="block max-w-full truncate text-left text-[15px] font-semibold hover:underline">
                {stop.title}
              </button>
            ) : (
              <div className="truncate text-[15px] font-semibold">{stop.title}</div>
            )}
            <div className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
              {stop.startTime ? (
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Clock className="h-3.5 w-3.5" /> {stop.startTime}
                  {stop.durationMin ? ` · ${formatDuration(stop.durationMin)}` : ""}
                </span>
              ) : stop.durationMin ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {formatDuration(stop.durationMin)}
                </span>
              ) : null}
              {place?.rating ? (
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Star className="h-3.5 w-3.5 fill-current" /> {place.rating.toFixed(1)}
                </span>
              ) : null}
              {meta ? <span className="min-w-0 truncate">{meta}</span> : null}
              {!place && stop.kind ? <span className="italic">{pending ? "Finding it on the map…" : "Not found on the map"}</span> : null}
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-0.5">
            {place ? <ReactionControl name={stop.title} kind={place.kind} place={place} source="trip" size="sm" className="mr-1" /> : null}
            {place ? (
              <button
                type="button"
                aria-label={`Details for ${stop.title}`}
                aria-expanded={detailsOpen}
                title="Photos, hours, links and match"
                onClick={() => setDetailsOpen((v) => !v)}
                className={clsx("rounded-full p-1.5 text-neutral-500 hover:bg-surface hover:text-foreground pointer-coarse:p-2.5", detailsOpen && "bg-surface text-foreground")}
              >
                <ChevronDown className={clsx("h-4 w-4 transition-transform", detailsOpen && "rotate-180")} />
              </button>
            ) : null}
            {place ? (
              <button type="button" aria-label={`Show ${stop.title} on the map`} title="Show on the map" onClick={() => onSelectPlace(key)} className="rounded-full p-1.5 text-neutral-500 hover:bg-surface hover:text-foreground pointer-coarse:p-2.5">
                <MapPin className="h-4 w-4" />
              </button>
            ) : null}
            {canEdit ? (
              <button type="button" aria-label={`Edit ${stop.title}`} title="Time and notes" onClick={editing ? () => setEditing(false) : startEditing} className="rounded-full p-1.5 text-neutral-500 hover:bg-surface hover:text-foreground pointer-coarse:p-2.5">
                <Pencil className="h-4 w-4" />
              </button>
            ) : null}
            {canEdit && phone && onReorder ? (
              <>
                <button
                  type="button"
                  aria-label={`Move ${stop.title} up`}
                  disabled={isFirst}
                  onClick={() => onReorder(stop.id, -1)}
                  className="rounded-full p-2.5 text-neutral-500 hover:bg-surface hover:text-foreground disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${stop.title} down`}
                  disabled={isLast}
                  onClick={() => onReorder(stop.id, 1)}
                  className="rounded-full p-2.5 text-neutral-500 hover:bg-surface hover:text-foreground disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </>
            ) : null}
            {canEdit ? (
              <select
                aria-label={`Move ${stop.title}`}
                value=""
                onChange={(e) => {
                  const v = e.target.value as StopMove | "";
                  if (v) onMove(stop.id, v);
                }}
                className="h-7 max-w-[92px] rounded-full border border-border bg-white px-2 text-[12px] font-medium"
              >
                <option value="">Move to…</option>
                {Array.from({ length: dayCount }, (_, j) => j)
                  .filter((j) => j !== dayIndex)
                  .map((j) => (
                    <option key={j} value={`day:${j}`}>
                      Day {j + 1}
                    </option>
                  ))}
                {stop.itemId ? <option value="ideas">Back to ideas</option> : null}
                <option value="remove">Remove</option>
              </select>
            ) : null}
          </div>
        </div>
        {!editing && stop.note ? <p className="mt-1 text-[13px] text-neutral-700">{stop.note}</p> : null}
        {detailsOpen && place ? <StopDetails stop={stop} place={place} destination={destination} /> : null}
        {editing ? (
          <div className="mt-2 grid gap-2 rounded-xl bg-surface/70 p-2">
            <div className="flex gap-2">
              <TextInput type="time" aria-label="Start time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} className="w-32" />
              <TextInput
                type="number"
                min={5}
                step={5}
                aria-label="Duration (minutes)"
                placeholder="Minutes"
                value={draft.durationMin}
                onChange={(e) => setDraft({ ...draft, durationMin: e.target.value })}
                className="w-28"
              />
            </div>
            <TextArea aria-label="Note" placeholder="Tip or timing note" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} rows={2} />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={applyEdit}>
                Done
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}
