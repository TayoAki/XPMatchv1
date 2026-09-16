"use client";

import { useEffect, useSyncExternalStore } from "react";
import { ToolCallStatus } from "@copilotkit/core";

/**
 * Which human-in-the-loop tool calls (trip proposals, "remember this?" cards)
 * are still waiting for a click. While any is pending the follow-up suggestions
 * are switched off: a suggestions run would otherwise send the model a tool call
 * without a result, which providers reject.
 */
let pending: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const hitlActions = {
  setPending(toolCallId: string, isPending: boolean) {
    if (!toolCallId || pending.has(toolCallId) === isPending) return;
    const next = new Set(pending);
    if (isPending) next.add(toolCallId);
    else next.delete(toolCallId);
    pending = next;
    emit();
  },
  hasPending: () => pending.size > 0,
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => pending;
const getServerSnapshot = () => pending;

/** True while any human-in-the-loop card is waiting for the traveler. */
export function useHitlPending(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot).size > 0;
}

/**
 * Marks a human-in-the-loop tool call as pending from the moment its card starts
 * streaming (well before the run ends) until it completes or unmounts.
 */
export function useHitlPendingMarker(toolCallId: string, status: ToolCallStatus) {
  const isPending = status !== ToolCallStatus.Complete;
  useEffect(() => {
    hitlActions.setPending(toolCallId, isPending);
    return () => hitlActions.setPending(toolCallId, false);
  }, [toolCallId, isPending]);
}
