"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Chip, Field, TextInput } from "@/components/ui/Field";
import { useTravelStore, type BudgetTier, type TripPlanner } from "@/lib/store";
import { useUiState } from "@/components/providers/UiState";
import { useSendMessage } from "@/components/chat/useSendMessage";

const BUDGETS: { value: BudgetTier; label: string }[] = [
  { value: "budget", label: "Budget" },
  { value: "mid-range", label: "Mid-range" },
  { value: "premium", label: "Premium" },
  { value: "luxury", label: "Luxury" },
];

export function buildPlanPrompt(p: TripPlanner): string {
  const parts = [`Plan a trip to ${p.where.trim()}`];
  if (p.startDate && p.endDate) parts.push(`from ${p.startDate} to ${p.endDate}`);
  else if (p.startDate) parts.push(`starting ${p.startDate}`);
  parts.push(`for ${p.travelers} ${p.travelers === 1 ? "traveler" : "travelers"}`);
  if (p.budgetTier) parts.push(`with a ${p.budgetTier} budget`);
  return `${parts.join(" ")}. Start with the best area to stay and a few hotel options, then the top things to do, and offer to create the trip.`;
}

export function TripPlannerDialog() {
  const { plannerOpen } = useUiState();
  return plannerOpen ? <TripPlannerForm /> : null;
}

function TripPlannerForm() {
  const { planner, updatePlanner } = useTravelStore();
  const { plannerTab, closePlanner } = useUiState();
  const send = useSendMessage();
  const [draft, setDraft] = useState<TripPlanner>(() => planner);

  const set = <K extends keyof TripPlanner>(key: K, value: TripPlanner[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const saveOnly = () => {
    updatePlanner(draft);
    closePlanner();
  };

  const startPlanning = () => {
    updatePlanner(draft);
    closePlanner();
    void send(buildPlanPrompt(draft));
  };

  return (
    <Modal
      open
      onClose={closePlanner}
      title="Create a trip"
      description="Set the basics and XPMatch will build the plan with you in chat."
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={saveOnly}>
            Save details
          </Button>
          <Button onClick={startPlanning} disabled={!draft.where.trim()}>
            Start planning <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <Field label="Where">
          <TextInput
            value={draft.where}
            onChange={(e) => set("where", e.target.value)}
            placeholder="Dallas, Lisbon, anywhere warm…"
            autoFocus={plannerTab === "where"}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="From">
            <TextInput type="date" value={draft.startDate} onChange={(e) => set("startDate", e.target.value)} autoFocus={plannerTab === "when"} />
          </Field>
          <Field label="To">
            <TextInput type="date" value={draft.endDate} min={draft.startDate || undefined} onChange={(e) => set("endDate", e.target.value)} />
          </Field>
        </div>
        <Field label="Who">
          <div className="flex items-center gap-3">
            <TextInput
              type="number"
              min={1}
              max={16}
              value={draft.travelers}
              onChange={(e) => set("travelers", Math.max(1, Number(e.target.value) || 1))}
              className="w-24"
              autoFocus={plannerTab === "who"}
            />
            <span className="text-sm text-muted">{draft.travelers === 1 ? "traveler" : "travelers"}</span>
          </div>
        </Field>
        <div>
          <div className="mb-1.5 text-[13px] font-medium">Budget</div>
          <div className="flex flex-wrap gap-2">
            {BUDGETS.map((b) => (
              <Chip key={b.value} active={draft.budgetTier === b.value} onClick={() => set("budgetTier", draft.budgetTier === b.value ? "" : b.value)}>
                {b.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
