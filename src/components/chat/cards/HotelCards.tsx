"use client";

import { ToolCallStatus } from "@copilotkit/core";
import type { ShowHotelsArgs, Streaming } from "@/lib/travel/schemas";
import { bookingSearchUrl } from "@/lib/travel/links";
import { formatDateRange } from "@/lib/store";
import { placeKey, usePlacePin, useRegisterPlaces } from "@/components/map/useRegisterPlaces";
import { CardPhoto, AddToTripButton, Body, CardActions, CardRow, CardShell, SaveButton, SectionHeader, Stars, Tag, Text, Tradeoffs, usd } from "./shared";
import { CompareToggle } from "./CompareControls";
import { HiddenPlaceCard, ReactionControl, useReaction } from "@/components/feedback/ReactionControl";
import { TasteFit } from "@/components/feedback/TasteFit";
import { MatchLine } from "@/components/recs/MatchLine";

export function HotelCards({ args, status, toolCallId }: { args: Streaming<ShowHotelsArgs>; status: ToolCallStatus; toolCallId: string }) {
  const items = (args.hotels ?? []).filter((h) => h && h.name);
  const dates = formatDateRange(args.checkIn, args.checkOut);
  const dest = args.destination ?? "";
  const title = dest ? `Where to stay in ${dest}` : "Where to stay";
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
        title={title}
        subtitle={[dates, args.guests ? `${args.guests} guests` : ""].filter(Boolean).join(" · ") || "Rates are estimates; check live prices"}
        status={status}
      />
      <CardRow
        kind="hotel"
        wide
        label={title}
        items={items.map((h, i) => ({ id: `${h.name}-${i}`, name: h.name, node: <HotelCard hotel={h} index={i} args={args} dest={dest} toolCallId={toolCallId} /> }))}
      />
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
            <CardShell highlighted={pin.isSelected} onMouseEnter={() => pin.hover(true)} onMouseLeave={() => pin.hover(false)} className="sm:flex-row">
              {/* From tablet width the card runs twice as wide with the photo as a column on the left, so the details fit on fewer lines. */}
              <CardPhoto
                place={pin.place}
                queries={[h.area ? `${h.area}, ${dest}` : "", dest]}
                alt={h.name ?? "Hotel"}
                className="aspect-[16/9] sm:aspect-auto sm:w-[240px] sm:shrink-0 sm:self-stretch"
                onOpen={pin.place ? pin.open : undefined}
              >
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
              <div className="flex min-w-0 flex-1 flex-col">
              <Body>
                <div className="flex items-start justify-between gap-2">
                  {/* One line: a long name is cut with an ellipsis; the full name is the tooltip and the panel's title. */}
                  <div className="min-w-0 truncate text-[15px] font-semibold" title={h.name}>
                    {h.name}
                  </div>
                  <Stars rating={h.rating} />
                </div>
                {/* Where and what it is, with Compare across from it. */}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate text-[13px] text-muted">
                    <Text value={[h.area, h.style].filter(Boolean).join(" · ")} />
                  </div>
                  <CompareToggle
                    pinKey={placeKey(toolCallId, index)}
                    name={h.name}
                    kind="hotel"
                    facts={[h.area, h.style, h.nightlyEstimateUsd ? `${usd(h.nightlyEstimateUsd)}/night est.` : "", h.rating ? `rated ${h.rating}` : ""].filter(Boolean).join(", ")}
                    place={pin.place}
                    size="sm"
                  />
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
                {/* Amenities, with the heads-ups folded into one chip at the end of the row. */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {(h.amenities ?? []).filter(Boolean).slice(0, 3).map((a) => (
                    <Tag key={a}>{a}</Tag>
                  ))}
                  <Tradeoffs items={h.tradeoffs} name={h.name} />
                </div>
                <TasteFit kind="hotel" name={h.name} category={pin.place?.category ?? h.style} text={[h.whyItFits, h.style, ...(h.amenities ?? [])].filter(Boolean).join(" ")} />
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
              {/* Rates and booking links live in the place panel (a tap on the photo). */}
              <CardActions>
                <AddToTripButton place={pin.place} primary />
                <ReactionControl name={h.name} kind="hotel" place={pin.place} destination={dest} source="card" size="sm" />
              </CardActions>
              </div>
            </CardShell>
  );
}
