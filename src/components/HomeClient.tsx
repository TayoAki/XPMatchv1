"use client";

import { TravelChat } from "@/components/chat/TravelChat";
import { RightPanel } from "@/components/panel/RightPanel";
import { useUiState } from "@/components/providers/UiState";
import { TripScopeProvider } from "@/components/trips/TripScope";
import { useTravelStore } from "@/lib/store";

export function HomeClient({ threadId, initialPrompt, tripId }: { threadId?: string; initialPrompt?: string; tripId?: string }) {
  const { newChatNonce } = useUiState();
  const { chats } = useTravelStore();
  // A reopened chat keeps the trip it was started from.
  const effectiveTripId = tripId ?? (threadId ? chats.find((c) => c.id === threadId)?.tripId : undefined) ?? null;
  const chatKey = threadId ?? `new-${newChatNonce}-${tripId ?? ""}`;
  return (
    <TripScopeProvider tripId={effectiveTripId}>
      <div className="flex h-full min-h-0">
        <section className="flex min-w-0 flex-1 flex-col">
          <TravelChat key={chatKey} threadId={threadId} initialPrompt={initialPrompt} tripId={effectiveTripId ?? undefined} />
        </section>
        <aside className="hidden w-[44%] min-w-[420px] max-w-[900px] shrink-0 border-l border-border/60 bg-white xl:block">
          <RightPanel />
        </aside>
      </div>
    </TripScopeProvider>
  );
}
