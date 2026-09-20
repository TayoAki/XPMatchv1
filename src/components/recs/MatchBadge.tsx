"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Sparkles, X } from "lucide-react";
import { useTravelStore } from "@/lib/store";
import { scoreMatch, type MatchCandidate, type MatchResult } from "@/lib/match";

/** The match score for a candidate against the signed-in traveler (null until the store has hydrated). */
export function useMatch(candidate: MatchCandidate | null | undefined): MatchResult | null {
  const { profile, taste, preferences, recFeedback, packageCalibration, hydrated } = useTravelStore();
  return useMemo(() => {
    if (!candidate || !hydrated) return null;
    return scoreMatch(candidate, { profile, taste, preferences, recFeedback, packageCalibration });
  }, [candidate, hydrated, profile, taste, preferences, recFeedback, packageCalibration]);
}

const TONE: Record<MatchResult["label"], string> = {
  "Great match": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Good match": "bg-teal-50 text-teal-800 border-teal-200",
  "Worth a look": "bg-surface text-neutral-700 border-border",
  "Probably not you": "bg-amber-50 text-amber-800 border-amber-200",
};

/** "87% match" pill with a "Why this score" popover listing every reason and its points. */
export function MatchBadge({ match, size = "md", className }: { match: MatchResult; size?: "sm" | "md"; className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={rootRef} className={clsx("relative inline-flex", className)} data-testid="match-badge" data-score={match.score}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${match.score}% match, ${match.label}. Why this score`}
        title="Why this score"
        className={clsx("inline-flex items-center gap-1 rounded-full border font-semibold", size === "sm" ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-[12px]", TONE[match.label])}
      >
        <Sparkles className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} /> {match.score}% match
      </button>
      {open ? (
        <div role="dialog" aria-label="Why this score" className="absolute left-0 top-8 z-30 w-[280px] rounded-2xl border border-border bg-white p-3 text-left shadow-xl">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold">
              {match.score}% · {match.label}
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1 text-neutral-500 hover:bg-surface">
              <X className="h-4 w-4" />
            </button>
          </div>
          {match.reasons.length ? (
            <ul className="mt-2 grid gap-1 text-[12px]">
              {match.reasons.slice(0, 8).map((r, i) => (
                <li key={`${r.factor}-${i}`} className="flex items-start justify-between gap-2">
                  <span className="text-neutral-700">{r.text}</span>
                  <span className={clsx("shrink-0 font-semibold tabular-nums", r.delta > 0 ? "text-emerald-700" : r.delta < 0 ? "text-amber-700" : "text-muted")}>
                    {r.delta > 0 ? `+${r.delta}` : r.delta}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[12px] text-muted">Nothing in your profile speaks for or against this one yet.</p>
          )}
          <p className="mt-2 text-[11px] text-muted">From your profile, tastes and thumbs. Thumbs on picks teach it what to weigh.</p>
        </div>
      ) : null}
    </div>
  );
}
