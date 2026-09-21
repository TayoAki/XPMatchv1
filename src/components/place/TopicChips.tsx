"use client";

import clsx from "clsx";
import type { PlaceReview } from "@/lib/places/types";
import { TOPIC_CHIPS, TOPIC_LABEL, type EvidenceTopic } from "@/lib/places/facts";
import { topicCounts } from "@/lib/places/evidence";

/** Review topics with mention counts; tapping one filters the reviews to that topic. */
export function TopicChips({ reviews, active, onSelect }: { reviews: PlaceReview[]; active: EvidenceTopic | null; onSelect: (topic: EvidenceTopic | null) => void }) {
  const counts = topicCounts(reviews);
  const topics = TOPIC_CHIPS.filter((t) => counts[t]);
  if (topics.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="topic-chips">
      {topics.map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={active === t}
          onClick={() => onSelect(active === t ? null : t)}
          className={clsx(
            "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] font-medium transition-colors",
            active === t ? "border-brand bg-brand text-white" : "border-border bg-white hover:bg-surface",
          )}
        >
          {TOPIC_LABEL[t]}
          <span className={clsx("text-[12px]", active === t ? "text-neutral-300" : "text-muted")}>{counts[t]}</span>
        </button>
      ))}
    </div>
  );
}
