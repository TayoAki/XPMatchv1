"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Meh, SmilePlus, ThumbsDown, ThumbsUp, X } from "lucide-react";
import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { useTravelStore } from "@/lib/store";
import { findFeedback, reasonChips, VERDICT_LABEL, type FeedbackSource, type FeedbackVerdict, type PlaceFeedback } from "@/lib/feedback/types";
import { useTripScope } from "@/components/trips/TripScope";

export interface ReactionTarget {
  name?: string;
  kind: PlaceKind;
  place?: ResolvedPlace;
  destination?: string;
  tripId?: string | null;
  source?: FeedbackSource;
}

/** The traveler's reaction to one place, with record and remove bound to it. */
export function useReaction(target: ReactionTarget) {
  const { feedback, recordFeedback, removeFeedback } = useTravelStore();
  const tripScope = useTripScope();
  const current: PlaceFeedback | undefined = findFeedback(feedback, target.name, target.place);
  const record = (verdict: FeedbackVerdict, extra: { reasons?: string[]; note?: string; source?: FeedbackSource; score?: number | null } = {}) => {
    if (!target.name) return Promise.resolve(undefined);
    return recordFeedback({
      name: target.name,
      kind: target.kind,
      place: target.place,
      destination: target.destination,
      tripId: target.tripId === undefined ? tripScope : target.tripId,
      verdict,
      reasons: extra.reasons ?? (current?.verdict === verdict ? current.reasons : []),
      note: extra.note ?? current?.note ?? "",
      source: extra.source ?? target.source ?? "card",
      score: extra.score,
    });
  };
  const remove = () => {
    if (current) removeFeedback(current.id);
  };
  return { current, record, remove };
}

const VERDICT_ICON: Record<FeedbackVerdict, typeof ThumbsUp> = { loved: ThumbsUp, fine: Meh, disliked: ThumbsDown };
const VERDICT_TONE: Record<FeedbackVerdict, string> = {
  loved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  fine: "bg-surface text-neutral-700 border-border",
  disliked: "bg-rose-50 text-rose-700 border-rose-200",
};

/**
 * "Loved it / It was fine / Not for me" with reason chips and a note. The
 * verdict saves on click; chips and the note update the same reaction.
 */
export function ReactionControl({ className, size = "md", ...target }: ReactionTarget & { className?: string; size?: "sm" | "md" | "lg" }) {
  const { current, record, remove } = useReaction(target);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(current?.note ?? "");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!target.name) return null;
  const name = target.name;
  const verdict = current?.verdict;
  const Icon = verdict ? VERDICT_ICON[verdict] : SmilePlus;
  const chips = verdict ? reasonChips(target.kind, verdict) : [];

  const toggleReason = (label: string) => {
    if (!verdict) return;
    const reasons = current?.reasons.includes(label) ? current.reasons.filter((r) => r !== label) : [...(current?.reasons ?? []), label];
    void record(verdict, { reasons });
  };

  const openPanel = () => {
    setNote(current?.note ?? "");
    setOpen(true);
  };

  const done = () => {
    if (verdict && note.trim() !== (current?.note ?? "")) void record(verdict, { note: note.trim() });
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={clsx("relative", className)} data-testid="reaction-control">
      <button
        type="button"
        onClick={open ? done : openPanel}
        aria-expanded={open}
        aria-label={verdict ? `Your reaction to ${name}: ${VERDICT_LABEL[verdict]}` : `Rate ${name}`}
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors",
          size === "sm" ? "h-7 px-2.5 text-[12px]" : size === "lg" ? "h-11 px-4 text-[14px] font-semibold" : "h-8 px-3 text-[13px]",
          verdict ? VERDICT_TONE[verdict] : "border-border bg-white hover:bg-surface",
        )}
      >
        <Icon className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} />
        {verdict ? VERDICT_LABEL[verdict] : "Rate"}
        {verdict && current?.reasons.length && size !== "sm" ? <span className="text-[12px] opacity-80">· {current.reasons.slice(0, 2).join(", ")}</span> : null}
      </button>
      {open ? (
        <div role="dialog" aria-label={`Rate ${name}`} className={clsx("absolute z-30 w-[300px] rounded-2xl border border-border bg-white p-3 text-left shadow-xl", size === "lg" ? "right-0 top-12" : "left-0 top-9")}>
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold">How was {name}?</div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close rating" className="rounded-full p-1 text-neutral-500 hover:bg-surface">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {(["loved", "fine", "disliked"] as FeedbackVerdict[]).map((v) => {
              const VIcon = VERDICT_ICON[v];
              const active = verdict === v;
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={active}
                  onClick={() => void record(v, { reasons: active ? current?.reasons : [] })}
                  className={clsx(
                    "flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[12px] font-medium",
                    active ? VERDICT_TONE[v] : "border-border hover:bg-surface",
                  )}
                >
                  <VIcon className="h-4 w-4" /> {VERDICT_LABEL[v]}
                </button>
              );
            })}
          </div>
          {verdict ? (
            <>
              <div className="mt-3 text-[12px] font-semibold text-neutral-600">{verdict === "disliked" ? "What went wrong?" : "What stood out?"}</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {chips.map((chip) => {
                  const on = current?.reasons.includes(chip.label) ?? false;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleReason(chip.label)}
                      className={clsx("rounded-full border px-2.5 py-1 text-[12px] font-medium", on ? "border-neutral-900 bg-neutral-900 text-white" : "border-border bg-white hover:bg-surface")}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything to remember? (optional)"
                aria-label={`Note about ${name}`}
                rows={2}
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-[13px] outline-none focus:border-neutral-900"
              />
              <div className="mt-2 flex items-center justify-between">
                <button type="button" onClick={() => { remove(); setOpen(false); }} className="text-[12px] text-neutral-500 underline-offset-2 hover:underline">
                  Remove reaction
                </button>
                <button type="button" onClick={done} className="h-8 rounded-full bg-neutral-900 px-3 text-[13px] font-semibold text-white hover:bg-neutral-800">
                  Done
                </button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-[12px] text-muted">Pick one; you can add why afterwards. Reactions shape what XPMatch suggests next.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Stand-in for a card the traveler marked "Not for me". */
export function HiddenPlaceCard({ name, feedbackId, className }: { name: string; feedbackId: string; className?: string }) {
  const { removeFeedback } = useTravelStore();
  return (
    <div className={clsx("flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-surface/60 px-4 py-3 text-[13px] text-neutral-600", className)} data-testid="hidden-place">
      <span>
        <ThumbsDown className="mr-1.5 inline h-3.5 w-3.5" />
        {name} hidden · not for you
      </span>
      <button type="button" onClick={() => removeFeedback(feedbackId)} className="font-semibold underline-offset-2 hover:underline">
        Undo
      </button>
    </div>
  );
}
