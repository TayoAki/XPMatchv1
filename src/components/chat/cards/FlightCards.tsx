"use client";

import { Plane } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { ShowFlightsArgs, Streaming } from "@/lib/travel/schemas";
import { googleFlightsUrl } from "@/lib/travel/links";
import { formatDateRange } from "@/lib/store";
import { Body, CardRow, CardShell, ExtLink, Footer, SaveButton, SectionHeader, Tag, Text, Tradeoffs, usd } from "./shared";

export function FlightCards({ args, status }: { args: Streaming<ShowFlightsArgs>; status: ToolCallStatus }) {
  const items = (args.options ?? []).filter((o) => o && o.airline);
  const dates = formatDateRange(args.departDate, args.returnDate);
  const title = args.destination ? `Flights ${args.origin ? `${args.origin} → ` : ""}${args.destination}` : "Flights";
  const searchUrl = args.destination
    ? googleFlightsUrl({
        origin: args.origin,
        destination: args.destination,
        departDate: args.departDate,
        returnDate: args.returnDate,
        travelers: args.travelers,
      })
    : undefined;
  return (
    <div>
      <SectionHeader title={title} subtitle={[dates, args.travelers ? `${args.travelers} travelers` : "", "Prices are estimates"].filter(Boolean).join(" · ")} status={status} />
      <CardRow label={title} items={items.map((o, i) => ({ id: `${o.airline}-${i}`, node: <FlightCard option={o} dates={dates} destination={args.destination} searchUrl={searchUrl} /> }))} />
    </div>
  );
}

function FlightCard({
  option: o,
  dates,
  destination,
  searchUrl,
}: {
  option: Streaming<ShowFlightsArgs>["options"] extends (infer U)[] | undefined ? U : never;
  dates: string;
  destination?: string;
  searchUrl?: string;
}) {
  return (
    <CardShell>
      <Body>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface">
              <Plane className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[15px] font-semibold">{o.airline}</div>
              <div className="text-[13px] text-muted">
                <Text value={o.routeSummary} />
              </div>
            </div>
          </div>
          <SaveButton kind="flight" title={`${o.airline} ${o.routeSummary ?? ""}`.trim()} subtitle={dates || undefined} destination={destination} url={searchUrl} className="bg-surface shadow-none" />
        </div>
        {/* Tags, with the heads-ups folded into one chip at the end of the row. */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {o.stops !== undefined ? <Tag tone={o.stops === 0 ? "accent" : "neutral"}>{o.stops === 0 ? "Nonstop" : `${o.stops} stop${o.stops > 1 ? "s" : ""}`}</Tag> : null}
          {o.durationText ? <Tag>{o.durationText}</Tag> : null}
          {o.cabin ? <Tag>{o.cabin}</Tag> : null}
          <Tradeoffs items={o.tradeoffs} name={[o.airline, o.routeSummary].filter(Boolean).join(" ") || undefined} />
        </div>
        <div className="pt-1 text-[13px]">
          {o.estimatedPriceUsd ? (
            <>
              <span className="text-[17px] font-semibold">{usd(o.estimatedPriceUsd)}</span>
              <span className="text-muted"> round trip est. per person</span>
            </>
          ) : (
            <Text value={undefined} />
          )}
        </div>
        <div className="text-[13px] text-neutral-700">
          <Text value={o.departureWindow} />
        </div>
        {o.notes ? <p className="text-[13px] text-neutral-600">{o.notes}</p> : null}
      </Body>
      <Footer>{searchUrl ? <ExtLink primary href={searchUrl}>Search on Google Flights</ExtLink> : null}</Footer>
    </CardShell>
  );
}
