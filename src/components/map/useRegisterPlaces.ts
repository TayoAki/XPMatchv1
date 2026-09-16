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
}

/**
 * Pins a completed tool call's recommendations on the map. Runs once per tool
 * call (also when a thread is reopened and its cards re-render).
 */
export function useRegisterPlaces(options: {
  toolCallId: string;
  status: ToolCallStatus;
  kind: PlaceKind;
  destination?: string;
  items: RegisterItem[];
}) {
  const { toolCallId, status, kind, destination, items } = options;
  const threadId = useCardThreadId();
  const signature = useMemo(() => items.map((i) => `${i.name ?? ""}|${i.hint ?? ""}`).join("||"), [items]);

  useEffect(() => {
    if (status !== ToolCallStatus.Complete || !threadId || !toolCallId) return;
    if (mapActions.hasRegistered(threadId, toolCallId)) return;
    const valid = items.map((item, index) => ({ ...item, index })).filter((item) => item.name);
    if (valid.length === 0) return;
    mapActions.markRegistered(threadId, toolCallId);

    const isDestination = kind === "destination";
    void resolvePlaces({
      destination: isDestination ? undefined : destination,
      items: valid.map((item) => ({
        key: placeKey(toolCallId, item.index),
        query: isDestination
          ? [item.name, item.hint].filter(Boolean).join(", ")
          : [item.name, item.hint, destination].filter(Boolean).join(", "),
        kind,
      })),
    }).then((res) => {
      if (!res) return;
      const current = mapActions.getState().threads[threadId];
      if (res.destination && !current?.focus) mapActions.setFocus(threadId, res.destination);
      const places: MapPlace[] = res.items.flatMap(({ key, place }) =>
        place ? [{ ...place, kind, key, toolCallId }] : [],
      );
      mapActions.addPlaces(threadId, places);
    });
    // `signature` stands in for `items`, whose array identity changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, threadId, toolCallId, kind, destination, signature]);
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
