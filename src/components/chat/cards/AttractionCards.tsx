"use client";

import { Clock, MapPin, Ticket } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { ShowAttractionsArgs, Streaming } from "@/lib/travel/schemas";
import { getYourGuideSearchUrl, googleMapsSearchUrl } from "@/lib/travel/links";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { usePlacePin, useRegisterPlaces } from "@/components/map/useRegisterPlaces";
import { AddToTripButton, Body, CardGrid, CardShell, ExtLink, Footer, SaveButton, SectionHeader, Tag, Text, ViewOnMapButton } from "./shared";

export function AttractionCards({ args, status, toolCallId }: { args: Streaming<ShowAttractionsArgs>; status: ToolCallStatus; toolCallId: string }) {
  const items = (args.attractions ?? []).filter((a) => a && a.name);
  const dest = args.destination ?? "";
  useRegisterPlaces({
    toolCallId,
    status,
    kind: "attraction",
    destination: dest,
    items: items.map((a) => ({ name: a.name, hint: a.neighborhood })),
  });
  return (
    <div>
      <SectionHeader title={dest ? `Things to do in ${dest}` : "Things to do"} status={status} />
      <CardGrid>
        {items.map((a, i) => (
          <AttractionCard key={`${a.name}-${i}`} attraction={a} index={i} dest={dest} toolCallId={toolCallId} />
        ))}
      </CardGrid>
    </div>
  );
}

function AttractionCard({
  attraction: a,
  index,
  dest,
  toolCallId,
}: {
  attraction: Streaming<ShowAttractionsArgs>["attractions"] extends (infer U)[] | undefined ? U : never;
  index: number;
  dest: string;
  toolCallId: string;
}) {
  const pin = usePlacePin(toolCallId, index);
  const query = `${a.name} ${dest}`.trim();
  return (
            <CardShell highlighted={pin.isSelected} onMouseEnter={() => pin.hover(true)} onMouseLeave={() => pin.hover(false)}>
              <PlaceImage queries={[a.name ?? "", dest]} alt={a.name ?? "Attraction"} className="aspect-[16/9]">
                <SaveButton place={pin.place} kind="attraction" title={a.name} subtitle={[a.category, dest].filter(Boolean).join(" · ")} destination={dest} url={googleMapsSearchUrl(query)} className="absolute right-2 top-2" />
                {a.category ? <span className="absolute left-3 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[12px] font-semibold">{a.category}</span> : null}
              </PlaceImage>
              <Body>
                <div className="text-[15px] font-semibold">{a.name}</div>
                <div className="text-[13px] text-muted">
                  <Text value={a.neighborhood} />
                </div>
                <p className="text-[13px] text-neutral-700">
                  <Text value={a.description} lines={2} />
                </p>
                {a.whyItFits ? <p className="text-[13px] text-neutral-600">{a.whyItFits}</p> : null}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {a.bestTimeOfDay ? <Tag>{a.bestTimeOfDay}</Tag> : null}
                  {a.durationHours ? (
                    <Tag>
                      <Clock className="mr-1 h-3 w-3" /> {a.durationHours}h
                    </Tag>
                  ) : null}
                  {a.ticketNote ? (
                    <Tag tone={/free/i.test(a.ticketNote) ? "accent" : "neutral"}>
                      <Ticket className="mr-1 h-3 w-3" /> {a.ticketNote}
                    </Tag>
                  ) : null}
                </div>
              </Body>
              <Footer>
                <ExtLink primary href={googleMapsSearchUrl(query)}>
                  <MapPin className="h-3.5 w-3.5" /> Map
                </ExtLink>
                <ExtLink href={getYourGuideSearchUrl(query)}>Tickets & tours</ExtLink>
                <ViewOnMapButton pin={pin} />
                <AddToTripButton place={pin.place} />
              </Footer>
            </CardShell>
  );
}
