"use client";

import { MapPin, MessageCircleQuestion } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { PlaceAnswer } from "@/lib/places/facts";
import type { AskAboutPlaceArgs, Streaming } from "@/lib/travel/schemas";
import { mapActions, useMapView } from "@/lib/map-store";
import { useCardThreadId } from "@/components/map/useRegisterPlaces";
import { EvidenceList } from "@/components/place/EvidenceList";
import { CardShell } from "./shared";

function parse(result?: string): (PlaceAnswer & { place?: { id: string; name: string } }) | { error: string } | null {
  if (!result) return null;
  try {
    return JSON.parse(result) as PlaceAnswer & { place?: { id: string; name: string } };
  } catch {
    return null;
  }
}

/** The review-grounded answer inside the chat, linked to the place's pin when it has one. */
export function PlaceAnswerCard({ args, status, result }: { args: Streaming<AskAboutPlaceArgs>; status: ToolCallStatus; result?: string }) {
  const threadId = useCardThreadId();
  const view = useMapView(threadId);
  const data = parse(result);
  const name = args.name ?? "";
  const pin = view.placeList.find((p) => p.name.toLowerCase() === name.toLowerCase() || (data && "placeId" in data && p.id === data.placeId));

  return (
    <CardShell className="mt-2 max-w-[640px]" data-testid="place-answer-card">
      <div className="px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
              <MessageCircleQuestion className="h-3.5 w-3.5" /> About {name || "this place"}
            </div>
            {args.question ? <div className="mt-1 text-[14px] font-semibold">{args.question}</div> : null}
          </div>
          {pin && threadId ? (
            <button type="button" onClick={() => mapActions.selectPlace(threadId, pin.key)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-surface px-3 text-[13px] font-medium hover:bg-surface-2">
              <MapPin className="h-3.5 w-3.5" /> Map
            </button>
          ) : null}
        </div>
        {status !== ToolCallStatus.Complete ? (
          <p className="mt-2 text-[13px] text-muted">Reading the reviews…</p>
        ) : data && "error" in data ? (
          <p className="mt-2 text-[13px] text-neutral-700">{data.error}</p>
        ) : data ? (
          <>
            <p className="mt-2 text-[15px] text-neutral-900">{data.answer}</p>
            <div className="mt-3">
              <EvidenceList answer={data} compact />
            </div>
          </>
        ) : null}
      </div>
    </CardShell>
  );
}
