"use client";

import { TravelChat } from "@/components/chat/TravelChat";
import { DiscoveryPanel } from "@/components/panel/DiscoveryPanel";
import { useUiState } from "@/components/providers/UiState";

export function HomeClient({ threadId, initialPrompt }: { threadId?: string; initialPrompt?: string }) {
  const { newChatNonce } = useUiState();
  const chatKey = threadId ?? `new-${newChatNonce}`;
  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-1 flex-col">
        <TravelChat key={chatKey} threadId={threadId} initialPrompt={initialPrompt} />
      </section>
      <aside className="hidden w-[44%] min-w-[420px] max-w-[900px] shrink-0 border-l border-border/60 bg-white xl:block">
        <DiscoveryPanel />
      </aside>
    </div>
  );
}
