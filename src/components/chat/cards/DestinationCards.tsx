"use client";

import { MapPin } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { ShowDestinationsArgs, Streaming } from "@/lib/travel/schemas";
import { googleMapsSearchUrl } from "@/lib/travel/links";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { usePlacePin, useRegisterPlaces } from "@/components/map/useRegisterPlaces";
import { CardPhoto, AddToTripButton, ActionButton, Body, CardGrid, CardShell, ExtLink, Footer, SaveButton, SectionHeader, Tag, Text, ViewOnMapButton, usd } from "./shared";

export function DestinationCards({ args, status, toolCallId }: { args: Streaming<ShowDestinationsArgs>; status: ToolCallStatus; toolCallId: string }) {
  const items = (args.destinations ?? []).filter((d) => d && d.name);
  useRegisterPlaces({
    toolCallId,
    status,
    kind: "destination",
    items: items.map((d) => ({ name: d.name, hint: d.country })),
  });
  return (
    <div>
      <SectionHeader title={args.title || "Destinations for you"} status={status} />
      <CardGrid>
        {items.map((d, i) => (
          <DestinationCard key={`${d.name}-${i}`} destination={d} index={i} toolCallId={toolCallId} />
        ))}
      </CardGrid>
    </div>
  );
}

function DestinationCard({
  destination: d,
  index,
  toolCallId,
}: {
  destination: Streaming<ShowDestinationsArgs>["destinations"] extends (infer U)[] | undefined ? U : never;
  index: number;
  toolCallId: string;
}) {
  const send = useSendMessage();
  const pin = usePlacePin(toolCallId, index);
  const label = [d.name, d.country].filter(Boolean).join(", ");
  return (
            <CardShell highlighted={pin.isSelected} onMouseEnter={() => pin.hover(true)} onMouseLeave={() => pin.hover(false)}>
              <CardPhoto place={pin.place} queries={[d.name ?? "", label]} alt={label} className="aspect-[16/10]">
                <SaveButton place={pin.place} kind="destination" title={d.name} subtitle={d.country} destination={d.name} className="absolute right-2 top-2" />
                <div className="absolute bottom-2 left-3 right-3 text-white drop-shadow">
                  <div className="text-[17px] font-semibold">{d.name}</div>
                  <div className="text-[12px] opacity-90">{d.country}</div>
                </div>
              </CardPhoto>
              <Body>
                <div className="font-medium">
                  <Text value={d.tagline} />
                </div>
                <p className="text-[13px] text-neutral-700">
                  <Text value={d.whyItFits} lines={2} />
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {d.bestTime ? <Tag>Best: {d.bestTime}</Tag> : null}
                  {d.estimatedDailyBudgetUsd ? <Tag tone="accent">~{usd(d.estimatedDailyBudgetUsd)}/day</Tag> : null}
                  {(d.vibes ?? []).filter(Boolean).slice(0, 3).map((v) => (
                    <Tag key={v}>{v}</Tag>
                  ))}
                </div>
                {d.highlights && d.highlights.length > 0 ? (
                  <ul className="mt-1 list-disc pl-4 text-[13px] text-neutral-700">
                    {d.highlights.filter(Boolean).slice(0, 4).map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                ) : null}
              </Body>
              <Footer>
                <ActionButton onClick={() => send(`Plan a trip to ${label} for me.`)}>Plan a trip</ActionButton>
                <ViewOnMapButton pin={pin} />
                <AddToTripButton place={pin.place} />
                {d.name && !pin.place ? (
                  <ExtLink href={googleMapsSearchUrl(label)}>
                    <MapPin className="h-3.5 w-3.5" /> Map
                  </ExtLink>
                ) : null}
              </Footer>
            </CardShell>
  );
}
