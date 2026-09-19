"use client";

import { useEffect, type ReactNode } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { MobileTabBar } from "@/components/shell/MobileTabBar";
import { AssistantSettingsDialog } from "@/components/profile/AssistantSettingsDialog";
import { TripPlannerDialog } from "@/components/profile/TripPlannerDialog";
import { AddToTripDialog } from "@/components/trips/AddToTripDialog";
import { ImportDialog } from "@/components/import/ImportDialog";
import { BugReportDialog } from "@/components/bugs/BugReportDialog";
import { useTravelStore } from "@/lib/store";
import { useUiState } from "@/components/providers/UiState";

export function AppShell({ children }: { children: ReactNode }) {
  const { hydrated, profile } = useTravelStore();
  const { openAssistant, importOpen, closeImport } = useUiState();

  // First visit: ask for the basics so recommendations are personal from message one.
  useEffect(() => {
    if (hydrated && !profile.onboarded) openAssistant();
  }, [hydrated, profile.onboarded, openAssistant]);

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1">{children}</main>
        <MobileTabBar />
      </div>
      <AssistantSettingsDialog />
      <TripPlannerDialog />
      <AddToTripDialog />
      <ImportDialog open={importOpen} onClose={closeImport} />
      <BugReportDialog />
    </div>
  );
}
