"use client";

import { MapPin } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { ShowDestinationsArgs, Streaming } from "@/lib/travel/schemas";
import { googleMapsSearchUrl } from "@/lib/travel/links";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { ActionButton, Body, CardGrid, CardShell, ExtLink, Footer, SaveButton, SectionHeader, Tag, Text, usd } from "./shared";

export function DestinationCards({ args, status }: { args: Streaming<ShowDestinationsArgs>; status: ToolCallStatus }) {
  const send = useSendMessage();
  const items = (args.destinations ?? []).filter((d) => d && d.name);
  return (
    <div>
      <SectionHeader title={args.title || "Destinations for you"} status={status} />
      <CardGrid>
        {items.map((d, i) => {
          const label = [d.name, d.country].filter(Boolean).join(", ");
          return (
            <CardShell key={`${d.name}-${i}`}>
              <PlaceImage queries={[d.name ?? "", label]} alt={label} className="aspect-[16/10]">
                <SaveButton kind="destination" title={d.name} subtitle={d.country} destination={d.name} className="absolute right-2 top-2" />
                <div className="absolute bottom-2 left-3 right-3 text-white drop-shadow">
                  <div className="text-[17px] font-semibold">{d.name}</div>
                  <div className="text-[12px] opacity-90">{d.country}</div>
                </div>
              </PlaceImage>
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
                {d.name ? (
                  <ExtLink href={googleMapsSearchUrl(label)}>
                    <MapPin className="h-3.5 w-3.5" /> Map
                  </ExtLink>
                ) : null}
              </Footer>
            </CardShell>
          );
        })}
      </CardGrid>
    </div>
  );
}
