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
      if (pathname !== "/") {
        const params = new URLSearchParams({ prompt: trimmed });
        if (tripId) params.set("trip", tripId);
        router.push(`/?${params.toString()}`);
        return;
      }
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
