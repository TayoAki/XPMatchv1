"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CopilotChat, UseAgentUpdate, useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import type { Message } from "@ag-ui/core";
import { AlertTriangle } from "lucide-react";
import { newId, travelActions, useTravelStore } from "@/lib/store";
import { mapActions } from "@/lib/map-store";
import { useAppConfig } from "@/lib/app-config";
import { useUiState } from "@/components/providers/UiState";
import { WelcomeHero } from "@/components/chat/WelcomeHero";
import { TripChatScope } from "@/components/chat/TripChatScope";
import { CompareBar } from "@/components/chat/cards/CompareControls";
import { PlannerChips } from "@/components/shell/PlannerChips";

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
  const { openAssistant, openPlanner, openImport } = useUiState();
  const { copilotkit } = useCopilotKit();
  const { agent, isReady } = useAgent({ updates: [UseAgentUpdate.OnMessagesChanged, UseAgentUpdate.OnRunStatusChanged] });
  const config = useAppConfig();
  const router = useRouter();
  const sentRef = useRef(false);
  const plannerStartedRef = useRef(false);
  const previousStoppedRef = useRef(false);

  // The agent is shared by every chat. A chat opening while the assistant is still answering in the
  // previous one (New chat, another chat from the rail) must not take it over mid-answer: that answer
  // would keep writing its conversation into this chat, and its tool calls (the map focus, the chat
  // title) would land here. So the previous answer is stopped, including the pause between a tool
  // call and its automatic follow-up (the agent is not running then, so any leftover conversation
  // counts), and this chat's conversation mounts only once that run has wound down (at most 1.5 s).
  // Once per mount. Leaving for another page stops nothing, and coming back to the same chat stops
  // nothing either (the chat reconnects to its answer), so an answer can finish in the background.
  const [previousSettled, setPreviousSettled] = useState(
    () => (!agent.isRunning && agent.messages.length === 0) || (!!threadId && agent.threadId === threadId),
  );
  useLayoutEffect(() => {
    if (previousSettled || previousStoppedRef.current) return;
    previousStoppedRef.current = true;
    copilotkit.stopAgent({ agent });
    const woundDown = agent.detachActiveRun().catch(() => {});
    void Promise.race([woundDown, new Promise((r) => setTimeout(r, 1500))])
      .then(() => new Promise((r) => setTimeout(r, 50)))
      .then(() => setPreviousSettled(true));
  }, [agent, copilotkit, previousSettled]);

  // A new chat starts over (unless the traveler just set up the trip on Discover), and planner
  // values set while this chat is on screen stay with it. Before paint, so the chips never show
  // the last chat's values; the ref keeps a development double mount from resetting a draft.
  useLayoutEffect(() => {
    if (!threadId && !plannerStartedRef.current) {
      plannerStartedRef.current = true;
      travelActions.startNewChatPlanner();
    }
    travelActions.setChatOnScreen(true);
    return () => travelActions.setChatOnScreen(false);
  }, [threadId]);

  // The thread on screen: none while the previous chat winds down (the agent still holds its thread).
  const activeThreadId = previousSettled ? agent.threadId : undefined;

  // Tell the map panel which thread is on screen.
  useEffect(() => {
    mapActions.setActiveThread(activeThreadId ?? null);
    return () => mapActions.setActiveThread(null);
  }, [activeThreadId]);

  // A chat reopened after a reload (or on another device) gets its destination back from its record,
  // so the map and the Where chip show it before any card registers a place.
  const savedPlace = activeThreadId ? chats.find((c) => c.id === activeThreadId)?.place : undefined;
  useEffect(() => {
    if (!activeThreadId || !savedPlace) return;
    if (!mapActions.getState().threads[activeThreadId]?.focus) mapActions.setFocus(activeThreadId, savedPlace);
  }, [activeThreadId, savedPlace]);

  // Keep the local chat list in sync. The first user message names a new chat;
  // later renames (e.g. "Exploring Rome" from the map) are preserved.
  const messageCount = previousSettled ? agent.messages.length : 0;
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
    if (!initialPrompt || sentRef.current || !isReady || !previousSettled) return;
    sentRef.current = true;
    // Drop the prompt from the URL but keep the trip so the chat stays attached to it.
    router.replace(tripId ? `/chat?trip=${encodeURIComponent(tripId)}` : "/chat", { scroll: false });
    agent.addMessage({ id: newId(), role: "user", content: initialPrompt });
    copilotkit.runAgent({ agent }).catch((err) => console.error("XPMatch: runAgent failed", err));
  }, [initialPrompt, isReady, previousSettled, agent, copilotkit, router, tripId]);

  // The conversation's title over the transcript once it has one (the first message names it).
  const chatTitle = activeThreadId ? chats.find((c) => c.id === activeThreadId)?.title : undefined;

  const toolsMenu = useMemo(
    () => [
      { label: "Import inspiration (link or screenshot)", action: () => openImport() },
      { label: "Set trip details (where, when, who, budget)", action: () => openPlanner("where") },
      { label: "Update my assistant", action: () => openAssistant() },
    ],
    [openImport, openPlanner, openAssistant],
  );

  return (
    <div className="xp-chat relative flex h-full min-h-0 flex-col">
      <CompareBar threadId={activeThreadId} />
      {config?.mode === "demo" ? (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[13px] text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Demo mode: no model API key configured, so answers are canned examples. Add <code className="rounded bg-amber-100 px-1">ANTHROPIC_API_KEY</code> to <code className="rounded bg-amber-100 px-1">.env.local</code> for live, personalized recommendations.
          </span>
        </div>
      ) : null}
      {tripId ? <TripChatScope tripId={tripId} threadId={activeThreadId} /> : null}
      {chatTitle && messageCount > 0 ? (
        <div className="shrink-0 border-b border-border/60 bg-canvas px-4 py-3 pr-44 sm:px-6 sm:pr-44 xl:pr-6" data-testid="chat-header">
          <h1 className="truncate font-serif text-[22px] leading-tight">{chatTitle}</h1>
          <p className="text-[13px] text-muted">Your personal travel concierge</p>
        </div>
      ) : null}
      {previousSettled ? (
        <CopilotChat
          className="min-h-0 flex-1"
          threadId={threadId}
          labels={{
            chatInputPlaceholder: "Ask your concierge",
            // Blank: the planner chips and our own line render under the composer instead (globals.css hides the empty slot).
            chatDisclaimerText: "",
            welcomeMessageText: "Where to today?",
          }}
          welcomeScreen={WelcomeHero}
          input={{ toolsMenu, autoFocus: true }}
        />
      ) : (
        <div className="min-h-0 flex-1" aria-busy="true" />
      )}
      {/* Under the composer: the trip planner values as chips, then the disclaimer. */}
      <div className="mx-auto w-full max-w-[780px] shrink-0 px-4 pb-2 pt-1 sm:px-6" data-testid="chat-footer">
        <PlannerChips />
        <p className="mt-1.5 text-center text-[11px] leading-4 text-muted">
          XPMatch can make mistakes. Double-check prices, hours and availability before booking.
          {config?.mode === "live" && config.model && config.model !== "unknown" ? ` · Model: ${config.model}` : ""}
        </p>
      </div>
    </div>
  );
}
