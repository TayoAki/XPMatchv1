"use client";

import { useEffect, type ReactNode } from "react";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { MobileTabBar } from "@/components/shell/MobileTabBar";
import { ConciergeLauncher } from "@/components/shell/ConciergeLauncher";
import { AssistantSettingsDialog } from "@/components/profile/AssistantSettingsDialog";
import { TripPlannerDialog } from "@/components/profile/TripPlannerDialog";
import { AddToTripDialog } from "@/components/trips/AddToTripDialog";
import { ImportDialog } from "@/components/import/ImportDialog";
import { BugReportDialog } from "@/components/bugs/BugReportDialog";
import { useTravelStore } from "@/lib/store";
import { useUiState } from "@/components/providers/UiState";
import { useMediaQuery } from "@/lib/use-media-query";

/** The signed-in shell: header on top, the page in a fixed-height main that scrolls internally, the phone tab bar, the concierge launcher and the app dialogs. */
export function AppShell({ children }: { children: ReactNode }) {
  const { hydrated, profile } = useTravelStore();
  const { openAssistant, importOpen, closeImport } = useUiState();
  // Phones ask the first questions inside the Discover hero (PhoneQuiz) instead of opening the wizard.
  const phone = !useMediaQuery("(min-width: 640px)");

  // First visit: ask for the basics so recommendations are personal from message one.
  useEffect(() => {
    if (hydrated && !profile.onboarded && !phone) openAssistant();
  }, [hydrated, profile.onboarded, phone, openAssistant]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" className="min-h-0 flex-1">
        {children}
      </main>
      <MobileTabBar />
      <ConciergeLauncher />
      <AssistantSettingsDialog />
      <TripPlannerDialog />
      <AddToTripDialog />
      <ImportDialog open={importOpen} onClose={closeImport} />
      <BugReportDialog />
    </div>
  );
}
