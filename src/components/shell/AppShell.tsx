"use client";

import { useEffect, type ReactNode } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { AssistantSettingsDialog } from "@/components/profile/AssistantSettingsDialog";
import { TripPlannerDialog } from "@/components/profile/TripPlannerDialog";
import { useTravelStore } from "@/lib/store";
import { useUiState } from "@/components/providers/UiState";

export function AppShell({ children }: { children: ReactNode }) {
  const { hydrated, profile } = useTravelStore();
  const { openAssistant } = useUiState();

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
      </div>
      <AssistantSettingsDialog />
      <TripPlannerDialog />
    </div>
  );
}
