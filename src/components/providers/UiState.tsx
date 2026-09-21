"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ResolvedPlace } from "@/lib/places/types";
import type { Reservation } from "@/lib/reservations/types";

export type PlannerTab = "where" | "when" | "who" | "budget";

/** Something the traveler wants to add to one of their trips (opens the trip picker): a place, several places, or a booking. */
export interface AddToTripRequest {
  place?: ResolvedPlace;
  /** Several places at once (an import's "Add all to a trip"); `place` is the first of them. */
  places?: ResolvedPlace[];
  /** A reservation read from a confirmation; stored under Bookings with its details. */
  booking?: Reservation;
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
  bugReportOpen: boolean;
  openBugReport: () => void;
  closeBugReport: () => void;
  /** Trip whose itinerary board is open as a sheet over the chat (phones). */
  boardSheetTripId: string | null;
  openBoardSheet: (tripId: string) => void;
  closeBoardSheet: () => void;
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
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [boardSheetTripId, setBoardSheetTripId] = useState<string | null>(null);
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
  const openBugReport = useCallback(() => setBugReportOpen(true), []);
  const closeBugReport = useCallback(() => setBugReportOpen(false), []);
  const openBoardSheet = useCallback((tripId: string) => setBoardSheetTripId(tripId), []);
  const closeBoardSheet = useCallback(() => setBoardSheetTripId(null), []);
  const startNewChat = useCallback(() => {
    setNewChatNonce((n) => n + 1);
    router.push("/chat");
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
      bugReportOpen,
      openBugReport,
      closeBugReport,
      boardSheetTripId,
      openBoardSheet,
      closeBoardSheet,
      newChatNonce,
      startNewChat,
    }),
    [
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
      bugReportOpen,
      openBugReport,
      closeBugReport,
      boardSheetTripId,
      openBoardSheet,
      closeBoardSheet,
      newChatNonce,
      startNewChat,
    ],
  );

  return <UiStateContext.Provider value={value}>{children}</UiStateContext.Provider>;
}

export function useUiState(): UiStateValue {
  const ctx = useContext(UiStateContext);
  if (!ctx) throw new Error("useUiState must be used within UiStateProvider");
  return ctx;
}
