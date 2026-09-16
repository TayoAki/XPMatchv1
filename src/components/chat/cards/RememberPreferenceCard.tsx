"use client";

import { useState } from "react";
import { Brain, Check } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { RememberPreferenceArgs, Streaming } from "@/lib/travel/schemas";
import { DOMAIN_LABEL, useTravelStore } from "@/lib/store";
import { useHitlPendingMarker } from "@/lib/hitl-store";
import { useTripScope } from "@/components/trips/TripScope";
import { Button } from "@/components/ui/Button";
import { Tag } from "./shared";

interface Props {
  args: Streaming<RememberPreferenceArgs>;
  status: ToolCallStatus;
  result?: string;
  toolCallId: string;
  respond?: (result: unknown) => Promise<void>;
}

function parseResult(result?: string): { saved?: boolean; scope?: string } {
  if (!result) return {};
  try {
    return JSON.parse(result) as { saved?: boolean; scope?: string };
  } catch {
    return {};
  }
}

const POLARITY_LABEL = { like: "Likes", dislike: "Avoids", dealbreaker: "Dealbreaker" } as const;

/**
 * "Remember that you …?" — nothing is stored until the traveler picks Always
 * (profile-wide), For this trip (only inside a trip chat) or No thanks.
 */
export function RememberPreferenceCard({ args, status, result, toolCallId, respond }: Props) {
  const { addPreference } = useTravelStore();
  const tripId = useTripScope();
  const [busy, setBusy] = useState(false);
  const outcome = parseResult(result);
  useHitlPendingMarker(toolCallId, status);
  const canRespond = status === ToolCallStatus.Executing && !!respond;
  const statement = args.statement?.trim();

  const choose = async (scope: "always" | "trip" | "no") => {
    if (!respond || !statement) return;
    setBusy(true);
    try {
      if (scope === "no") {
        await respond({ saved: false, scope, note: "Traveler declined; do not bring it up again this conversation." });
        return;
      }
      await addPreference({
        statement,
        domain: args.domain ?? "general",
        polarity: args.polarity ?? "like",
        source: "chat",
        tripId: scope === "trip" ? tripId : null,
      });
      await respond({ saved: true, scope, note: scope === "trip" ? "Remembered for this trip only. Acknowledge in one short sentence." : "Remembered for every trip. Acknowledge in one short sentence." });
    } catch (err) {
      console.error("XPMatch: saving preference failed", err);
      await respond({ saved: false, scope, note: "Saving failed on the server; apologize briefly." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 max-w-[520px] rounded-2xl border border-border bg-white p-4 text-[14px] shadow-sm" data-testid="remember-card">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface">
          <Brain className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">
            {status === ToolCallStatus.Complete
              ? outcome.saved
                ? `Remembered${outcome.scope === "trip" ? " for this trip" : ""}`
                : "Not remembered"
              : "Remember this?"}
          </div>
          <p className="mt-0.5 text-neutral-700">{statement ?? "…"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {args.domain ? <Tag>{DOMAIN_LABEL[args.domain]}</Tag> : null}
            {args.polarity ? <Tag tone={args.polarity === "dealbreaker" ? "warn" : args.polarity === "like" ? "accent" : "neutral"}>{POLARITY_LABEL[args.polarity]}</Tag> : null}
          </div>
          {canRespond ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => choose("always")} disabled={busy || !statement}>
                <Check className="h-4 w-4" /> Always
              </Button>
              {tripId ? (
                <Button size="sm" variant="outline" onClick={() => choose("trip")} disabled={busy || !statement}>
                  For this trip
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => choose("no")} disabled={busy}>
                No thanks
              </Button>
            </div>
          ) : null}
          {status === ToolCallStatus.Complete ? (
            <p className="mt-2 text-[12px] text-muted">{outcome.saved ? "Manage what XPMatch remembers under Update my assistant." : "You can turn these offers off under Update my assistant."}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
