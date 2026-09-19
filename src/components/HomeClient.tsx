"use client";

import { TravelChat } from "@/components/chat/TravelChat";
import { MobileMapOverlay } from "@/components/map/MobileMapOverlay";
import { RightPanel } from "@/components/panel/RightPanel";
import { useUiState } from "@/components/providers/UiState";
import { TripScopeProvider } from "@/components/trips/TripScope";
import { useTravelStore } from "@/lib/store";
import { useMediaQuery } from "@/lib/use-media-query";

/** The chat experience: the active chat and the discovery/map panel (history lives in the sidebar). */
export function HomeClient({ threadId, initialPrompt, tripId }: { threadId?: string; initialPrompt?: string; tripId?: string }) {
  const { newChatNonce } = useUiState();
  const { chats } = useTravelStore();
  // Below xl the welcome screen carries the discovery feed and the map opens over the chat,
  // so the side panel is not rendered at all (a hidden panel would still fetch the picks).
  const wide = useMediaQuery("(min-width: 1280px)");
  // A reopened chat keeps the trip it was started from.
  const effectiveTripId = tripId ?? (threadId ? chats.find((c) => c.id === threadId)?.tripId : undefined) ?? null;
  const chatKey = threadId ?? `new-${newChatNonce}-${tripId ?? ""}`;
  return (
    <TripScopeProvider tripId={effectiveTripId}>
      <div className="flex h-full min-h-0">
        <section className="relative flex min-w-0 flex-1 flex-col">
          <TravelChat key={chatKey} threadId={threadId} initialPrompt={initialPrompt} tripId={effectiveTripId ?? undefined} />
          <MobileMapOverlay />
        </section>
        {wide ? (
          <aside className="w-[44%] min-w-[420px] max-w-[900px] shrink-0 border-l border-border/60 bg-white">
            <RightPanel />
          </aside>
        ) : null}
      </div>
    </TripScopeProvider>
  );
}
