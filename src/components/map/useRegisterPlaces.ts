"use client";

import { useEffect, useMemo } from "react";
import { ToolCallStatus } from "@copilotkit/core";
import { useCopilotChatConfiguration } from "@copilotkit/react-core/v2";
import { mapActions, useMapView } from "@/lib/map-store";
import { resolvePlaces } from "@/lib/places/client";
import type { MapPlace, PlaceKind } from "@/lib/places/types";

export function placeKey(toolCallId: string, index: number): string {
  return `${toolCallId}:${index}`;
}

/** Thread the current card belongs to (chat configuration first, active thread as fallback). */
export function useCardThreadId(): string | null {
  const config = useCopilotChatConfiguration();
  const view = useMapView();
  return config?.threadId ?? view.threadId;
}

interface RegisterItem {
  name?: string;
  hint?: string;
  /** Overrides the call's kind for this item (a trip proposal mixes hotels, restaurants and sights). */
  kind?: PlaceKind;
}

/**
 * Pins a completed tool call's recommendations on the map. Runs once per tool
 * call (also when a thread is reopened and its cards re-render). A
 * human-in-the-loop card can ask for pins while it is still waiting for the
 * traveler's answer by listing `Executing` in `readyStatuses`.
 */
export function useRegisterPlaces(options: {
  toolCallId: string;
  status: ToolCallStatus;
  kind: PlaceKind;
  destination?: string;
  items: RegisterItem[];
  readyStatuses?: ToolCallStatus[];
}) {
  const { toolCallId, status, kind, destination, items } = options;
  const ready = (options.readyStatuses ?? [ToolCallStatus.Complete]).includes(status);
  const threadId = useCardThreadId();
  const signature = useMemo(() => items.map((i) => `${i.name ?? ""}|${i.hint ?? ""}|${i.kind ?? ""}`).join("||"), [items]);

  useEffect(() => {
    if (!ready || !threadId || !toolCallId) return;
    if (mapActions.hasRegistered(threadId, toolCallId)) return;
    const valid = items.map((item, index) => ({ ...item, index })).filter((item) => item.name);
    if (valid.length === 0) return;
    mapActions.markRegistered(threadId, toolCallId);

    const isDestination = kind === "destination";
    const kindByKey = new Map(valid.map((item) => [placeKey(toolCallId, item.index), item.kind ?? kind]));
    void resolvePlaces({
      destination: isDestination ? undefined : destination,
      items: valid.map((item) => ({
        key: placeKey(toolCallId, item.index),
        query: isDestination
          ? [item.name, item.hint].filter(Boolean).join(", ")
          : [item.name, item.hint, destination].filter(Boolean).join(", "),
        kind: item.kind ?? kind,
      })),
    }).then((res) => {
      if (!res) return;
      const current = mapActions.getState().threads[threadId];
      if (res.destination && !current?.focus) mapActions.setFocus(threadId, res.destination);
      const places: MapPlace[] = res.items.flatMap(({ key, place }) =>
        place ? [{ ...place, kind: kindByKey.get(key) ?? kind, key, toolCallId }] : [],
      );
      mapActions.addPlaces(threadId, places);
    });
    // `signature` stands in for `items`, whose array identity changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, threadId, toolCallId, kind, destination, signature]);
}

/** Selection and hover helpers for one card ↔ marker pair. */
export function usePlacePin(toolCallId: string, index: number) {
  const threadId = useCardThreadId();
  const view = useMapView(threadId);
  const key = placeKey(toolCallId, index);
  const place = view.places[key];
  return {
    place,
    isSelected: view.selectedKey === key,
    open: () => {
      if (threadId && place) mapActions.selectPlace(threadId, key);
    },
    hover: (on: boolean) => mapActions.setHovered(on && place ? key : null),
  };
}
