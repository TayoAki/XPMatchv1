"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import { newId } from "@/lib/store";
import { useTripScope } from "@/components/trips/TripScope";

/**
 * Sends a message into the active chat. When invoked away from the chat page
 * the prompt is carried over in the URL and sent once the chat mounts; inside
 * a trip's scope the new chat is attached to that trip.
 */
export function useSendMessage() {
  const { copilotkit } = useCopilotKit();
  const { agent } = useAgent({ updates: [] });
  const router = useRouter();
  const pathname = usePathname();
  const tripId = useTripScope();

  return useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (pathname !== "/chat") {
        const params = new URLSearchParams({ prompt: trimmed });
        if (tripId) params.set("trip", tripId);
        router.push(`/chat?${params.toString()}`);
        return;
      }
      // Sent from a card or chip while the assistant is still answering: wait for the run to end
      // instead of dropping the message (the composer itself is disabled meanwhile).
      const started = Date.now();
      while (agent.isRunning && Date.now() - started < 30000) await new Promise((r) => setTimeout(r, 150));
      if (agent.isRunning) return;
      agent.addMessage({ id: newId(), role: "user", content: trimmed });
      try {
        await copilotkit.runAgent({ agent });
      } catch (err) {
        console.error("XPMatch: runAgent failed", err);
      }
    },
    [agent, copilotkit, pathname, router, tripId],
  );
}
