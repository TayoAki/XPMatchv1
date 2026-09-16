"use client";

import { Ticket } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { ImportReservationArgs } from "@/lib/travel/schemas";
import type { Reservation } from "@/lib/reservations/types";
import { Skeleton } from "@/components/chat/cards/shared";
import { ReservationCards } from "./ReservationCards";

interface ToolResult {
  reservations?: Reservation[];
  error?: string;
}

function parseResult(result?: string): ToolResult {
  if (!result) return {};
  try {
    return JSON.parse(result) as ToolResult;
  } catch {
    return {};
  }
}

/** Chat rendering of import_reservation: the tool result carries the reservations themselves. */
export function ReservationToolCard({ status, result }: { args: Partial<ImportReservationArgs> | ImportReservationArgs; status: ToolCallStatus; result?: string }) {
  const parsed = parseResult(result);
  if (status !== ToolCallStatus.Complete) {
    return (
      <div className="mt-2 rounded-2xl border border-border bg-surface/70 px-4 py-3 text-[13px]" data-testid="reservation-pending">
        <div className="flex items-center gap-2 font-semibold">
          <Ticket className="h-4 w-4" /> Reading the confirmation…
        </div>
        <Skeleton className="mt-2 h-4 w-2/3" />
      </div>
    );
  }
  if (parsed.error) {
    return (
      <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900" data-testid="reservation-error">
        <div className="font-semibold">Could not read that confirmation</div>
        <p className="mt-1">{parsed.error}</p>
      </div>
    );
  }
  return <ReservationCards reservations={parsed.reservations ?? []} source="text" />;
}
