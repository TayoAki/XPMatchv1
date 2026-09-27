"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarPlus, Check, Loader2 } from "lucide-react";
import { mapActions } from "@/lib/map-store";
import { useTravelStore } from "@/lib/store";
import { draftTripInput } from "@/lib/recs/itinerary-draft";
import type { ItineraryDraft } from "@/server/itineraries";
import { useCardThreadId } from "@/components/map/useRegisterPlaces";
import { useSendMessage } from "@/components/chat/useSendMessage";

/**
 * "Make itinerary": saves the card's complete itinerary as a trip in one click (no picker, no
 * confirmation), puts it in the chat's trip tray, then turns into "Open itinerary". With no plan
 * to save (a place the catalog cannot fill yet), it asks the concierge to plan the days instead.
 * Two buttons for the same plan (the card and its full view) share `tripId` so both turn.
 */
export function MakeItineraryButton({
  name,
  label,
  getDraft,
  fallbackPrompt,
  tripId,
  onSaved,
  className,
}: {
  name: string;
  label: string;
  getDraft: () => Promise<ItineraryDraft | null>;
  fallbackPrompt: string;
  /** The trip this plan was already saved as, when the parent keeps it. */
  tripId?: string | null;
  onSaved?: (tripId: string) => void;
  className?: string;
}) {
  const { addTrip, planner, profile } = useTravelStore();
  const threadId = useCardThreadId();
  const send = useSendMessage();
  const [state, setState] = useState<{ phase: "idle" | "working" | "failed" } | { phase: "saved"; tripId: string }>({ phase: "idle" });
  const savedId = tripId ?? (state.phase === "saved" ? state.tripId : null);

  if (savedId) {
    return (
      <Link href={`/trips/${savedId}`} aria-label={`Open ${name} itinerary`} className={className}>
        <Check className="h-4 w-4" aria-hidden="true" /> Open itinerary
      </Link>
    );
  }

  const make = async () => {
    if (state.phase === "working") return;
    setState({ phase: "working" });
    try {
      const draft = await getDraft().catch(() => null);
      if (!draft || !draft.days.length) {
        setState({ phase: "idle" });
        void send(fallbackPrompt);
        return;
      }
      const trip = await addTrip(draftTripInput(draft, { name, label, planner, profile }));
      if (threadId) mapActions.setThreadTrip(threadId, trip.id);
      onSaved?.(trip.id);
      setState({ phase: "saved", tripId: trip.id });
    } catch {
      setState({ phase: "failed" });
    }
  };

  const working = state.phase === "working";
  return (
    <button type="button" onClick={make} disabled={working} aria-label={`Make ${name} itinerary`} aria-busy={working || undefined} className={className}>
      {working ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CalendarPlus className="h-4 w-4" aria-hidden="true" />}
      {working ? "Saving…" : state.phase === "failed" ? "Try again" : "Make itinerary"}
    </button>
  );
}
