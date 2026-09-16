"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { CopilotChat, UseAgentUpdate, useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import type { Message } from "@ag-ui/core";
import { AlertTriangle } from "lucide-react";
import { newId, useTravelStore } from "@/lib/store";
import { mapActions } from "@/lib/map-store";
import { useAppConfig } from "@/lib/app-config";
import { useUiState } from "@/components/providers/UiState";
import { WelcomeHero } from "@/components/chat/WelcomeHero";
import { TripChatScope } from "@/components/chat/TripChatScope";
import { CompareBar } from "@/components/chat/cards/CompareControls";

function messageText(m: Message): string {
  const content = (m as { content?: unknown }).content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (p && typeof p === "object" && "text" in p ? String((p as { text: unknown }).text) : ""))
      .join(" ")
      .trim();
  }
  return "";
}

export function TravelChat({ threadId, initialPrompt, tripId }: { threadId?: string; initialPrompt?: string; tripId?: string }) {
  const { chats, upsertChat } = useTravelStore();
  const { openAssistant, openPlanner } = useUiState();
  const { copilotkit } = useCopilotKit();
  const { agent, isReady } = useAgent({ updates: [UseAgentUpdate.OnMessagesChanged, UseAgentUpdate.OnRunStatusChanged] });
  const config = useAppConfig();
  const router = useRouter();
  const sentRef = useRef(false);

  // Tell the map panel which thread is on screen.
  const activeThreadId = agent.threadId;
  useEffect(() => {
    mapActions.setActiveThread(activeThreadId ?? null);
    return () => mapActions.setActiveThread(null);
  }, [activeThreadId]);

  // Keep the local chat list in sync. The first user message names a new chat;
  // later renames (e.g. "Exploring Rome" from the map) are preserved.
  const messageCount = agent.messages.length;
  const knownChat = chats.some((c) => c.id === agent.threadId);
  useEffect(() => {
    if (!agent.threadId || messageCount === 0) return;
    const firstUser = agent.messages.find((m) => m.role === "user");
    if (!firstUser) return;
    if (knownChat) {
      upsertChat({ id: agent.threadId });
      return;
    }
    upsertChat({ id: agent.threadId, title: messageText(firstUser).slice(0, 70) || "New chat", tripId });
  }, [agent, agent.threadId, messageCount, knownChat, upsertChat, tripId]);

  // A prompt carried over from another page is sent once the chat is ready.
  useEffect(() => {
    if (!initialPrompt || sentRef.current || !isReady) return;
    sentRef.current = true;
    // Drop the prompt from the URL but keep the trip so the chat stays attached to it.
    router.replace(tripId ? `/?trip=${encodeURIComponent(tripId)}` : "/", { scroll: false });
    agent.addMessage({ id: newId(), role: "user", content: initialPrompt });
    copilotkit.runAgent({ agent }).catch((err) => console.error("XPMatch: runAgent failed", err));
  }, [initialPrompt, isReady, agent, copilotkit, router, tripId]);

  const toolsMenu = useMemo(
    () => [
      { label: "Set trip details (where, when, who, budget)", action: () => openPlanner("where") },
      { label: "Update my assistant", action: () => openAssistant() },
    ],
    [openPlanner, openAssistant],
  );

  return (
    <div className="xp-chat relative flex h-full min-h-0 flex-col">
      <CompareBar threadId={agent.threadId} />
      {config?.mode === "demo" ? (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[13px] text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Demo mode: no model API key configured, so answers are canned examples. Add <code className="rounded bg-amber-100 px-1">ANTHROPIC_API_KEY</code> to <code className="rounded bg-amber-100 px-1">.env.local</code> for live, personalized recommendations.
          </span>
        </div>
      ) : null}
      {tripId ? <TripChatScope tripId={tripId} threadId={agent.threadId} /> : null}
      <CopilotChat
        className="min-h-0 flex-1"
        threadId={threadId}
        labels={{
          chatInputPlaceholder: "Ask XPMatch",
          chatDisclaimerText: `XPMatch can make mistakes. Double-check prices, hours and availability before booking.${
            config?.mode === "live" && config.model && config.model !== "unknown" ? ` · Model: ${config.model}` : ""
          }`,
          welcomeMessageText: "Where to today?",
        }}
        welcomeScreen={WelcomeHero}
        input={{ toolsMenu, autoFocus: true }}
      />
    </div>
  );
}
