"use client";

import { useCallback } from "react";
import clsx from "clsx";
import { TravelChat } from "@/components/chat/TravelChat";
import { MobileMapSheet } from "@/components/map/MobileMapSheet";
import { PlaceDetailSheet } from "@/components/map/PlaceDetailSheet";
import { TripBoardSheet } from "@/components/trips/TripBoardSheet";
import { RightPanel } from "@/components/panel/RightPanel";
import { useUiState } from "@/components/providers/UiState";
import { TripScopeProvider } from "@/components/trips/TripScope";
import { useDetailCardMounted } from "@/components/map/detailSlot";
import { useTravelStore } from "@/lib/store";
import { mapActions, useMapView } from "@/lib/map-store";
import { useMediaQuery } from "@/lib/use-media-query";

/**
 * The concierge page (`/chat`): the active chat (history lives in the side rail) and the
 * discovery/map panel; with a plan open, the plan in the center and the chat on the right, where a
 * place picked in the plan opens beside it.
 */
export function HomeClient({ threadId, initialPrompt, tripId }: { threadId?: string; initialPrompt?: string; tripId?: string }) {
  const { newChatNonce } = useUiState();
  const { chats } = useTravelStore();
  // Below xl the welcome screen carries the discovery feed and the map opens over the chat,
  // so the side panel is not rendered at all (a hidden panel would still fetch the picks).
  const wide = useMediaQuery("(min-width: 1280px)");
  // A reopened chat keeps the trip it was started from.
  const effectiveTripId = tripId ?? (threadId ? chats.find((c) => c.id === threadId)?.tripId : undefined) ?? null;
  const chatKey = threadId ?? `new-${newChatNonce}-${tripId ?? ""}`;
  // A destination card opened in full becomes the workspace: the plan takes the center and the
  // chat moves to the right as a side panel, still live for asking about the plan. The columns only
  // swap places (CSS order), so the conversation is never remounted.
  const view = useMapView();
  const cardOnScreen = useDetailCardMounted(view.detail);
  const workspace = wide && !!view.detail && cardOnScreen;
  // A place picked in the plan (a stop, a pin on a day's map) opens in this column, over the
  // conversation, so the itinerary and the place are on screen together; Back returns to the chat,
  // which stays mounted underneath.
  const sidePlace = workspace && view.selectedKey ? view.selected : null;
  const threadOnScreen = view.threadId;
  const backToChat = useCallback(() => {
    if (threadOnScreen) mapActions.selectPlace(threadOnScreen, null);
  }, [threadOnScreen]);
  return (
    <TripScopeProvider tripId={effectiveTripId}>
      <div className="flex h-full min-h-0">
        <section
          className={clsx("relative flex min-w-0 flex-col", workspace ? "order-2 w-[clamp(360px,27vw,440px)] shrink-0 border-l border-border/60" : "flex-1")}
          data-testid="chat-column"
          data-side={workspace || undefined}
        >
          <div className="flex h-full min-h-0 flex-col" inert={!!sidePlace} aria-hidden={sidePlace ? true : undefined}>
            <TravelChat key={chatKey} threadId={threadId} initialPrompt={initialPrompt} tripId={effectiveTripId ?? undefined} />
          </div>
          {sidePlace ? (
            <div className="absolute inset-0 z-30 bg-white" data-testid="side-place">
              <PlaceDetailSheet key={view.selectedKey ?? "none"} place={sidePlace} focusName={view.focus?.name} onClose={backToChat} onSent={backToChat} backLabel="Back to chat" />
            </div>
          ) : null}
          <MobileMapSheet />
          <TripBoardSheet />
        </section>
        {wide ? (
          <aside
            className={clsx("min-w-0 bg-white", workspace ? "order-1 flex-1" : "w-[clamp(360px,30vw,520px)] shrink-0 border-l border-border/60")}
            data-testid={workspace ? "plan-workspace" : "side-panel"}
          >
            <RightPanel />
          </aside>
        ) : null}
      </div>
    </TripScopeProvider>
  );
}
