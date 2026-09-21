"use client";

import { useEffect } from "react";
import clsx from "clsx";
import { Columns3, X } from "lucide-react";
import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { COMPARE_LIMIT, compareActions, compareMessage, useCompareSelection, type CompareOption } from "@/lib/compare-store";
import { useCardThreadId } from "@/components/map/useRegisterPlaces";
import { useSendMessage } from "@/components/chat/useSendMessage";

/** "Compare" toggle on a recommendation card. */
export function CompareToggle({ pinKey, name, kind, facts, place }: { pinKey: string; name?: string; kind: PlaceKind; facts: string; place?: ResolvedPlace }) {
  const threadId = useCardThreadId();
  const selection = useCompareSelection(threadId);
  const selected = selection.some((o) => o.key === pinKey);
  const full = !selected && selection.length >= COMPARE_LIMIT;

  // Keep the resolved pin on the selection once it arrives.
  useEffect(() => {
    if (threadId && selected && place) compareActions.update(threadId, pinKey, { place });
  }, [threadId, selected, pinKey, place]);

  if (!name) return null;
  const option: CompareOption = { key: pinKey, name, kind, facts, place };
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={full}
      title={full ? `Compare up to ${COMPARE_LIMIT} at a time` : selected ? "Remove from comparison" : "Add to comparison"}
      onClick={() => threadId && compareActions.toggle(threadId, option)}
      className={clsx(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        selected ? "bg-brand text-white hover:bg-brand-hover" : "bg-surface hover:bg-surface-2",
      )}
    >
      <Columns3 className="h-3.5 w-3.5" /> {selected ? "Comparing" : "Compare"}
    </button>
  );
}

/** Floating bar above the composer while options are selected. */
export function CompareBar({ threadId }: { threadId?: string | null }) {
  const selection = useCompareSelection(threadId);
  const send = useSendMessage();
  if (!threadId || selection.length === 0) return null;
  const ready = selection.length >= 2;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[132px] z-20 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full bg-brand py-1.5 pl-4 pr-1.5 text-[13px] text-white shadow-xl" data-testid="compare-bar">
        <span className="truncate">
          <span className="font-semibold">{selection.length} selected</span>
          <span className="text-neutral-300"> · {selection.map((o) => o.name).join(" · ")}</span>
        </span>
        <button
          type="button"
          disabled={!ready}
          onClick={() => {
            void send(compareMessage(selection));
            compareActions.clear(threadId);
          }}
          className="h-8 rounded-full bg-white px-3 font-semibold text-neutral-900 disabled:opacity-50"
        >
          {ready ? "Compare" : "Pick one more"}
        </button>
        <button type="button" onClick={() => compareActions.clear(threadId)} aria-label="Clear comparison" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
