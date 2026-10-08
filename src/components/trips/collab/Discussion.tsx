"use client";

import { useEffect, useRef } from "react";
import { MessageCircle, Send, Users } from "lucide-react";
import type { CollabTarget } from "@/lib/collab/types";
import { stopPinKey } from "@/lib/itinerary";
import type { TripDetail } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { tripItemKey } from "../TripMap";
import { MessageComposer, MessageItem } from "./Comments";
import { markDiscussionSeen, useTripCollab } from "./TripCollab";

/** The map pin for what a comment is about: the stop when the idea is on a day, the idea otherwise. */
function pinKeyFor(trip: TripDetail, target: CollabTarget): string | null {
  const stops = trip.itinerary.flatMap((d) => d.stops);
  if (target.kind === "stop") {
    const stop = stops.find((s) => s.id === target.id);
    return stop?.place ? stopPinKey(stop) : null;
  }
  const scheduled = stops.find((s) => s.itemId === target.id && s.place);
  if (scheduled) return stopPinKey(scheduled);
  const item = trip.items.find((i) => i.id === target.id);
  return item?.place ? tripItemKey(item.id) : null;
}

/**
 * The trip's conversation: everyone on the trip (people giving feedback too) writes here, and
 * comments on ideas and stops show up in the same stream, oldest first, newest by the box.
 */
export function DiscussionSection({
  trip,
  canEdit,
  onSelectPlace,
  onOpenMembers,
}: {
  trip: TripDetail;
  canEdit: boolean;
  onSelectPlace: (key: string | null) => void;
  onOpenMembers?: () => void;
}) {
  const collab = useTripCollab();
  const endRef = useRef<HTMLDivElement>(null);
  const messages = collab?.collab.messages ?? [];
  const latest = messages[messages.length - 1]?.createdAt;

  // What is on screen counts as read; the newest message stays in view as the conversation grows.
  useEffect(() => {
    if (latest) markDiscussionSeen(trip.id, latest);
  }, [trip.id, latest]);
  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  if (!collab) return null;
  const locate = (target: CollabTarget) => {
    const key = pinKeyFor(trip, target);
    if (key) onSelectPlace(key);
  };

  return (
    <div className="grid gap-4" data-testid="trip-discussion">
      {!collab.shared ? (
        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <Users className="h-4 w-4" /> Plan this trip together
          </div>
          <p className="mt-1 text-[13px] text-neutral-700">
            Invite the people you&apos;re traveling with to vote on places, comment and talk it over here. Friends who aren&apos;t coming can give feedback with a link.
          </p>
          {canEdit && onOpenMembers ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={onOpenMembers}>
                <Users className="h-4 w-4" /> Invite people
              </Button>
              <Button size="sm" variant="outline" onClick={onOpenMembers}>
                <Send className="h-4 w-4" /> Get feedback
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-[12px] text-muted">Everyone on the trip sees this, and the assistant reads it when you plan with it.</p>
      )}

      {collab.loaded && messages.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-8 text-center">
          <MessageCircle className="h-5 w-5 text-neutral-500" />
          <p className="text-[14px] text-muted">No messages yet. Say hi, or ask what everyone wants to do.</p>
        </div>
      ) : (
        <ul className="grid gap-3.5" aria-label="Messages" aria-live="polite">
          {messages.map((m) => (
            <MessageItem key={m.id} message={m} me={collab.me} canDelete={m.userId === collab.me || collab.isOwner} onDelete={() => collab.remove(m.id)} onLocate={locate} />
          ))}
        </ul>
      )}
      <div ref={endRef} />
      <MessageComposer label="Message everyone on the trip" placeholder="Write to everyone on the trip…" onSend={(body) => collab.post(body)} />
    </div>
  );
}
