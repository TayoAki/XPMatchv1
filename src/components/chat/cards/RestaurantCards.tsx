"use client";

import { MapPin } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { ShowRestaurantsArgs, Streaming } from "@/lib/travel/schemas";
import { googleMapsSearchUrl, openTableSearchUrl } from "@/lib/travel/links";
import { usePlacePin, useRegisterPlaces } from "@/components/map/useRegisterPlaces";
import { CardPhoto, AddToTripButton, Body, CardGrid, CardShell, ExtLink, Footer, SaveButton, SectionHeader, Tag, Text, ViewOnMapButton } from "./shared";

export function RestaurantCards({ args, status, toolCallId }: { args: Streaming<ShowRestaurantsArgs>; status: ToolCallStatus; toolCallId: string }) {
  const items = (args.restaurants ?? []).filter((r) => r && r.name);
  const dest = args.destination ?? "";
  useRegisterPlaces({
    toolCallId,
    status,
    kind: "restaurant",
    destination: dest,
    items: items.map((r) => ({ name: r.name, hint: r.neighborhood })),
  });
  return (
    <div>
      <SectionHeader title={dest ? `Where to eat in ${dest}` : "Where to eat"} status={status} />
      <CardGrid>
        {items.map((r, i) => (
          <RestaurantCard key={`${r.name}-${i}`} restaurant={r} index={i} dest={dest} toolCallId={toolCallId} />
        ))}
      </CardGrid>
    </div>
  );
}

function RestaurantCard({
  restaurant: r,
  index,
  dest,
  toolCallId,
}: {
  restaurant: Streaming<ShowRestaurantsArgs>["restaurants"] extends (infer U)[] | undefined ? U : never;
  index: number;
  dest: string;
  toolCallId: string;
}) {
  const pin = usePlacePin(toolCallId, index);
  const query = `${r.name} ${dest}`.trim();
  return (
            <CardShell highlighted={pin.isSelected} onMouseEnter={() => pin.hover(true)} onMouseLeave={() => pin.hover(false)}>
              <div className="flex gap-3 p-3">
                <CardPhoto place={pin.place} queries={[r.neighborhood ? `${r.neighborhood}, ${dest}` : "", dest]} alt={r.name ?? "Restaurant"} className="h-24 w-24 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[15px] font-semibold">{r.name}</div>
                    <SaveButton place={pin.place} kind="restaurant" title={r.name} subtitle={[r.cuisine, dest].filter(Boolean).join(" · ")} destination={dest} url={googleMapsSearchUrl(query)} className="bg-surface shadow-none" />
                  </div>
                  <div className="text-[13px] text-muted">
                    <Text value={[r.cuisine, r.neighborhood, r.priceTier].filter(Boolean).join(" · ")} />
                  </div>
                  <div className="mt-1 text-[13px]">
                    <span className="font-medium">Must try: </span>
                    <Text value={r.mustTry} />
                  </div>
                </div>
              </div>
              <Body>
                <p className="text-[13px] text-neutral-700">
                  <Text value={r.whyItFits} lines={2} />
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {r.bestFor ? <Tag>Best for {r.bestFor}</Tag> : null}
                  {r.reservationRecommended === true ? <Tag tone="warn">Book ahead</Tag> : null}
                  {r.reservationRecommended === false ? <Tag tone="accent">Walk-ins OK</Tag> : null}
                </div>
              </Body>
              <Footer>
                <ExtLink primary href={googleMapsSearchUrl(query)}>
                  <MapPin className="h-3.5 w-3.5" /> Map & hours
                </ExtLink>
                {r.reservationRecommended ? <ExtLink href={openTableSearchUrl(query)}>Reserve</ExtLink> : null}
                <ViewOnMapButton pin={pin} />
                <AddToTripButton place={pin.place} />
              </Footer>
            </CardShell>
  );
}
