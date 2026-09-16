"use client";

import Link from "next/link";
import { useState } from "react";
import { Calendar, Check, Users, Wallet } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { CreateTripArgs, Streaming } from "@/lib/travel/schemas";
import { formatDateRange, useTravelStore } from "@/lib/store";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { Button } from "@/components/ui/Button";
import { CardShell, Skeleton, Tag } from "./shared";

interface TripProposalCardProps {
  args: Streaming<CreateTripArgs>;
  status: ToolCallStatus;
  result?: string;
  respond?: (result: unknown) => Promise<void>;
}

function parseResult(result?: string): { created?: boolean; tripId?: string } {
  if (!result) return {};
  try {
    return JSON.parse(result) as { created?: boolean; tripId?: string };
  } catch {
    return {};
  }
}

/**
 * Human-in-the-loop card: the model proposes a trip, the traveler confirms it
 * and it is saved locally to "Trips".
 */
export function TripProposalCard({ args, status, result, respond }: TripProposalCardProps) {
  const { addTrip } = useTravelStore();
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const outcome = parseResult(result);
  const days = (args.itinerary ?? []).filter((d) => d && d.day !== undefined);
  const dates = formatDateRange(args.startDate, args.endDate);
  const canRespond = status === ToolCallStatus.Executing && !!respond;

  const save = async () => {
    if (!respond || !args.title || !args.destination) return;
    setBusy(true);
    const trip = addTrip({
      title: args.title,
      destination: args.destination,
      startDate: args.startDate,
      endDate: args.endDate,
      travelers: args.travelers,
      budgetTier: args.budgetTier,
      summary: args.summary,
      itinerary: days.map((d) => ({
        day: d.day ?? 0,
        title: d.title ?? `Day ${d.day}`,
        items: (d.items ?? []).filter((i): i is string => typeof i === "string"),
      })),
    });
    await respond({ created: true, tripId: trip.id, note: "Trip saved to the traveler's Trips page. Confirm in one short sentence and offer a next step." });
    setBusy(false);
  };

  const decline = async () => {
    if (!respond) return;
    setBusy(true);
    await respond({ created: false, note: "Traveler did not save the trip. Ask what they would like to change." });
    setBusy(false);
  };

  return (
    <CardShell className="mt-2">
      <PlaceImage queries={[args.destination ?? ""]} alt={args.destination ?? "Trip"} className="aspect-[3/1] max-h-56">
        <div className="absolute inset-x-4 bottom-3 text-white drop-shadow">
          <div className="text-[11px] font-semibold uppercase tracking-wide opacity-90">Trip proposal</div>
          <div className="text-[20px] font-semibold">{args.title ?? <Skeleton className="h-6 w-48 bg-white/40" />}</div>
        </div>
      </PlaceImage>
      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="flex flex-wrap gap-1.5">
          {args.destination ? <Tag>{args.destination}</Tag> : null}
          {dates ? (
            <Tag>
              <Calendar className="mr-1 h-3 w-3" /> {dates}
            </Tag>
          ) : null}
          {args.travelers ? (
            <Tag>
              <Users className="mr-1 h-3 w-3" /> {args.travelers} traveler{args.travelers === 1 ? "" : "s"}
            </Tag>
          ) : null}
          {args.budgetTier ? (
            <Tag>
              <Wallet className="mr-1 h-3 w-3" /> {args.budgetTier}
            </Tag>
          ) : null}
        </div>
        <p className="text-[14px] text-neutral-700">{args.summary ?? <Skeleton className="h-9 w-full" />}</p>

        <div>
          <button type="button" onClick={() => setExpanded((v) => !v)} className="text-[13px] font-semibold underline-offset-2 hover:underline">
            {expanded ? "Hide itinerary" : `Show itinerary (${days.length} day${days.length === 1 ? "" : "s"})`}
          </button>
          {expanded ? (
            <ol className="mt-2 space-y-3">
              {days.map((d, i) => (
                <li key={`${d.day}-${i}`} className="rounded-xl bg-surface/70 p-3">
                  <div className="text-[13px] font-semibold">
                    Day {d.day}
                    {d.title ? <span className="text-neutral-600"> · {d.title}</span> : null}
                  </div>
                  <ul className="mt-1 list-disc pl-4 text-[13px] text-neutral-700">
                    {(d.items ?? []).filter(Boolean).map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {canRespond ? (
            <>
              <Button size="sm" onClick={save} disabled={busy || !args.title}>
                <Check className="h-4 w-4" /> Save to my trips
              </Button>
              <Button size="sm" variant="outline" onClick={decline} disabled={busy}>
                Not yet
              </Button>
            </>
          ) : null}
          {status === ToolCallStatus.Complete && outcome.created ? (
            <Link href="/trips" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-[13px] font-medium text-emerald-700">
              <Check className="h-4 w-4" /> Saved to Trips
            </Link>
          ) : null}
          {status === ToolCallStatus.Complete && outcome.created === false ? <Tag>Not saved</Tag> : null}
          {status === ToolCallStatus.InProgress ? <Tag>Drafting itinerary…</Tag> : null}
        </div>
      </div>
    </CardShell>
  );
}
