"use client";

import type { ReactNode } from "react";
import { CopilotKitProvider } from "@copilotkit/react-core/v2";
import { UiStateProvider } from "@/components/providers/UiState";
import { TravelCopilot } from "@/components/chat/TravelCopilot";

const inspectorEnabled = process.env.NEXT_PUBLIC_COPILOTKIT_INSPECTOR === "true";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <CopilotKitProvider
      runtimeUrl="/api/copilotkit"
      agentId="default"
      enableInspector={inspectorEnabled}
    >
      <UiStateProvider>
        <TravelCopilot />
        {children}
      </UiStateProvider>
    </CopilotKitProvider>
  );
}
