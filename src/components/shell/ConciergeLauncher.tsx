"use client";

import Link from "next/link";
import { ChevronUp, Sparkles } from "lucide-react";
import { useUiState } from "@/components/providers/UiState";

/**
 * The floating "Your AI concierge" pill on Discover (the only page without the side rail):
 * opens the conversation. Not shown on phones (the Concierge tab carries it) or while a dialog
 * or sheet is open.
 */
export function ConciergeLauncher() {
  const { assistantOpen, plannerOpen, addToTrip, bugReportOpen, importOpen, boardSheetTripId } = useUiState();
  if (assistantOpen || plannerOpen || addToTrip || bugReportOpen || importOpen || boardSheetTripId) return null;
  return (
    <Link
      href="/chat"
      data-testid="concierge-launcher"
      className="xp-sheet-in fixed bottom-[calc(18px+env(safe-area-inset-bottom))] right-[18px] z-40 hidden h-[46px] items-center gap-2 rounded-full bg-brand pl-4 pr-3 text-[14px] font-medium text-white shadow-floating transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-hover hover:shadow-[0_8px_24px_rgb(8_19_22_/_28%)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:inline-flex"
    >
      <Sparkles className="h-4 w-4" aria-hidden="true" />
      Your AI concierge
      <ChevronUp className="h-4 w-4 opacity-80" aria-hidden="true" />
    </Link>
  );
}
