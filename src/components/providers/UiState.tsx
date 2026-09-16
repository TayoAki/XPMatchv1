"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ResolvedPlace } from "@/lib/places/types";

export type PlannerTab = "where" | "when" | "who" | "budget";

/** A place the traveler wants to add to one of their trips (opens the trip picker). */
export interface AddToTripRequest {
  place: ResolvedPlace;
  /** Several places at once (an import's "Add all to a trip"); `place` is the first of them. */
  places?: ResolvedPlace[];
  /** Preselected trip, e.g. the trip whose page or chat is open. */
  tripId?: string;
  note?: string;
}

interface UiStateValue {
  assistantOpen: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;
  importOpen: boolean;
  openImport: () => void;
  closeImport: () => void;
  plannerOpen: boolean;
  plannerTab: PlannerTab;
  openPlanner: (tab?: PlannerTab) => void;
  closePlanner: () => void;
  addToTrip: AddToTripRequest | null;
  openAddToTrip: (request: AddToTripRequest) => void;
  closeAddToTrip: () => void;
  newChatNonce: number;
  startNewChat: () => void;
}

const UiStateContext = createContext<UiStateValue | null>(null);

export function UiStateProvider({ children }: { children: ReactNode }) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerTab, setPlannerTab] = useState<PlannerTab>("where");
  const [addToTrip, setAddToTrip] = useState<AddToTripRequest | null>(null);
  const [newChatNonce, setNewChatNonce] = useState(0);
  const router = useRouter();

  const openAssistant = useCallback(() => setAssistantOpen(true), []);
  const closeAssistant = useCallback(() => setAssistantOpen(false), []);
  const openImport = useCallback(() => setImportOpen(true), []);
  const closeImport = useCallback(() => setImportOpen(false), []);
  const openPlanner = useCallback((tab: PlannerTab = "where") => {
    setPlannerTab(tab);
    setPlannerOpen(true);
  }, []);
  const closePlanner = useCallback(() => setPlannerOpen(false), []);
  const openAddToTrip = useCallback((request: AddToTripRequest) => setAddToTrip(request), []);
  const closeAddToTrip = useCallback(() => setAddToTrip(null), []);
  const startNewChat = useCallback(() => {
    setNewChatNonce((n) => n + 1);
    router.push("/");
  }, [router]);

  const value = useMemo(
    () => ({
      assistantOpen,
      openAssistant,
      closeAssistant,
      importOpen,
      openImport,
      closeImport,
      plannerOpen,
      plannerTab,
      openPlanner,
      closePlanner,
      addToTrip,
      openAddToTrip,
      closeAddToTrip,
      newChatNonce,
      startNewChat,
    }),
    [assistantOpen, openAssistant, closeAssistant, importOpen, openImport, closeImport, plannerOpen, plannerTab, openPlanner, closePlanner, addToTrip, openAddToTrip, closeAddToTrip, newChatNonce, startNewChat],
  );

  return <UiStateContext.Provider value={value}>{children}</UiStateContext.Provider>;
}

export function useUiState(): UiStateValue {
  const ctx = useContext(UiStateContext);
  if (!ctx) throw new Error("useUiState must be used within UiStateProvider");
  return ctx;
}
