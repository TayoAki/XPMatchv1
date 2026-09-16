"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type PlannerTab = "where" | "when" | "who" | "budget";

interface UiStateValue {
  assistantOpen: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;
  plannerOpen: boolean;
  plannerTab: PlannerTab;
  openPlanner: (tab?: PlannerTab) => void;
  closePlanner: () => void;
  newChatNonce: number;
  startNewChat: () => void;
}

const UiStateContext = createContext<UiStateValue | null>(null);

export function UiStateProvider({ children }: { children: ReactNode }) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerTab, setPlannerTab] = useState<PlannerTab>("where");
  const [newChatNonce, setNewChatNonce] = useState(0);
  const router = useRouter();

  const openAssistant = useCallback(() => setAssistantOpen(true), []);
  const closeAssistant = useCallback(() => setAssistantOpen(false), []);
  const openPlanner = useCallback((tab: PlannerTab = "where") => {
    setPlannerTab(tab);
    setPlannerOpen(true);
  }, []);
  const closePlanner = useCallback(() => setPlannerOpen(false), []);
  const startNewChat = useCallback(() => {
    setNewChatNonce((n) => n + 1);
    router.push("/");
  }, [router]);

  const value = useMemo(
    () => ({
      assistantOpen,
      openAssistant,
      closeAssistant,
      plannerOpen,
      plannerTab,
      openPlanner,
      closePlanner,
      newChatNonce,
      startNewChat,
    }),
    [assistantOpen, openAssistant, closeAssistant, plannerOpen, plannerTab, openPlanner, closePlanner, newChatNonce, startNewChat],
  );

  return <UiStateContext.Provider value={value}>{children}</UiStateContext.Provider>;
}

export function useUiState(): UiStateValue {
  const ctx = useContext(UiStateContext);
  if (!ctx) throw new Error("useUiState must be used within UiStateProvider");
  return ctx;
}
