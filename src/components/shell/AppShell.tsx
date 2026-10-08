"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
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
import { JOINED_TRIP_KEY } from "@/lib/collab/types";

const noSubscribe = () => () => {};
/** How often the open app checks Updates for what other travelers did. */
const UPDATES_POLL_MS = 45_000;

function readJoinedTrip(): string {
  try {
    return window.sessionStorage.getItem(JOINED_TRIP_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * The signed-in shell: the header on top; under it the side rail (every page but Discover,
 * tablet and up) beside the page, which scrolls internally; the phone tab bar; the concierge
 * launcher on Discover; and the app dialogs. Each route change fades the page in. Until the
 * traveler has been through onboarding, it covers the app on every screen size (the app is
 * inert behind it), except on a trip they just joined from an invite: they came for that trip, and
 * the setup waits until they go anywhere else. While the app is open, Updates refresh in the
 * background so the badge shows what fellow travelers did.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { hydrated, user, profile, refreshUpdates } = useTravelStore();
  const { importOpen, closeImport } = useUiState();
  const discover = pathname === "/";
  const joinedTrip = useSyncExternalStore(noSubscribe, readJoinedTrip, () => "");
  const onboarding = hydrated && !!user && !profile.onboarded && !(joinedTrip && pathname === `/trips/${joinedTrip}`);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    const tick = () => {
      if (document.visibilityState === "visible") void refreshUpdates();
    };
    const timer = setInterval(tick, UPDATES_POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [userId, refreshUpdates]);

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
