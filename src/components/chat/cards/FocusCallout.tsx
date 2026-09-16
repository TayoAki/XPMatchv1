"use client";

import { Luggage, MapPin } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { FocusMapArgs, Streaming } from "@/lib/travel/schemas";
import { useTravelStore } from "@/lib/store";
import { useUiState } from "@/components/providers/UiState";

/** Rendered when the assistant centers the map on a destination. */
export function FocusCallout({ args, status }: { args: Streaming<FocusMapArgs>; status: ToolCallStatus }) {
  const { updatePlanner, planner } = useTravelStore();
  const { openPlanner } = useUiState();
  const location = args.location?.trim();
  if (!location) return null;
  const name = location.split(",")[0].trim();
  const pending = status !== ToolCallStatus.Complete;

  return (
    <div className="mt-2 rounded-2xl border border-border bg-white p-4 text-[14px] shadow-sm">
      <div className="flex items-center gap-2 font-semibold">
        <MapPin className="h-4 w-4" />
        {pending ? `Finding ${name} on the map…` : `Looks like you're headed to ${name}.`}
      </div>
      <p className="mt-1 text-neutral-700">Create a trip to keep all your travel plans in one place.</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (planner.where !== name) updatePlanner({ where: name });
          openPlanner("when");
        }}
        className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-border bg-white px-4 text-[14px] font-semibold hover:bg-surface disabled:opacity-50"
      >
        <Luggage className="h-4 w-4" /> Create trip
      </button>
    </div>
  );
}
