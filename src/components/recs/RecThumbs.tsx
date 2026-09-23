"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { ThumbsDown, ThumbsUp, X } from "lucide-react";
import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { useTravelStore } from "@/lib/store";
import { recKey, type MatchResult } from "@/lib/match";
import { REC_MISS_REASONS, type RecContext } from "@/lib/recs/types";
import { Floating } from "@/components/ui/Floating";

export interface RecThumbsProps {
  name?: string;
  kind: PlaceKind;
  place?: ResolvedPlace | null;
  destination?: string;
  context: RecContext;
  /** The score the traveler saw, stored with the judgment for calibration. */
  match?: MatchResult | null;
  size?: "sm" | "md";
  /** Spelled out ("Good fit" / "Not a fit") where there is room, as in a place's own panel. */
  labeled?: boolean;
  className?: string;
}

/**
 * "Did we get this right?" thumbs on a recommendation. Up records at once. Down
 * first asks why (one chip) and records when the traveler answers or dismisses
 * the panel, so a card in a row stays put while they read it and only then
 * slides to the end. The same thumb again undoes the judgment. Judgments are
 * stored per place and teach the match model which factors to trust for this
 * traveler.
 */
export function RecThumbs({ name, kind, place, destination, context, match, size = "md", labeled = false, className }: RecThumbsProps) {
  const { recFeedback, recordRecFeedback, removeRecFeedback } = useTravelStore();
  // While the "What is off?" panel is open the thumbs-down is pending, not yet recorded.
  const [askWhy, setAskWhy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  if (!name) return null;
  const key = recKey(name, place);
  const current = recFeedback.find((f) => f.placeId === key);
  const verdict = current?.verdict;

  const record = (next: "up" | "down", reason: string | null) =>
    void recordRecFeedback({
      placeId: key,
      name,
      kind,
      destination,
      place,
      context,
      verdict: next,
      score: match?.score ?? null,
      factors: match?.factors ?? [],
      reason: next === "down" ? reason : null,
    }).catch(() => undefined);

  const judge = (next: "up" | "down") => {
    if (next === "down") {
      if (askWhy) {
        setAskWhy(false);
        return;
      }
      if (verdict === "down") {
        if (current) removeRecFeedback(current.id);
        return;
      }
      setAskWhy(true);
      return;
    }
    setAskWhy(false);
    if (verdict === "up") {
      if (current) removeRecFeedback(current.id);
      return;
    }
    record("up", null);
  };

  const answer = (reason: string) => {
    record("down", reason);
    setAskWhy(false);
  };

  // Closing the panel without a reason still stands as a miss.
  const dismiss = () => {
    if (!askWhy) return;
    record("down", null);
    setAskWhy(false);
  };

  const btn = (which: "up" | "down") => {
    const Icon = which === "up" ? ThumbsUp : ThumbsDown;
    const active = verdict === which || (which === "down" && askWhy);
    const text = which === "up" ? "Good fit" : "Not a fit";
    return (
      <button
        type="button"
        aria-pressed={active}
        aria-label={labeled ? `${text}: ${name}` : which === "up" ? `Good pick: ${name}` : `Miss: ${name}`}
        title={labeled ? undefined : which === "up" ? "Good pick" : "Not for me"}
        onClick={() => judge(which)}
        className={clsx(
          "inline-flex items-center justify-center rounded-full border transition-[background-color,border-color,color,transform] duration-200 active:scale-90",
          labeled
            ? "h-8 gap-1.5 px-3 text-[13px] font-semibold pointer-coarse:h-10"
            : // Touch screens get a 36px target either way.
              size === "sm"
              ? "h-6 w-6 pointer-coarse:h-9 pointer-coarse:w-9"
              : "h-7 w-7 pointer-coarse:h-9 pointer-coarse:w-9",
          active ? (which === "up" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-rose-300 bg-rose-50 text-rose-700") : "border-border bg-white text-neutral-500 hover:bg-surface hover:text-foreground",
        )}
      >
        <Icon className={size === "sm" && !labeled ? "h-3 w-3" : "h-3.5 w-3.5"} />
        {labeled ? text : null}
      </button>
    );
  };

  return (
    <div ref={rootRef} className={clsx("relative inline-flex items-center gap-1", labeled && "gap-1.5", className)} data-testid="rec-thumbs" data-verdict={verdict ?? ""}>
      {size === "md" && !labeled ? <span className="mr-0.5 text-[11px] text-muted">Right for you?</span> : null}
      {btn("up")}
      {btn("down")}
      {verdict === "down" && current?.reason && !askWhy ? <span className="ml-0.5 text-[11px] text-muted">{current.reason}</span> : null}
      <Floating anchor={rootRef} open={askWhy} onClose={dismiss} label={labeled ? `Why isn't ${name} a fit?` : `Why is ${name} a miss?`} width={260}>
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-semibold">What is off?</div>
          <button type="button" onClick={dismiss} aria-label="Close" className="rounded-full p-1 text-neutral-500 hover:bg-surface">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {REC_MISS_REASONS.map((reason) => (
            <button key={reason} type="button" onClick={() => answer(reason)} className="rounded-full border border-border bg-white px-2.5 py-1 text-[12px] font-medium hover:bg-surface">
              {reason}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted">Thanks — XPMatch weighs its next picks with this.</p>
      </Floating>
    </div>
  );
}
