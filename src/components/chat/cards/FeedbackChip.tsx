"use client";

import { Meh, ThumbsDown, ThumbsUp } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { RecordFeedbackArgs, Streaming } from "@/lib/travel/schemas";
import { VERDICT_LABEL } from "@/lib/feedback/types";

/** Small chip rendered when the assistant records a reaction said in chat. */
export function FeedbackChip({ args, status }: { args: Partial<RecordFeedbackArgs> | RecordFeedbackArgs; status: ToolCallStatus }) {
  const a = args as Streaming<RecordFeedbackArgs>;
  const Icon = a.verdict === "loved" ? ThumbsUp : a.verdict === "disliked" ? ThumbsDown : Meh;
  const reasons = (a.reasons ?? []).filter((r): r is string => typeof r === "string" && r.length > 0);
  return (
    <div className="mt-2 inline-flex max-w-full items-start gap-2 rounded-2xl border border-border bg-surface/70 px-3 py-2 text-[13px]" data-testid="feedback-chip">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-semibold">
          {status === ToolCallStatus.Complete && a.name && a.verdict ? `Noted: ${a.name} · ${VERDICT_LABEL[a.verdict]}` : "Noting your reaction…"}
        </div>
        {reasons.length ? <div className="text-neutral-700">{reasons.join(" · ")}</div> : null}
        <div className="text-[12px] text-muted">Shapes future picks · manage it under Update my assistant › Your taste</div>
      </div>
    </div>
  );
}
