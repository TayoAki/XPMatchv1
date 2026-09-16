"use client";

import { TravelChat } from "@/components/chat/TravelChat";
import { ChatHistoryRail } from "@/components/chat/ChatHistoryRail";
import { RightPanel } from "@/components/panel/RightPanel";
import { useUiState } from "@/components/providers/UiState";
import { TripScopeProvider } from "@/components/trips/TripScope";
import { useTravelStore } from "@/lib/store";

/** The chat experience: history rail, the active chat, and the discovery/map panel. */
export function HomeClient({ threadId, initialPrompt, tripId }: { threadId?: string; initialPrompt?: string; tripId?: string }) {
  const { newChatNonce } = useUiState();
  const { chats } = useTravelStore();
  // A reopened chat keeps the trip it was started from.
  const effectiveTripId = tripId ?? (threadId ? chats.find((c) => c.id === threadId)?.tripId : undefined) ?? null;
  const chatKey = threadId ?? `new-${newChatNonce}-${tripId ?? ""}`;
  return (
    <TripScopeProvider tripId={effectiveTripId}>
      <div className="flex h-full min-h-0">
        <div className="hidden xl:flex">
          <ChatHistoryRail activeThreadId={threadId} />
        </div>
        <section className="flex min-w-0 flex-1 flex-col">
          <TravelChat key={chatKey} threadId={threadId} initialPrompt={initialPrompt} tripId={effectiveTripId ?? undefined} />
        </section>
        <aside className="hidden w-[42%] min-w-[400px] max-w-[860px] shrink-0 border-l border-border/60 bg-white xl:block">
          <RightPanel />
        </aside>
      </div>
    </TripScopeProvider>
  );
}
