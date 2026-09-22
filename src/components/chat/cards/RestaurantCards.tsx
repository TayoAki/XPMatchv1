"use client";

import { ToolCallStatus } from "@copilotkit/core";
import type { ShowRestaurantsArgs, Streaming } from "@/lib/travel/schemas";
import { googleMapsSearchUrl } from "@/lib/travel/links";
import { placeKey, usePlacePin, useRegisterPlaces } from "@/components/map/useRegisterPlaces";
import { CardPhoto, AddToTripButton, Body, CardActions, CardRow, CardShell, SaveButton, SectionHeader, Tag, Text, Tradeoffs } from "./shared";
import { CompareToggle } from "./CompareControls";
import { HiddenPlaceCard, ReactionControl, useReaction } from "@/components/feedback/ReactionControl";
import { TasteFit } from "@/components/feedback/TasteFit";
import { MatchLine } from "@/components/recs/MatchLine";

export function RestaurantCards({ args, status, toolCallId }: { args: Streaming<ShowRestaurantsArgs>; status: ToolCallStatus; toolCallId: string }) {
  const items = (args.restaurants ?? []).filter((r) => r && r.name);
  const dest = args.destination ?? "";
  const title = dest ? `Where to eat in ${dest}` : "Where to eat";
  useRegisterPlaces({
    toolCallId,
    status,
    kind: "restaurant",
    destination: dest,
    items: items.map((r) => ({ name: r.name, hint: r.neighborhood })),
  });
  return (
    <div>
      <SectionHeader title={title} status={status} />
      <CardRow
        kind="restaurant"
        wide
        label={title}
        items={items.map((r, i) => ({ id: `${r.name}-${i}`, name: r.name, node: <RestaurantCard restaurant={r} index={i} dest={dest} toolCallId={toolCallId} /> }))}
      />
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
  const reaction = useReaction({ name: r.name, kind: "restaurant", place: pin.place, destination: dest });
  const query = `${r.name} ${dest}`.trim();
  if (reaction.current?.verdict === "disliked" && r.name) return <HiddenPlaceCard name={r.name} feedbackId={reaction.current.id} />;
  return (
            <CardShell highlighted={pin.isSelected} onMouseEnter={() => pin.hover(true)} onMouseLeave={() => pin.hover(false)} className="sm:flex-row">
              {/* Same shape as the hotel card: the photo on top on phones, a column on the left from tablet width. */}
              <CardPhoto
                place={pin.place}
                queries={[r.neighborhood ? `${r.neighborhood}, ${dest}` : "", dest]}
                alt={r.name ?? "Restaurant"}
                className="aspect-[16/9] sm:aspect-auto sm:w-[240px] sm:shrink-0 sm:self-stretch"
                onOpen={pin.place ? pin.open : undefined}
              >
                <SaveButton place={pin.place} kind="restaurant" title={r.name} subtitle={[r.cuisine, dest].filter(Boolean).join(" · ")} destination={dest} url={googleMapsSearchUrl(query)} className="absolute right-2 top-2" />
              </CardPhoto>
              <div className="flex min-w-0 flex-1 flex-col">
              <Body>
                {/* One line: a long name is cut with an ellipsis; the full name is the tooltip and the panel's title. */}
                <div className="min-w-0 truncate text-[15px] font-semibold" title={r.name}>
                  {r.name}
                </div>
                {/* Cuisine, area and price, with Compare across from it. */}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate text-[13px] text-muted">
                    <Text value={[r.cuisine, r.neighborhood, r.priceTier].filter(Boolean).join(" · ")} />
                  </div>
                  <CompareToggle
                    pinKey={placeKey(toolCallId, index)}
                    name={r.name}
                    kind="restaurant"
                    facts={[r.cuisine, r.neighborhood, r.priceTier].filter(Boolean).join(", ")}
                    place={pin.place}
                    size="sm"
                  />
                </div>
                <div className="text-[13px]">
                  <span className="font-medium">Must try: </span>
                  <Text value={r.mustTry} />
                </div>
                <p className="text-[13px] text-neutral-700">
                  <Text value={r.whyItFits} lines={2} />
                </p>
                {/* Tags, with the heads-ups folded into one chip at the end of the row. */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {r.bestFor ? <Tag>Best for {r.bestFor}</Tag> : null}
                  {r.reservationRecommended === true ? <Tag tone="warn">Book ahead</Tag> : null}
                  {r.reservationRecommended === false ? <Tag tone="accent">Walk-ins OK</Tag> : null}
                  <Tradeoffs items={r.tradeoffs} name={r.name} />
                </div>
                <TasteFit kind="restaurant" name={r.name} category={pin.place?.category ?? r.cuisine} text={[r.whyItFits, r.cuisine, r.bestFor, r.mustTry].filter(Boolean).join(" ")} />
                <MatchLine
                  name={r.name}
                  kind="restaurant"
                  place={pin.place}
                  destination={dest}
                  context="chat"
                  category={r.cuisine}
                  priceLevel={r.priceTier}
                  text={[r.whyItFits, r.cuisine, r.bestFor, r.mustTry, r.neighborhood].filter(Boolean).join(" ")}
                  tradeoffs={r.tradeoffs}
                  className="pt-1"
                />
              </Body>
              {/* Hours, maps and reservations live in the place panel (a tap on the photo). */}
              <CardActions>
                <AddToTripButton place={pin.place} primary />
                <ReactionControl name={r.name} kind="restaurant" place={pin.place} destination={dest} source="card" size="sm" />
              </CardActions>
              </div>
            </CardShell>
  );
}
