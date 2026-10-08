"use client";

import { useState } from "react";
import clsx from "clsx";
import { MapPin, Plus, X } from "lucide-react";
import { countryFlag } from "@/lib/places/flags";
import { CityInput } from "./CityInput";

/** Places kept per list (what the interview is told about). */
export const MAX_PLACES = 10;

function PlaceChip({ line, onRemove, compact }: { line: string; onRemove: () => void; compact?: boolean }) {
  const name = line.split(",")[0].trim() || line;
  const flag = countryFlag(line);
  return (
    <span className={clsx("inline-flex items-center gap-2 rounded-full bg-surface pr-1.5 font-medium", compact ? "h-8 pl-3 text-[13px]" : "h-10 pl-3.5 text-[15px]")} title={line}>
      {flag ? (
        <span aria-hidden="true" className="text-[16px] leading-none">
          {flag}
        </span>
      ) : (
        <MapPin className="h-4 w-4 text-muted" aria-hidden="true" />
      )}
      {name}
      <button type="button" onClick={onRemove} aria-label={`Remove ${name}`} className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </span>
  );
}

/** Places someone has been or wants to go: chips with a flag, and a city field to add more. */
export function PlaceList({
  title,
  values,
  onChange,
  testId,
  compact,
}: {
  title: string;
  values: string[];
  onChange: (values: string[]) => void;
  testId: string;
  /** Form-sized, for the settings dialog. */
  compact?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const close = () => {
    setText("");
    setAdding(false);
  };
  const add = (line: string) => {
    const v = line.replace(/\s+/g, " ").trim().slice(0, 120);
    if (v && values.length < MAX_PLACES && !values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    close();
  };
  const headingId = `${testId}-heading`;
  return (
    <section aria-labelledby={headingId} data-testid={testId}>
      <h2 id={headingId} className={clsx("flex items-center gap-2", compact ? "text-[13px] font-medium" : "text-[17px] font-semibold tracking-tight")}>
        {title}
        {values.length ? <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-surface px-2 text-[12px] font-semibold text-muted">{values.length}</span> : null}
      </h2>
      {values.length ? (
        <ul className={clsx("flex flex-wrap gap-2", compact ? "mt-2" : "mt-3")}>
          {values.map((v) => (
            <li key={v}>
              <PlaceChip line={v} compact={compact} onRemove={() => onChange(values.filter((x) => x !== v))} />
            </li>
          ))}
        </ul>
      ) : null}
      <div className={compact ? "mt-2" : "mt-3"}>
        {adding ? (
          <div className="max-w-[520px]">
            <CityInput
              autoFocus
              compact={compact}
              scope="any"
              label={`Add to ${title.toLowerCase()}`}
              placeholder="City, region or country"
              value={text}
              onChange={setText}
              onPick={(s) => add(s.text)}
              onSubmit={(typed) => (typed ? add(typed) : close())}
              onCancel={close}
            />
            <p className={clsx("mt-2 text-[12px] text-muted", !compact && "pl-5")}>Pick a suggestion or press Enter to add it as typed.</p>
          </div>
        ) : values.length < MAX_PLACES ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full border border-border bg-white font-medium hover:border-neutral-400 hover:bg-surface",
              compact ? "h-8 px-3 text-[13px]" : "h-11 px-5 text-[15px]",
            )}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {values.length ? "Add more" : "Add place"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
