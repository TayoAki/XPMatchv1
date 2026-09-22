"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Check, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextArea, TextInput } from "@/components/ui/Field";
import { formatDateRange, useTravelStore } from "@/lib/store";
import { mapActions } from "@/lib/map-store";
import { reservationSummary } from "@/lib/reservations/types";
import { useUiState, type AddToTripRequest } from "@/components/providers/UiState";

/**
 * "Add to trip" from cards and place sheets. With trips to choose from it is a picker (the
 * conversation's trip preselected); a traveler with no trip yet gets one created from the
 * destination and the item added in the same step.
 */
export function AddToTripDialog() {
  const { addToTrip } = useUiState();
  return addToTrip ? <AddToTripForm key={`${addToTrip.place?.id ?? addToTrip.booking?.title ?? "item"}-${addToTrip.tripId ?? ""}`} request={addToTrip} /> : null;
}

const NEW = "__new__";

function AddToTripForm({ request }: { request: AddToTripRequest }) {
  const booking = request.booking;
  const place = request.place ?? booking?.place;
  const places = request.places?.length ? request.places : place ? [place] : [];
  const many = places.length > 1;
  const label = booking ? booking.title : (place?.name ?? "this");
  const { trips, addTrip, addTripItem } = useTravelStore();
  const { closeAddToTrip } = useUiState();
  const today = new Date().toISOString().slice(0, 10);
  const options = useMemo(
    () =>
      [...trips]
        .filter((t) => t.role !== "viewer")
        .sort((a, b) => {
          const aPast = !!a.endDate && a.endDate < today;
          const bPast = !!b.endDate && b.endDate < today;
          if (aPast !== bPast) return aPast ? 1 : -1;
          return (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999");
        }),
    [trips, today],
  );
  const destination = booking?.city || (place ? (place.kind === "destination" ? place.name : place.locality?.split(",")[0]?.trim() || place.name) : "your destination");
  const [choice, setChoice] = useState<string>(request.tripId && options.some((t) => t.id === request.tripId) ? request.tripId : options[0]?.id ?? NEW);
  const [newTitle, setNewTitle] = useState(`Trip to ${destination}`);
  const [note, setNote] = useState(request.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ tripId: string; title: string } | null>(null);
  // No trip yet: skip the picker, create one for the destination and add in one step.
  const draft = options.length === 0;
  const started = useRef(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      let tripId = choice;
      let title = options.find((t) => t.id === choice)?.title ?? "";
      if (choice === NEW) {
        const created = await addTrip({ title: newTitle.trim() || `Trip to ${destination}`, destination });
        tripId = created.id;
        title = created.title;
      }
      if (request.threadId) mapActions.setThreadTrip(request.threadId, tripId);
      if (booking) {
        await addTripItem(tripId, {
          kind: "booking",
          title: booking.title,
          note: [reservationSummary(booking), note.trim()].filter(Boolean).join(" · "),
          url: booking.place?.googleMapsUri,
          place: booking.place,
          details: booking,
        });
      } else {
        for (const p of places) {
          await addTripItem(tripId, {
            kind: "idea",
            title: p.name,
            note: note.trim(),
            url: p.googleMapsUri,
            place: p,
          });
        }
      }
      setDone({ tripId, title });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this place");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!draft || started.current) return;
    started.current = true;
    void submit();
    // Runs once, when the dialog opens for a traveler without trips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  if (draft && !done) {
    return (
      <Modal
        open
        onClose={closeAddToTrip}
        title="Adding to a new trip"
        footer={
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-red-600">{error}</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeAddToTrip}>
                Cancel
              </Button>
              {error ? <Button onClick={submit}>Try again</Button> : null}
            </div>
          </div>
        }
      >
        <p className="text-[14px] text-neutral-700" aria-live="polite">
          {error ? "That did not go through." : `Creating "${newTitle}" and adding ${many ? `${places.length} places` : label}…`}
        </p>
      </Modal>
    );
  }

  if (done) {
    return (
      <Modal
        open
        onClose={closeAddToTrip}
        title="Added to your trip"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={closeAddToTrip}>
              Done
            </Button>
            <Link href={`/trips/${done.tripId}`} onClick={closeAddToTrip} className="inline-flex h-10 items-center rounded-full bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover">
              Open trip
            </Link>
          </div>
        }
      >
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-[14px] text-emerald-800">
          <Check className="h-5 w-5" />
          <span>
            <span className="font-semibold">{many ? `${places.length} places` : label}</span> {many ? "are" : "is"} now in the {booking ? "bookings" : "ideas"} for <span className="font-semibold">{done.title}</span>.
          </span>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={closeAddToTrip}
      title="Add to trip"
      description={
        booking ? reservationSummary(booking) : many ? `${places.length} places: ${places.map((p) => p.name).join(", ")}` : [place?.name, place?.locality].filter(Boolean).join(" · ")
      }
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] text-red-600">{error}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={closeAddToTrip}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy || (choice === NEW && !newTitle.trim())}>
              {busy ? "Adding…" : "Add"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-2" role="radiogroup" aria-label="Choose a trip">
        {options.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={choice === t.id}
            onClick={() => setChoice(t.id)}
            className={clsx(
              "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
              choice === t.id ? "border-brand bg-surface" : "border-border hover:bg-surface",
            )}
          >
            <span className={clsx("flex h-5 w-5 items-center justify-center rounded-full border", choice === t.id ? "border-brand bg-brand text-white" : "border-neutral-400")}>
              {choice === t.id ? <Check className="h-3 w-3" /> : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{t.title}</span>
              <span className="block truncate text-[12px] text-muted">{[t.destination, formatDateRange(t.startDate, t.endDate)].filter(Boolean).join(" · ")}</span>
            </span>
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={choice === NEW}
          onClick={() => setChoice(NEW)}
          className={clsx(
            "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
            choice === NEW ? "border-brand bg-surface" : "border-dashed border-border hover:bg-surface",
          )}
        >
          <span className={clsx("flex h-5 w-5 items-center justify-center rounded-full border", choice === NEW ? "border-brand bg-brand text-white" : "border-neutral-400")}>
            {choice === NEW ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          </span>
          <span className="text-[15px] font-medium">New trip</span>
        </button>
        {choice === NEW ? <TextInput value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Trip title" aria-label="New trip title" /> : null}
      </div>
      <div className="mt-4">
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this place? (optional)" aria-label="Note" className="min-h-[64px]" />
      </div>
    </Modal>
  );
}
