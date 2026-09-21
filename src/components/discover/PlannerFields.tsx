"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { CalendarDays, ChevronDown, MapPin, Minus, Plus, Users, Wallet, type LucideIcon } from "lucide-react";
import { formatDateRange, useTravelStore, type BudgetTier, type TripPlanner } from "@/lib/store";
import type { ResolvedPlace } from "@/lib/places/types";
import { destinationCaption, resolveDestinationOnce } from "@/lib/places/destination-photo";
import { useMediaQuery } from "@/lib/use-media-query";
import { Button } from "@/components/ui/Button";
import { Chip, Field, TextInput } from "@/components/ui/Field";
import { Popover } from "@/components/ui/Popover";
import { BottomSheet } from "@/components/ui/BottomSheet";

type FieldKey = "where" | "when" | "guests" | "budget";

const BUDGETS: { value: BudgetTier; label: string }[] = [
  { value: "budget", label: "Budget" },
  { value: "mid-range", label: "Mid-range" },
  { value: "premium", label: "Premium" },
  { value: "luxury", label: "Luxury" },
];
const BUDGET_LABEL: Record<string, string> = Object.fromEntries(BUDGETS.map((b) => [b.value, b.label]));

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function EditorFooter({ onCancel, onApply, applyDisabled }: { onCancel: () => void; onApply: () => void; applyDisabled?: boolean }) {
  return (
    <div className="mt-4 flex items-center justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={onCancel} data-popover-close>
        Cancel
      </Button>
      <Button size="sm" onClick={onApply} disabled={applyDisabled}>
        Apply
      </Button>
    </div>
  );
}

/** Where: free text with one suggestion from the resolve endpoint, and an "anywhere" clear. */
function WhereEditor({ initial, onApply, onCancel }: { initial: string; onApply: (where: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  const [suggestion, setSuggestion] = useState<{ query: string; place: ResolvedPlace | null } | null>(null);
  const query = useDebounced(value.trim(), 500);
  const id = useId();
  // Three letters and something other than the current value before a lookup is worth its cost.
  const wanted = query.length >= 3 && query.toLowerCase() !== initial.trim().toLowerCase();

  useEffect(() => {
    if (!wanted) return;
    let active = true;
    resolveDestinationOnce(query).then((place) => {
      if (active) setSuggestion({ query, place });
    });
    return () => {
      active = false;
    };
  }, [query, wanted]);

  const current = wanted && suggestion?.query === query ? suggestion : null;
  const loading = wanted && !current;
  const suggested = current?.place ? destinationCaption(current.place, current.place.name) : null;
  const showSuggestion = !!suggested && suggested.toLowerCase() !== value.trim().toLowerCase();

  return (
    <div>
      <Field label="Destination">
        <TextInput value={value} onChange={(e) => setValue(e.target.value)} placeholder="City, region or country" aria-describedby={`${id}-status`} autoComplete="off" />
      </Field>
      <div id={`${id}-status`} className="mt-2 min-h-[36px]" role="status" aria-live="polite">
        {loading ? (
          <p className="text-[13px] text-muted">Looking it up…</p>
        ) : showSuggestion ? (
          <button type="button" onClick={() => setValue(suggested)} className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2 text-left text-[13px] hover:bg-surface">
            <MapPin className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <span className="truncate font-medium">{suggested}</span>
          </button>
        ) : current && !current.place ? (
          <p className="text-[13px] text-muted">No match yet, so it stays as typed.</p>
        ) : null}
      </div>
      <button type="button" onClick={() => setValue("")} className="mt-1 text-[13px] font-medium text-muted underline-offset-2 hover:text-foreground hover:underline">
        I&apos;m open to anywhere
      </button>
      <EditorFooter onCancel={onCancel} onApply={() => onApply(value.trim())} />
    </div>
  );
}

/** When: two dates, the end after the start, and a "flexible" clear. */
function WhenEditor({ initial, onApply, onCancel }: { initial: Pick<TripPlanner, "startDate" | "endDate">; onApply: (dates: Pick<TripPlanner, "startDate" | "endDate">) => void; onCancel: () => void }) {
  const [start, setStart] = useState(initial.startDate);
  const [end, setEnd] = useState(initial.endDate);
  const id = useId();
  const invalid = !!start && !!end && end < start;
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="From">
          <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="To">
          <TextInput type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-error` : undefined} />
        </Field>
      </div>
      {invalid ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-[13px] text-error">
          The end date must come after the start date.
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => {
          setStart("");
          setEnd("");
        }}
        className="mt-2 text-[13px] font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
      >
        Flexible dates
      </button>
      <EditorFooter onCancel={onCancel} onApply={() => onApply({ startDate: start, endDate: end })} applyDisabled={invalid} />
    </div>
  );
}

/** Guests: a 1–16 stepper on the travelers count. */
function GuestsEditor({ initial, onApply, onCancel }: { initial: number; onApply: (travelers: number) => void; onCancel: () => void }) {
  const [count, setCount] = useState(initial);
  return (
    <div>
      <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
        <span className="text-[14px] font-medium">Travelers</span>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Fewer travelers" disabled={count <= 1} onClick={() => setCount((c) => Math.max(1, c - 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-surface disabled:opacity-40">
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="w-8 text-center text-[15px] font-semibold tabular-nums" aria-live="polite">
            {count}
          </span>
          <button type="button" aria-label="More travelers" disabled={count >= 16} onClick={() => setCount((c) => Math.min(16, c + 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-surface disabled:opacity-40">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <EditorFooter onCancel={onCancel} onApply={() => onApply(count)} />
    </div>
  );
}

/** Budget: the four tiers the match model understands, or no preference. */
function BudgetEditor({ initial, onApply, onCancel }: { initial: TripPlanner["budgetTier"]; onApply: (tier: TripPlanner["budgetTier"]) => void; onCancel: () => void }) {
  const [tier, setTier] = useState<TripPlanner["budgetTier"]>(initial);
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Budget tier">
        {BUDGETS.map((b) => (
          <Chip key={b.value} active={tier === b.value} onClick={() => setTier(b.value)}>
            {b.label}
          </Chip>
        ))}
        <Chip active={tier === ""} onClick={() => setTier("")}>
          No preference
        </Chip>
      </div>
      <EditorFooter onCancel={onCancel} onApply={() => onApply(tier)} />
    </div>
  );
}

const FIELD_META: Record<FieldKey, { label: string; icon: LucideIcon; title: string; empty: string }> = {
  where: { label: "Where", icon: MapPin, title: "Where to?", empty: "Any destination" },
  when: { label: "When", icon: CalendarDays, title: "When?", empty: "Any dates" },
  guests: { label: "Guests", icon: Users, title: "How many?", empty: "2 guests" },
  budget: { label: "Budget", icon: Wallet, title: "Budget", empty: "Any budget" },
};

function PlannerField({
  field,
  value,
  open,
  align,
  onToggle,
  onClose,
  editor,
}: {
  field: FieldKey;
  value: string;
  open: boolean;
  align: "left" | "right";
  onToggle: () => void;
  onClose: () => void;
  editor: ReactNode;
}) {
  const meta = FIELD_META[field];
  const Icon = meta.icon;
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const phone = !useMediaQuery("(min-width: 640px)");

  // Desktop: a click anywhere outside the field and its panel closes the editor.
  useEffect(() => {
    if (!open || phone) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open, phone, onClose]);

  const close = () => {
    onClose();
    triggerRef.current?.focus();
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        data-testid={`planner-field-${field}`}
        className={clsx(
          "grid h-16 w-full grid-cols-[18px_minmax(0,1fr)] items-center gap-x-2.5 rounded-[10px] border bg-white px-3 text-left transition-colors hover:border-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
          open ? "border-brand" : "border-border",
        )}
      >
        <Icon className="h-[18px] w-[18px] text-brand" strokeWidth={1.9} aria-hidden="true" />
        <span className="min-w-0">
          <span className="flex items-center justify-between gap-1 text-[13px] font-medium leading-5 text-foreground">
            {meta.label}
            <ChevronDown className={clsx("h-3.5 w-3.5 shrink-0 text-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
          </span>
          <span className="block truncate text-[12px] leading-4 text-secondary">{value}</span>
        </span>
      </button>
      {phone ? (
        <BottomSheet open={open} onClose={close} initialSnap="half" title={meta.title} testId="planner-sheet">
          <div className="px-4 pb-4">{editor}</div>
        </BottomSheet>
      ) : (
        <Popover open={open} onClose={close} id={panelId} title={meta.title} align={align}>
          {editor}
        </Popover>
      )}
    </div>
  );
}

/**
 * The four planning controls under the hero composer: Where, When, Guests and Budget, each a
 * button that opens a small editor (a popover on desktop, a sheet on phones). Values live in the
 * trip planner store, the same object the Create a trip dialog and the assistant read.
 */
export function PlannerFields() {
  const { planner, updatePlanner } = useTravelStore();
  const [open, setOpen] = useState<FieldKey | null>(null);
  const close = () => setOpen(null);
  const toggle = (key: FieldKey) => setOpen((current) => (current === key ? null : key));

  const values: Record<FieldKey, string> = {
    where: planner.where.trim() || FIELD_META.where.empty,
    when: formatDateRange(planner.startDate, planner.endDate) || FIELD_META.when.empty,
    guests: `${planner.travelers} ${planner.travelers === 1 ? "guest" : "guests"}`,
    budget: planner.budgetTier ? BUDGET_LABEL[planner.budgetTier] : FIELD_META.budget.empty,
  };

  const editors: Record<FieldKey, ReactNode> = {
    where: (
      <WhereEditor
        key={`where-${open === "where"}`}
        initial={planner.where}
        onCancel={close}
        onApply={(where) => {
          updatePlanner({ where });
          close();
        }}
      />
    ),
    when: (
      <WhenEditor
        initial={{ startDate: planner.startDate, endDate: planner.endDate }}
        onCancel={close}
        onApply={(dates) => {
          updatePlanner(dates);
          close();
        }}
      />
    ),
    guests: (
      <GuestsEditor
        initial={planner.travelers}
        onCancel={close}
        onApply={(travelers) => {
          updatePlanner({ travelers });
          close();
        }}
      />
    ),
    budget: (
      <BudgetEditor
        initial={planner.budgetTier}
        onCancel={close}
        onApply={(budgetTier) => {
          updatePlanner({ budgetTier });
          close();
        }}
      />
    ),
  };

  const keys: FieldKey[] = ["where", "when", "guests", "budget"];
  return (
    // Four across only once the hero panel is wide enough for "Any destination" to fit (about 1500 px viewports); two across otherwise.
    <div className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2 min-[1500px]:grid-cols-4" data-testid="planner-fields">
      {keys.map((key, index) => (
        <PlannerField key={key} field={key} value={values[key]} open={open === key} align={index === keys.length - 1 ? "right" : "left"} onToggle={() => toggle(key)} onClose={close} editor={editors[key]} />
      ))}
    </div>
  );
}
