"use client";

import clsx from "clsx";
import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { EMPTY_TALLY, targetKey, type CollabTarget } from "@/lib/collab/types";
import { useTripCollab } from "./TripCollab";

/**
 * The group's vote on an idea or a stop: for and against with counts, the traveler's own vote
 * filled in, and who voted in the tooltip. Arrows, so it never reads as the personal reaction
 * (thumbs) next to it. Hidden until someone else is on the trip.
 */
export function GroupVote({ target, className }: { target: CollabTarget; className?: string }) {
  const collab = useTripCollab();
  if (!collab?.shared) return null;
  const tally = collab.tallies.get(targetKey(target)) ?? EMPTY_TALLY;
  const name = target.label;
  const who = [tally.upBy.length ? `For: ${tally.upBy.join(", ")}` : "", tally.downBy.length ? `Against: ${tally.downBy.join(", ")}` : ""].filter(Boolean).join(" · ");
  return (
    <div
      role="group"
      aria-label={`Group vote on ${name}`}
      title={who || "Vote so the group (and the assistant) knows what you think"}
      data-collab
      data-testid="group-vote"
      className={clsx("inline-flex h-7 shrink-0 items-center rounded-full border border-border bg-white text-[12px] font-semibold tabular-nums", className)}
    >
      <button
        type="button"
        aria-label={`Vote for ${name}`}
        aria-pressed={tally.mine === 1}
        onClick={() => void collab.vote(target, tally.mine === 1 ? 0 : 1)}
        className={clsx("inline-flex h-full min-w-8 items-center justify-center gap-0.5 rounded-l-full px-1.5 hover:bg-surface pointer-coarse:px-2.5", tally.mine === 1 ? "text-emerald-700" : "text-neutral-600")}
      >
        <ArrowBigUp className="h-4 w-4" fill={tally.mine === 1 ? "currentColor" : "none"} aria-hidden="true" />
        {tally.up ? <span data-testid="votes-for">{tally.up}</span> : null}
      </button>
      <span className="h-4 w-px bg-border" aria-hidden="true" />
      <button
        type="button"
        aria-label={`Vote against ${name}`}
        aria-pressed={tally.mine === -1}
        onClick={() => void collab.vote(target, tally.mine === -1 ? 0 : -1)}
        className={clsx("inline-flex h-full min-w-8 items-center justify-center gap-0.5 rounded-r-full px-1.5 hover:bg-surface pointer-coarse:px-2.5", tally.mine === -1 ? "text-rose-700" : "text-neutral-600")}
      >
        <ArrowBigDown className="h-4 w-4" fill={tally.mine === -1 ? "currentColor" : "none"} aria-hidden="true" />
        {tally.down ? <span data-testid="votes-against">{tally.down}</span> : null}
      </button>
      <span className="sr-only">
        {tally.up} for, {tally.down} against
      </span>
    </div>
  );
}
