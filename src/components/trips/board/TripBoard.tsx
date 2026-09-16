"use client";

import { useRef, useState } from "react";
import { DndContext, closestCorners } from "@dnd-kit/core";
import { Calendar, Lightbulb, Plus, Sparkles, Ticket, Users } from "lucide-react";
import { formatDateRange, useTravelStore } from "@/lib/store";
import type { ItineraryDay, ItineraryStop, TripDetail, TripItem } from "@/lib/types";
import type { PlaceKind } from "@/lib/places/types";
import { addDay, dayColor, insertStop, moveStop, newStopId, optimizeDay, removeStop, scheduledItemIds, stopFromItem, updateStop } from "@/lib/itinerary";
import { Button } from "@/components/ui/Button";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { DayColumn } from "./DayColumn";
import { IdeasTray } from "./IdeasTray";
import type { StopMove } from "./StopCard";
import { useItineraryDnd } from "./useItineraryDnd";

function dayDate(startDate: string | undefined, index: number): string | null {
  if (!startDate) return null;
  const d = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + index);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export interface TripBoardProps {
  trip: TripDetail;
  canEdit: boolean;
  onTrip: (trip: TripDetail) => void;
  onSelectPlace: (key: string | null) => void;
  hoveredKey?: string | null;
  onHover?: (key: string | null) => void;
}

/**
 * Wanderlog-style board: the days of the trip as lists of numbered stops with
 * travel legs, and a tray of unscheduled ideas. Every change is saved as the
 * whole itinerary (the server resolves new places); saves run one at a time
 * and the newest pending change wins.
 */
export function TripBoard({ trip, canEdit, onTrip, onSelectPlace, hoveredKey, onHover }: TripBoardProps) {
  const { patchTrip } = useTravelStore();
  const send = useSendMessage();
  const [days, setDays] = useState<ItineraryDay[]>(trip.itinerary);
  const [syncedAt, setSyncedAt] = useState(trip.updatedAt);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queueRef = useRef<{ inFlight: boolean; next: ItineraryDay[] | null }>({ inFlight: false, next: null });

  // Changes made elsewhere (assistant tools, another member, the resolved places of our own save) replace local state once nothing is pending.
  if (trip.updatedAt !== syncedAt && !saving) {
    setSyncedAt(trip.updatedAt);
    setDays(trip.itinerary);
  }

  const persist = (next: ItineraryDay[]) => {
    setDays(next);
    if (!canEdit) return;
    const q = queueRef.current;
    q.next = next;
    if (q.inFlight) return;
    q.inFlight = true;
    setSaving(true);
    void (async () => {
      try {
        while (q.next) {
          const payload = q.next;
          q.next = null;
          const detail = await patchTrip(trip.id, { itinerary: payload });
          if (!q.next) onTrip(detail);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error && err.message ? err.message : "Could not save the itinerary");
      } finally {
        q.inFlight = false;
        q.next = null;
        setSaving(false);
      }
    })();
  };

  const ideas = trip.items.filter((i) => i.kind === "idea");
  const { sensors, handlers } = useItineraryDnd({ days, items: ideas, commit: persist });
  const scheduled = scheduledItemIds(days);
  const unscheduled = ideas.filter((i) => !scheduled.has(i.id));
  const bookings = trip.items.filter((i) => i.kind === "booking").length;
  const dates = formatDateRange(trip.startDate, trip.endDate);

  const onMoveStop = (stopId: string, to: StopMove) => {
    if (to === "ideas" || to === "remove") return persist(removeStop(days, stopId));
    const target = Number(to.slice(4));
    if (!Number.isInteger(target) || target < 0 || target >= days.length) return;
    persist(moveStop(days, stopId, target, days[target].stops.length));
  };

  const onAddStop = (dayIndex: number, title: string, kind?: PlaceKind) => {
    const stop: ItineraryStop = { id: newStopId(), title, note: "" };
    if (kind) stop.kind = kind;
    persist(insertStop(days, dayIndex, stop));
  };

  const onRemoveDay = (dayIndex: number) => {
    const day = days[dayIndex];
    if (day.stops.length && !window.confirm(`Remove day ${dayIndex + 1} and its ${day.stops.length} stop${day.stops.length === 1 ? "" : "s"}? Ideas go back to the tray.`)) return;
    persist(days.filter((_, j) => j !== dayIndex).map((d, j) => ({ ...d, day: j + 1 })));
  };

  const onAddToDay = (item: TripItem, dayIndex: number) => persist(insertStop(days, dayIndex, stopFromItem(item)));

  return (
    <div className="grid gap-4" data-testid="trip-board">
      <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium">
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3">
          <Calendar className="h-3.5 w-3.5" /> {dates || "No dates yet"}
        </span>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3">
          <Users className="h-3.5 w-3.5" /> {trip.travelers ? `${trip.travelers} traveler${trip.travelers === 1 ? "" : "s"}` : "Travelers"}
        </span>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3">
          <Ticket className="h-3.5 w-3.5" /> {bookings ? `${bookings} booking${bookings === 1 ? "" : "s"}` : "No bookings"}
        </span>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3">
          <Lightbulb className="h-3.5 w-3.5" /> {ideas.length ? `${ideas.length} idea${ideas.length === 1 ? "" : "s"}` : "No ideas yet"}
        </span>
        <span className="ml-auto text-[12px] text-muted" aria-live="polite">
          {saving ? "Saving…" : ""}
        </span>
      </div>
      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}

      <DndContext id="trip-board" sensors={sensors} collisionDetection={closestCorners} {...handlers}>
        <div className="grid gap-3">
          {days.map((day, i) => (
            <DayColumn
              key={i}
              day={day}
              index={i}
              dayCount={days.length}
              dateLabel={dayDate(trip.startDate, i)}
              color={dayColor(i)}
              canEdit={canEdit}
              saving={saving}
              hoveredKey={hoveredKey}
              onHover={onHover}
              onSelectPlace={onSelectPlace}
              onRename={(title) => setDays(days.map((d, j) => (j === i ? { ...d, title } : d)))}
              onRenameCommit={() => persist(days)}
              onAddStop={(title, kind) => onAddStop(i, title, kind)}
              onMoveStop={onMoveStop}
              onUpdateStop={(stopId, patch) => persist(updateStop(days, stopId, patch))}
              onOptimize={() => persist(days.map((d, j) => (j === i ? { ...d, stops: optimizeDay(d.stops) } : d)))}
              onRemoveDay={() => onRemoveDay(i)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <Button variant="outline" size="sm" onClick={() => persist(addDay(days))}>
              <Plus className="h-4 w-4" /> Add day
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              send(
                days.length
                  ? "Refine the itinerary for this trip: keep what works, fix the pacing and fill any gaps, then save it to the trip."
                  : "Build a day-by-day itinerary for this trip from my ideas and preferences, then save it to the trip.",
              )
            }
          >
            <Sparkles className="h-4 w-4" /> {days.length ? "Refine with the assistant" : "Build it with the assistant"}
          </Button>
        </div>
        <IdeasTray
          ideas={unscheduled}
          destination={trip.destination}
          dayCount={days.length}
          canEdit={canEdit}
          hoveredKey={hoveredKey}
          onHover={onHover}
          onSelectPlace={onSelectPlace}
          onAddToDay={onAddToDay}
        />
      </DndContext>
    </div>
  );
}
