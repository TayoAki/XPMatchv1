"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { PageFrame } from "@/components/PageFrame";
import { Button } from "@/components/ui/Button";
import { Chip, Field, TextInput } from "@/components/ui/Field";
import { useTravelStore, type BudgetTier, type TripPlanner } from "@/lib/store";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { buildPlanPrompt } from "@/components/profile/TripPlannerDialog";

const BUDGETS: BudgetTier[] = ["budget", "mid-range", "premium", "luxury"];

export default function CreatePage() {
  const { planner, updatePlanner } = useTravelStore();
  const send = useSendMessage();
  const [draft, setDraft] = useState<TripPlanner>(planner);
  const set = <K extends keyof TripPlanner>(key: K, value: TripPlanner[K]) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <PageFrame title="Create a trip" description="Give XPMatch the basics and it will plan the rest with you in chat.">
      <form
        className="max-w-xl rounded-3xl border border-border bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.where.trim()) return;
          updatePlanner(draft);
          void send(buildPlanPrompt(draft));
        }}
      >
        <div className="grid gap-4">
          <Field label="Where to?">
            <TextInput value={draft.where} onChange={(e) => set("where", e.target.value)} placeholder="Dallas, Lisbon, somewhere warm…" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="From">
              <TextInput type="date" value={draft.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </Field>
            <Field label="To">
              <TextInput type="date" value={draft.endDate} min={draft.startDate || undefined} onChange={(e) => set("endDate", e.target.value)} />
            </Field>
          </div>
          <Field label="Travelers">
            <TextInput type="number" min={1} max={16} value={draft.travelers} onChange={(e) => set("travelers", Math.max(1, Number(e.target.value) || 1))} className="w-28" />
          </Field>
          <div>
            <div className="mb-1.5 text-[13px] font-medium">Budget</div>
            <div className="flex flex-wrap gap-2">
              {BUDGETS.map((b) => (
                <Chip key={b} active={draft.budgetTier === b} onClick={() => set("budgetTier", draft.budgetTier === b ? "" : b)}>
                  {b}
                </Chip>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={!draft.where.trim()}>
            Start planning <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </PageFrame>
  );
}
