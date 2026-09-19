"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ThumbsDown, ThumbsUp, X } from "lucide-react";
import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { useTravelStore } from "@/lib/store";
import { recKey, type MatchResult } from "@/lib/match";
import { REC_MISS_REASONS, type RecContext } from "@/lib/recs/types";

export interface RecThumbsProps {
  name?: string;
  kind: PlaceKind;
  place?: ResolvedPlace | null;
  destination?: string;
  context: RecContext;
  /** The score the traveler saw, stored with the judgment for calibration. */
  match?: MatchResult | null;
  size?: "sm" | "md";
  className?: string;
}

/**
 * "Did we get this right?" thumbs on a recommendation. Up records at once;
 * down records at once and asks why (one chip). The judgment is stored per
 * place and teaches the match model which factors to trust for this traveler.
 */
export function RecThumbs({ name, kind, place, destination, context, match, size = "md", className }: RecThumbsProps) {
  const { recFeedback, recordRecFeedback, removeRecFeedback } = useTravelStore();
  const [askWhy, setAskWhy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!askWhy) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setAskWhy(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [askWhy]);

  if (!name) return null;
  const key = recKey(name, place);
  const current = recFeedback.find((f) => f.placeId === key);
  const verdict = current?.verdict;

  const judge = (next: "up" | "down", reason?: string) => {
    if (verdict === next && !reason) {
      if (current) removeRecFeedback(current.id);
      setAskWhy(false);
      return;
    }
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
      reason: next === "down" ? (reason ?? current?.reason ?? null) : null,
    }).catch(() => undefined);
    setAskWhy(next === "down" && !reason);
  };

  const btn = (which: "up" | "down") => {
    const Icon = which === "up" ? ThumbsUp : ThumbsDown;
    const active = verdict === which;
    return (
      <button
        type="button"
        aria-pressed={active}
        aria-label={which === "up" ? `Good pick: ${name}` : `Miss: ${name}`}
        title={which === "up" ? "Good pick" : "Not for me"}
        onClick={() => judge(which)}
        className={clsx(
          "inline-flex items-center justify-center rounded-full border transition-colors",
          // Touch screens get a 36px target either way.
          size === "sm" ? "h-6 w-6 pointer-coarse:h-9 pointer-coarse:w-9" : "h-7 w-7 pointer-coarse:h-9 pointer-coarse:w-9",
          active ? (which === "up" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-rose-300 bg-rose-50 text-rose-700") : "border-border bg-white text-neutral-500 hover:bg-surface hover:text-foreground",
        )}
      >
        <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      </button>
    );
  };

  return (
    <div ref={rootRef} className={clsx("relative inline-flex items-center gap-1", className)} data-testid="rec-thumbs" data-verdict={verdict ?? ""}>
      {size === "md" ? <span className="mr-0.5 text-[11px] text-muted">Right for you?</span> : null}
      {btn("up")}
      {btn("down")}
      {verdict === "down" && current?.reason && !askWhy ? <span className="ml-0.5 text-[11px] text-muted">{current.reason}</span> : null}
      {askWhy ? (
        <div role="dialog" aria-label={`Why is ${name} a miss?`} className="absolute left-0 top-8 z-30 w-[260px] rounded-2xl border border-border bg-white p-3 text-left shadow-xl">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold">What is off?</div>
            <button type="button" onClick={() => setAskWhy(false)} aria-label="Close" className="rounded-full p-1 text-neutral-500 hover:bg-surface">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REC_MISS_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                aria-pressed={current?.reason === reason}
                onClick={() => judge("down", reason)}
                className={clsx("rounded-full border px-2.5 py-1 text-[12px] font-medium", current?.reason === reason ? "border-neutral-900 bg-neutral-900 text-white" : "border-border bg-white hover:bg-surface")}
              >
                {reason}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">Thanks — XPMatch weighs its next picks with this.</p>
        </div>
      ) : null}
    </div>
  );
}
