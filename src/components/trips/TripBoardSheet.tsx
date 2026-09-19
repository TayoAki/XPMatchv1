"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useUiState } from "@/components/providers/UiState";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useMediaQuery } from "@/lib/use-media-query";
import { TripScopeProvider } from "./TripScope";
import { useTripDetail } from "./useTripDetail";
import { TripMap } from "./TripMap";
import { TripBoard } from "./board/TripBoard";

/**
 * On phones the itinerary board opens as a full-height sheet over the chat (from "Saved to
 * Trips" on a proposal or "Open the board" on a scheduling chip) instead of leaving the
 * conversation: a short map on top, the board under it, and "Open trip" for the full page.
 */
export function TripBoardSheet() {
  const { boardSheetTripId, closeBoardSheet } = useUiState();
  const wide = useMediaQuery("(min-width: 1280px)");
  if (wide || !boardSheetTripId) return null;
  return <BoardSheetInner key={boardSheetTripId} tripId={boardSheetTripId} onClose={closeBoardSheet} />;
}

function BoardSheetInner({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const { trip, error, setTrip } = useTripDetail(tripId);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const header = (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="min-w-0 flex-1 truncate text-[16px] font-semibold">{trip?.title ?? "Your trip"}</div>
      <Link href={`/trips/${encodeURIComponent(tripId)}`} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-surface px-3 text-[13px] font-semibold hover:bg-surface-2">
        Open trip <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
  return (
    <TripScopeProvider tripId={tripId}>
      <BottomSheet open initialSnap="full" onClose={onClose} header={header} label="Itinerary board" testId="trip-board-sheet">
        <div className="xp-scroll h-full min-h-0 overflow-y-auto px-4 pb-6 pt-1">
          {error ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-[14px] text-muted">{error}</p>
          ) : !trip ? (
            <div aria-busy="true">
              <div className="xp-skeleton h-[180px] rounded-3xl" />
              <div className="xp-skeleton mt-4 h-24 rounded-2xl" />
            </div>
          ) : (
            <>
              <div className="mb-4">
                <TripMap trip={trip} selectedKey={selectedKey} onSelect={setSelectedKey} hoveredKey={hoveredKey} onHover={setHoveredKey} className="relative h-[180px] overflow-hidden rounded-3xl" />
              </div>
              <TripBoard trip={trip} canEdit={trip.role !== "viewer"} onTrip={setTrip} onSelectPlace={setSelectedKey} hoveredKey={hoveredKey} onHover={setHoveredKey} />
            </>
          )}
        </div>
      </BottomSheet>
    </TripScopeProvider>
  );
}
