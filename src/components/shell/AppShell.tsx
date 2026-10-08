"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { SideRail } from "@/components/shell/SideRail";
import { MobileTabBar } from "@/components/shell/MobileTabBar";
import { ConciergeLauncher } from "@/components/shell/ConciergeLauncher";
import { AssistantSettingsDialog } from "@/components/profile/AssistantSettingsDialog";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { TripPlannerDialog } from "@/components/profile/TripPlannerDialog";
import { AddToTripDialog } from "@/components/trips/AddToTripDialog";
import { ImportDialog } from "@/components/import/ImportDialog";
import { BugReportDialog } from "@/components/bugs/BugReportDialog";
import { useTravelStore } from "@/lib/store";
import { useUiState } from "@/components/providers/UiState";

/**
 * The signed-in shell: the header on top; under it the side rail (every page but Discover,
 * tablet and up) beside the page, which scrolls internally; the phone tab bar; the concierge
 * launcher on Discover; and the app dialogs. Each route change fades the page in. Until the
 * traveler has been through onboarding, it covers the app on every screen size (the app is
 * inert behind it).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { hydrated, user, profile } = useTravelStore();
  const { importOpen, closeImport } = useUiState();
  const discover = pathname === "/";
  const onboarding = hydrated && !!user && !profile.onboarded;

  return (
    <>
      <div className="flex h-full min-h-0 flex-col bg-background text-foreground" inert={onboarding || undefined}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader />
        <div className="flex min-h-0 flex-1">
          {discover ? null : <SideRail />}
          <main id="main-content" key={pathname} className="xp-page-in min-h-0 min-w-0 flex-1">
            {children}
          </main>
        </div>
        <MobileTabBar />
        {discover ? <ConciergeLauncher /> : null}
        <AssistantSettingsDialog />
        <TripPlannerDialog />
        <AddToTripDialog />
        <ImportDialog open={importOpen} onClose={closeImport} />
        <BugReportDialog />
      </div>
      {onboarding ? <OnboardingFlow /> : null}
    </>
  );
}
