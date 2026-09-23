"use client";

import type { PointerEvent } from "react";
import clsx from "clsx";
import { TravelChat } from "@/components/chat/TravelChat";
import { MobileMapSheet } from "@/components/map/MobileMapSheet";
import { TripBoardSheet } from "@/components/trips/TripBoardSheet";
import { RightPanel } from "@/components/panel/RightPanel";
import { useUiState } from "@/components/providers/UiState";
import { TripScopeProvider } from "@/components/trips/TripScope";
import { useDetailCardMounted } from "@/components/map/detailSlot";
import { useTravelStore } from "@/lib/store";
import { mapActions, useMapView } from "@/lib/map-store";
import { useMediaQuery } from "@/lib/use-media-query";

/** The concierge page (`/chat`): the active chat (history lives in the side rail) and the discovery/map panel. */
export function HomeClient({ threadId, initialPrompt, tripId }: { threadId?: string; initialPrompt?: string; tripId?: string }) {
  const { newChatNonce } = useUiState();
  const { chats } = useTravelStore();
  // Below xl the welcome screen carries the discovery feed and the map opens over the chat,
  // so the side panel is not rendered at all (a hidden panel would still fetch the picks).
  const wide = useMediaQuery("(min-width: 1280px)");
  // A reopened chat keeps the trip it was started from.
  const effectiveTripId = tripId ?? (threadId ? chats.find((c) => c.id === threadId)?.tripId : undefined) ?? null;
  const chatKey = threadId ?? `new-${newChatNonce}-${tripId ?? ""}`;
  // A destination card open in full in the side panel: the panel widens and the conversation
  // steps back until the traveler returns to it (a press in the chat, Escape or the card's close).
  const view = useMapView();
  const cardOnScreen = useDetailCardMounted(view.detail);
  const detailOpen = wide && !!view.detail && cardOnScreen;
  const backToChat = (e: PointerEvent<HTMLElement>) => {
    if (!detailOpen || !view.threadId) return;
    const target = e.target as HTMLElement;
    // Events from the card's full view reach here through its portal; only presses in the chat itself count.
    if (!e.currentTarget.contains(target)) return;
    // Typing, the planner chips and another destination card keep the panel (a card switches it).
    if (target.closest('[data-testid="copilot-chat-input"], [data-testid="chat-footer"], [data-testid="destination-card"]')) return;
    mapActions.closeDetail(view.threadId);
  };
  return (
    <TripScopeProvider tripId={effectiveTripId}>
      <div className="flex h-full min-h-0">
        <section className="xp-dimmable relative flex min-w-0 flex-1 flex-col" data-dimmed={detailOpen || undefined} onPointerDownCapture={backToChat}>
          <TravelChat key={chatKey} threadId={threadId} initialPrompt={initialPrompt} tripId={effectiveTripId ?? undefined} />
          <MobileMapSheet />
          <TripBoardSheet />
        </section>
        {wide ? (
          <aside
            className={clsx(
              "shrink-0 border-l border-border/60 bg-white transition-[width] duration-300 ease-out motion-reduce:transition-none",
              detailOpen ? "w-[clamp(460px,42vw,780px)]" : "w-[clamp(360px,30vw,520px)]",
            )}
          >
            <RightPanel />
          </aside>
        ) : null}
      </div>
    </TripScopeProvider>
  );
}
