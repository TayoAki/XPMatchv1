"use client";

import { MapPin } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { ShowHotelsArgs, Streaming } from "@/lib/travel/schemas";
import { bookingSearchUrl, googleHotelsUrl, googleMapsSearchUrl } from "@/lib/travel/links";
import { formatDateRange } from "@/lib/store";
import { placeKey, usePlacePin, useRegisterPlaces } from "@/components/map/useRegisterPlaces";
import { CardPhoto, AddToTripButton, Body, CardGrid, CardShell, ExtLink, Footer, SaveButton, SectionHeader, Stars, Tag, Text, Tradeoffs, ViewOnMapButton, usd } from "./shared";
import { CompareToggle } from "./CompareControls";
import { HiddenPlaceCard, ReactionControl, useReaction } from "@/components/feedback/ReactionControl";
import { TasteFit } from "@/components/feedback/TasteFit";
import { MatchLine } from "@/components/recs/MatchLine";

export function HotelCards({ args, status, toolCallId }: { args: Streaming<ShowHotelsArgs>; status: ToolCallStatus; toolCallId: string }) {
  const items = (args.hotels ?? []).filter((h) => h && h.name);
  const dates = formatDateRange(args.checkIn, args.checkOut);
  const dest = args.destination ?? "";
  useRegisterPlaces({
    toolCallId,
    status,
    kind: "hotel",
    destination: dest,
    items: items.map((h) => ({ name: h.name, hint: h.area })),
  });
  return (
    <div>
      <SectionHeader
        title={dest ? `Where to stay in ${dest}` : "Where to stay"}
        subtitle={[dates, args.guests ? `${args.guests} guests` : ""].filter(Boolean).join(" · ") || "Rates are estimates; check live prices"}
        status={status}
      />
      <CardGrid>
        {items.map((h, i) => (
          <HotelCard key={`${h.name}-${i}`} hotel={h} index={i} args={args} dest={dest} toolCallId={toolCallId} />
        ))}
      </CardGrid>
    </div>
  );
}

function HotelCard({
  hotel: h,
  index,
  args,
  dest,
  toolCallId,
}: {
  hotel: Streaming<ShowHotelsArgs>["hotels"] extends (infer U)[] | undefined ? U : never;
  index: number;
  args: Streaming<ShowHotelsArgs>;
  dest: string;
  toolCallId: string;
}) {
  const pin = usePlacePin(toolCallId, index);
  const reaction = useReaction({ name: h.name, kind: "hotel", place: pin.place, destination: dest });
  const query = `${h.name} ${dest}`.trim();
  if (reaction.current?.verdict === "disliked" && h.name) return <HiddenPlaceCard name={h.name} feedbackId={reaction.current.id} />;
  return (
            <CardShell highlighted={pin.isSelected} onMouseEnter={() => pin.hover(true)} onMouseLeave={() => pin.hover(false)}>
              <CardPhoto place={pin.place} queries={[h.area ? `${h.area}, ${dest}` : "", dest]} alt={h.name ?? "Hotel"} className="aspect-[16/9]" onOpen={pin.place ? pin.open : undefined}>
                <SaveButton
                  place={pin.place}
                  kind="hotel"
                  title={h.name}
                  subtitle={[h.area, dest].filter(Boolean).join(", ")}
                  destination={dest}
                  url={bookingSearchUrl({ query, checkIn: args.checkIn, checkOut: args.checkOut, guests: args.guests })}
                  className="absolute right-2 top-2"
                />
                {h.priceTier ? (
                  <span className="absolute left-3 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[12px] font-semibold">{h.priceTier}</span>
                ) : null}
              </CardPhoto>
              <Body>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[15px] font-semibold">{h.name}</div>
                  <Stars rating={h.rating} />
                </div>
                <div className="text-[13px] text-muted">
                  <Text value={[h.area, h.style].filter(Boolean).join(" · ")} />
                </div>
                <div className="text-[13px]">
                  {h.nightlyEstimateUsd ? (
                    <>
                      <span className="font-semibold">{usd(h.nightlyEstimateUsd)}</span>
                      <span className="text-muted"> / night est.</span>
                    </>
                  ) : (
                    <Text value={undefined} />
                  )}
                </div>
                <p className="text-[13px] text-neutral-700">
                  <Text value={h.whyItFits} lines={2} />
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(h.amenities ?? []).filter(Boolean).slice(0, 4).map((a) => (
                    <Tag key={a}>{a}</Tag>
                  ))}
                </div>
                <TasteFit kind="hotel" name={h.name} category={pin.place?.category ?? h.style} text={[h.whyItFits, h.style, ...(h.amenities ?? [])].filter(Boolean).join(" ")} />
                <Tradeoffs items={h.tradeoffs} />
                <MatchLine
                  name={h.name}
                  kind="hotel"
                  place={pin.place}
                  destination={dest}
                  context="chat"
                  category={h.style}
                  priceLevel={h.priceTier}
                  rating={h.rating}
                  text={[h.whyItFits, h.style, h.area, ...(h.amenities ?? [])].filter(Boolean).join(" ")}
                  tradeoffs={h.tradeoffs}
                  className="pt-1"
                />
              </Body>
              <Footer>
                <ExtLink primary href={bookingSearchUrl({ query, checkIn: args.checkIn, checkOut: args.checkOut, guests: args.guests })}>
                  Check rates
                </ExtLink>
                <ExtLink href={googleHotelsUrl(query)}>Google Hotels</ExtLink>
                <ViewOnMapButton pin={pin} />
                <AddToTripButton place={pin.place} />
                <ReactionControl name={h.name} kind="hotel" place={pin.place} destination={dest} source="card" />
                <CompareToggle
                  pinKey={placeKey(toolCallId, index)}
                  name={h.name}
                  kind="hotel"
                  facts={[h.area, h.style, h.nightlyEstimateUsd ? `${usd(h.nightlyEstimateUsd)}/night est.` : "", h.rating ? `rated ${h.rating}` : ""].filter(Boolean).join(", ")}
                  place={pin.place}
                />
                {!pin.place ? (
                  <ExtLink href={googleMapsSearchUrl(query)}>
                    <MapPin className="h-3.5 w-3.5" /> Map
                  </ExtLink>
                ) : null}
              </Footer>
            </CardShell>
  );
}
