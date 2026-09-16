"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Chip, Field, TextInput } from "@/components/ui/Field";
import { useTravelStore, type BudgetTier } from "@/lib/store";
import type { TripDetail } from "@/lib/types";

const BUDGETS: { value: BudgetTier; label: string }[] = [
  { value: "budget", label: "Budget" },
  { value: "mid-range", label: "Mid-range" },
  { value: "premium", label: "Premium" },
  { value: "luxury", label: "Luxury" },
];

/** Edit the basics of a trip: title, destination, dates, travelers, budget. */
export function TripDetailsDialog({ trip, onClose, onSaved }: { trip: TripDetail; onClose: () => void; onSaved: (trip: TripDetail) => void }) {
  const { patchTrip } = useTravelStore();
  const [title, setTitle] = useState(trip.title);
  const [destination, setDestination] = useState(trip.destination);
  const [startDate, setStartDate] = useState(trip.startDate ?? "");
  const [endDate, setEndDate] = useState(trip.endDate ?? "");
  const [travelers, setTravelers] = useState(trip.travelers ?? 2);
  const [budgetTier, setBudgetTier] = useState(trip.budgetTier ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const detail = await patchTrip(trip.id, {
        title: title.trim() || trip.title,
        destination: destination.trim() || trip.destination,
        startDate: startDate || null,
        endDate: endDate || null,
        travelers,
        budgetTier: budgetTier || null,
      });
      onSaved(detail);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the trip");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Trip details"
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] text-red-600">{error}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy || !title.trim() || !destination.trim()}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4">
        <Field label="Title">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Destination">
          <TextInput value={destination} onChange={(e) => setDestination(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="From">
            <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="To">
            <TextInput type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Travelers">
          <TextInput type="number" min={1} max={50} value={travelers} onChange={(e) => setTravelers(Math.max(1, Number(e.target.value) || 1))} className="w-24" />
        </Field>
        <div>
          <div className="mb-1.5 text-[13px] font-medium">Budget</div>
          <div className="flex flex-wrap gap-2">
            {BUDGETS.map((b) => (
              <Chip key={b.value} active={budgetTier === b.value} onClick={() => setBudgetTier(budgetTier === b.value ? "" : b.value)}>
                {b.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
