"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronUp, Sparkles } from "lucide-react";
import { useUiState } from "@/components/providers/UiState";

/**
 * The floating "Your AI concierge" pill: opens the conversation from Discover and the content
 * pages (scoped to the trip whose page is open). Not shown on the chat itself, on phones (the
 * Concierge tab carries it) or while a dialog or sheet is open.
 */
export function ConciergeLauncher() {
  const pathname = usePathname();
  const { assistantOpen, plannerOpen, addToTrip, bugReportOpen, importOpen, boardSheetTripId } = useUiState();
  if (pathname === "/chat" || pathname.startsWith("/chat/")) return null;
  if (assistantOpen || plannerOpen || addToTrip || bugReportOpen || importOpen || boardSheetTripId) return null;
  const tripId = pathname.match(/^\/trips\/([^/?#]+)/)?.[1];
  const href = tripId ? `/chat?trip=${encodeURIComponent(tripId)}` : "/chat";
  return (
    <Link
      href={href}
      data-testid="concierge-launcher"
      className="fixed bottom-[calc(18px+env(safe-area-inset-bottom))] right-[18px] z-40 hidden h-[46px] items-center gap-2 rounded-full bg-brand pl-4 pr-3 text-[14px] font-medium text-white shadow-floating transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:inline-flex"
    >
      <Sparkles className="h-4 w-4" aria-hidden="true" />
      Your AI concierge
      <ChevronUp className="h-4 w-4 opacity-80" aria-hidden="true" />
    </Link>
  );
}
