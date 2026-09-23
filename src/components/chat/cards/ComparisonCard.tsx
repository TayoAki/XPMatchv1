"use client";

import clsx from "clsx";
import { Check, CircleHelp, MapPin, Minus, Star, TriangleAlert } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { CompareOptionArg, CompareOptionsArgs, Streaming } from "@/lib/travel/schemas";
import type { PlaceKind } from "@/lib/places/types";
import { mapActions, useMapView } from "@/lib/map-store";
import { useCardThreadId, usePlacePin, useRegisterPlaces } from "@/components/map/useRegisterPlaces";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { AddToTripButton, CardShell, SaveButton, SectionHeader, usd } from "./shared";
import { shortPlaceName } from "@/lib/places/names";

type StreamingOption = Streaming<CompareOptionArg>;

const KIND_TO_PLACE: Record<NonNullable<CompareOptionsArgs["kind"]>, PlaceKind | null> = {
  hotels: "hotel",
  restaurants: "restaurant",
  attractions: "attraction",
  destinations: "destination",
  flights: null,
};

const VERDICT: Record<string, { label: string; className: string; icon: typeof Check }> = {
  strong: { label: "Strong", className: "bg-emerald-50 text-emerald-800", icon: Check },
  ok: { label: "OK", className: "bg-surface text-neutral-700", icon: Minus },
  weak: { label: "Weak", className: "bg-amber-50 text-amber-800", icon: TriangleAlert },
  unknown: { label: "Unknown", className: "bg-neutral-100 text-neutral-500", icon: CircleHelp },
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Side-by-side comparison: options as columns, this traveler's priorities as
 * rows, then price, rating and location (Google Places data replaces the
 * model's guesses when the option is pinned), strengths, compromises and what
 * could not be verified. Every column stays linked to its map pin.
 */
export function ComparisonCard({ args, status, toolCallId }: { args: Streaming<CompareOptionsArgs>; status: ToolCallStatus; toolCallId: string }) {
  const threadId = useCardThreadId();
  const view = useMapView(threadId);
  const send = useSendMessage();
  const options = (args.options ?? []).filter((o): o is StreamingOption => !!o && !!o.name);
  const priorities = (args.priorities ?? []).filter((p): p is string => typeof p === "string" && !!p);
  const placeKind = args.kind ? KIND_TO_PLACE[args.kind] : "hotel";

  // Pins: reuse the ones this chat already has (matched by name), resolve the rest.
  const byName = new Map<string, (typeof view.placeList)[number]>();
  for (const p of view.placeList) byName.set(norm(p.name), p);
  const existing = options.map((o) => byName.get(norm(o.name ?? "")) ?? null);

  useRegisterPlaces({
    toolCallId,
    status,
    kind: placeKind ?? "attraction",
    destination: view.focus?.name,
    items: placeKind ? options.map((o, i) => ({ name: existing[i] ? undefined : o.name, hint: o.area })) : [],
  });

  const pick = (name: string) => send(`I'll go with ${name}. What's the next step?`);

  return (
    <div data-testid="comparison-card">
      <SectionHeader title={`Compare: ${options.map((o) => o.name).join(" vs ")}`} subtitle="Rows are what matters to you; unknowns are unverified, not bad" status={status} />
      <CardShell className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border">
              <th className="w-[160px] px-3 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-muted">Your priorities</th>
              {options.map((o, i) => (
                <ColumnHeader key={`${o.name}-${i}`} option={o} index={i} toolCallId={toolCallId} existingKey={existing[i]?.key} kind={placeKind} />
              ))}
            </tr>
          </thead>
          <tbody>
            {priorities.map((priority) => (
              <tr key={priority} className="border-b border-border/70 align-top">
                <th scope="row" className="px-3 py-2.5 text-left font-semibold text-neutral-800">
                  {priority}
                </th>
                {options.map((o, i) => {
                  const cell = (o.cells ?? []).find((c) => c && c.priority && norm(c.priority) === norm(priority));
                  const verdict = VERDICT[cell?.verdict ?? "unknown"] ?? VERDICT.unknown;
                  const Icon = verdict.icon;
                  return (
                    <td key={`${priority}-${i}`} className="px-3 py-2.5">
                      <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium", verdict.className)}>
                        <Icon className="h-3 w-3" /> {verdict.label}
                      </span>
                      {cell?.note ? <div className="mt-1 text-neutral-700">{cell.note}</div> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
            <FactRow label="Price" options={options} existing={existing} render={(o, place) => (o.priceEstimateUsd ? `${usd(o.priceEstimateUsd)} est.` : place?.priceLevel ?? "—")} />
            <FactRow
              label="Rating"
              options={options}
              existing={existing}
              render={(o, place) =>
                place?.rating ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-current" /> {place.rating.toFixed(1)}
                    {place.userRatingCount ? <span className="text-muted">({place.userRatingCount.toLocaleString()} on Google)</span> : null}
                  </span>
                ) : o.rating ? (
                  `★ ${o.rating.toFixed(1)} (assistant's estimate)`
                ) : (
                  "—"
                )
              }
            />
            <FactRow label="Location" options={options} existing={existing} render={(o, place) => place?.locality ?? o.area ?? "—"} />
            <ListRow label="Strengths" options={options} pick={(o) => o.strengths} tone="text-emerald-800" />
            <ListRow label="Compromises" options={options} pick={(o) => o.compromises} tone="text-amber-800" />
            <ListRow label="Couldn't verify" options={options} pick={(o) => o.unknowns} tone="text-neutral-500" />
            <tr>
              <th scope="row" className="px-3 py-3 text-left font-semibold text-neutral-800">
                Pick
              </th>
              {options.map((o, i) => (
                <td key={`pick-${i}`} className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => o.name && pick(o.name)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-hover"
                  >
                    <Check className="h-3.5 w-3.5" /> Pick this one
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        {args.recommendation ? (
          <div className="border-t border-border bg-surface/60 px-4 py-3 text-[13px] text-neutral-800">
            <span className="font-semibold">Recommendation: </span>
            {args.recommendation}
          </div>
        ) : null}
      </CardShell>
    </div>
  );
}

function ColumnHeader({
  option,
  index,
  toolCallId,
  existingKey,
  kind,
}: {
  option: StreamingOption;
  index: number;
  toolCallId: string;
  existingKey?: string;
  kind: PlaceKind | null;
}) {
  const threadId = useCardThreadId();
  const view = useMapView(threadId);
  const own = usePlacePin(toolCallId, index);
  const key = existingKey ?? (own.place ? `${toolCallId}:${index}` : null);
  const place = existingKey ? view.places[existingKey] : own.place;
  const selected = !!key && view.selectedKey === key;
  const open = () => threadId && key && mapActions.selectPlace(threadId, key);
  return (
    <th
      className={clsx("px-3 py-3 text-left align-top", selected && "bg-surface/70")}
      onMouseEnter={() => key && mapActions.setHovered(key)}
      onMouseLeave={() => mapActions.setHovered(null)}
    >
      <div className="truncate text-[15px] font-semibold" title={option.name}>
        {option.name ? shortPlaceName(option.name) : null}
      </div>
      {option.area ? <div className="text-[12px] font-normal text-muted">{option.area}</div> : null}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 font-normal">
        {place ? (
          <button type="button" onClick={open} className="inline-flex h-7 items-center gap-1 rounded-full bg-surface px-2.5 text-[12px] font-medium hover:bg-surface-2">
            <MapPin className="h-3 w-3" /> Map
          </button>
        ) : null}
        {kind ? <SaveButton kind={kind} title={option.name} subtitle={option.area} destination={view.focus?.name} place={place} className="h-7 w-7 bg-surface shadow-none" /> : null}
        <AddToTripButton place={place} />
      </div>
    </th>
  );
}

function FactRow({
  label,
  options,
  existing,
  render,
}: {
  label: string;
  options: StreamingOption[];
  existing: ({ rating?: number; userRatingCount?: number; priceLevel?: string; locality?: string } | null)[];
  render: (option: StreamingOption, place: { rating?: number; userRatingCount?: number; priceLevel?: string; locality?: string } | null) => React.ReactNode;
}) {
  return (
    <tr className="border-b border-border/70 align-top">
      <th scope="row" className="px-3 py-2.5 text-left font-semibold text-neutral-800">
        {label}
      </th>
      {options.map((o, i) => (
        <td key={`${label}-${i}`} className="px-3 py-2.5 text-neutral-700">
          {render(o, existing[i])}
        </td>
      ))}
    </tr>
  );
}

function ListRow({ label, options, pick, tone }: { label: string; options: StreamingOption[]; pick: (o: StreamingOption) => (string | undefined)[] | undefined; tone: string }) {
  if (!options.some((o) => (pick(o) ?? []).some(Boolean))) return null;
  return (
    <tr className="border-b border-border/70 align-top">
      <th scope="row" className="px-3 py-2.5 text-left font-semibold text-neutral-800">
        {label}
      </th>
      {options.map((o, i) => (
        <td key={`${label}-${i}`} className={clsx("px-3 py-2.5", tone)}>
          <ul className="list-disc pl-4">
            {(pick(o) ?? []).filter(Boolean).map((line, j) => (
              <li key={j}>{line}</li>
            ))}
          </ul>
        </td>
      ))}
    </tr>
  );
}
