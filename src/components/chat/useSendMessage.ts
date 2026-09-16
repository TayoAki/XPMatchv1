"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import { newId } from "@/lib/store";

/**
 * Sends a message into the active chat. When invoked away from the chat page
 * the prompt is carried over in the URL and sent once the chat mounts.
 */
export function useSendMessage() {
  const { copilotkit } = useCopilotKit();
  const { agent } = useAgent({ updates: [] });
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (pathname !== "/") {
        router.push(`/?prompt=${encodeURIComponent(trimmed)}`);
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
    [agent, copilotkit, pathname, router],
  );
}
