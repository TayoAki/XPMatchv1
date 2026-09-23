"use client";

import clsx from "clsx";
import { CalendarDays, MapPin, Users, Wallet } from "lucide-react";
import { formatDateRange, useTravelStore } from "@/lib/store";
import { useMapView } from "@/lib/map-store";
import { useUiState, type PlannerTab } from "@/components/providers/UiState";

const BUDGET_LABEL: Record<string, string> = {
  budget: "Budget",
  "mid-range": "Mid-range",
  premium: "Premium",
  luxury: "Luxury",
};

/**
 * The trip planner values as one row of chips under the chat composer: "Charleston · When ·
 * 2 travelers · Budget". A set value reads bold; an unset one shows its label. Each chip opens
 * the Create a trip dialog on that field. Phones scroll the row sideways.
 */
export function PlannerChips({ className }: { className?: string }) {
  const { planner } = useTravelStore();
  const { focus } = useMapView();
  const { openPlanner } = useUiState();
  // This chat's own destination (where its map is focused) comes first, then the Where the traveler
  // set. A new chat starts without the last chat's city.
  const where = (focus?.name ?? "").trim() || planner.where.trim();

  const chips: { tab: PlannerTab; label: string; value?: string; icon: typeof MapPin }[] = [
    { tab: "where", label: "Where", value: where || undefined, icon: MapPin },
    { tab: "when", label: "When", value: formatDateRange(planner.startDate, planner.endDate) || undefined, icon: CalendarDays },
    {
      tab: "who",
      label: "Who",
      // Travelers defaults to 2, so only surface it once a trip is actually being planned.
      value: where && planner.travelers ? `${planner.travelers} ${planner.travelers === 1 ? "traveler" : "travelers"}` : undefined,
      icon: Users,
    },
    { tab: "budget", label: "Budget", value: planner.budgetTier ? BUDGET_LABEL[planner.budgetTier] : undefined, icon: Wallet },
  ];

  return (
    <div className={clsx("xp-no-scrollbar flex items-center gap-2 overflow-x-auto", className)} data-testid="planner-chips" aria-label="Trip planner">
      {chips.map((chip) => {
        const Icon = chip.icon;
        return (
          <button
            key={chip.tab}
            type="button"
            onClick={() => openPlanner(chip.tab)}
            title={chip.value ? `${chip.label}: ${chip.value}` : `Set ${chip.label.toLowerCase()}`}
            className={clsx(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-all duration-200 hover:-translate-y-px hover:bg-surface active:translate-y-0 active:scale-[0.98]",
              chip.value ? "border-brand/30 bg-brand-soft font-semibold text-brand" : "border-border bg-white font-medium text-muted",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            <span className="max-w-[180px] truncate">{chip.value ?? chip.label}</span>
          </button>
        );
      })}
    </div>
  );
}
