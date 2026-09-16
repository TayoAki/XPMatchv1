"use client";

import { Sparkles } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { Streaming, UpdateTravelerProfileArgs } from "@/lib/travel/schemas";

export function ProfileUpdatedChip({ args, status }: { args: Streaming<UpdateTravelerProfileArgs>; status: ToolCallStatus }) {
  const fields = Object.entries(args)
    .filter(([, v]) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").toLowerCase()}: ${Array.isArray(v) ? v.join(", ") : String(v)}`);
  return (
    <div className="mt-2 inline-flex max-w-full items-start gap-2 rounded-2xl border border-border bg-surface/70 px-3 py-2 text-[13px]">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-semibold">{status === ToolCallStatus.Complete ? "Preferences remembered" : "Updating your preferences…"}</div>
        {fields.length ? <div className="text-neutral-700">{fields.join(" · ")}</div> : null}
      </div>
    </div>
  );
}
