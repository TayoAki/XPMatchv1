import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers/AppProviders";
import { AppShell } from "@/components/shell/AppShell";

/** Signed-in area: CopilotKit, the user's store and the Mindtrip-style shell. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <AppShell>{children}</AppShell>
    </AppProviders>
  );
}
