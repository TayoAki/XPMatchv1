"use client";

import { KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type UniqueIdentifier } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { ItineraryDay, TripItem } from "@/lib/types";
import { findStop, insertStop, moveStop, removeStop, stopFromItem } from "@/lib/itinerary";

export const IDEAS_CONTAINER = "ideas";
export const dayContainerId = (index: number) => `day:${index}`;
export const ideaDragId = (itemId: string) => `idea:${itemId}`;

type Container = { kind: "day"; index: number } | { kind: "ideas" };

/** Which list a draggable or droppable id belongs to: a day (by stop id or container id) or the ideas tray. */
export function containerOf(days: ItineraryDay[], id: UniqueIdentifier): Container | null {
  const s = String(id);
  if (s === IDEAS_CONTAINER || s.startsWith("idea:")) return { kind: "ideas" };
  if (s.startsWith("day:")) {
    const index = Number(s.slice(4));
    return Number.isInteger(index) && index >= 0 && index < days.length ? { kind: "day", index } : null;
  }
  const found = findStop(days, s);
  return found ? { kind: "day", index: found.dayIndex } : null;
}

/** True when `overId` is this day's list or one of its stops. */
export function isOverDay(day: ItineraryDay, index: number, overId: UniqueIdentifier | null | undefined): boolean {
  if (overId == null) return false;
  const s = String(overId);
  return s === dayContainerId(index) || day.stops.some((stop) => stop.id === s);
}

interface Options {
  days: ItineraryDay[];
  items: TripItem[];
  /** Receives the new itinerary to save. */
  commit: (days: ItineraryDay[]) => void;
}

/**
 * Drag-and-drop for the board. Stops sort within a day, move between days and
 * ideas drop into a day. Everything is applied on drop (no live re-parenting
 * while dragging, which fights dnd-kit's re-measuring); the target day
 * highlights while a card hovers it. Pointer drags start after 6px so clicks
 * on cards still work; the keyboard sensor (space, arrows, space) is the
 * accessible path.
 */
export function useItineraryDnd({ days, items, commit }: Options) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;
    const to = containerOf(days, over.id);
    if (!to) return;
    // Dropping on a stop takes that stop's slot; dropping on the list itself appends.
    const slotIn = (dayIndex: number) => {
      const i = days[dayIndex].stops.findIndex((s) => s.id === overId);
      return i >= 0 ? i : days[dayIndex].stops.length;
    };

    if (activeId.startsWith("idea:")) {
      if (to.kind !== "day") return;
      const item = items.find((i) => i.id === activeId.slice(5));
      if (!item) return;
      commit(insertStop(days, to.index, stopFromItem(item), slotIn(to.index)));
      return;
    }

    const from = findStop(days, activeId);
    if (!from) return;
    if (to.kind === "ideas") {
      // Only a stop made from an idea can go back to the tray; anything else stays put.
      if (days[from.dayIndex].stops[from.index].itemId) commit(removeStop(days, activeId));
      return;
    }
    let toIndex = slotIn(to.index);
    if (to.index === from.dayIndex) {
      if (overId === dayContainerId(to.index)) toIndex = days[to.index].stops.length - 1;
      if (toIndex === from.index) return;
    }
    commit(moveStop(days, activeId, to.index, toIndex));
  };

  return { sensors, handlers: { onDragEnd } };
}
