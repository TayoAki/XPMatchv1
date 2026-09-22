"use client";

import { Clock, Ticket } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { ShowAttractionsArgs, Streaming } from "@/lib/travel/schemas";
import { googleMapsSearchUrl } from "@/lib/travel/links";
import { placeKey, usePlacePin, useRegisterPlaces } from "@/components/map/useRegisterPlaces";
import { CardPhoto, AddToTripButton, Body, CardActions, CardRow, CardShell, SaveButton, SectionHeader, Tag, Text, Tradeoffs } from "./shared";
import { CompareToggle } from "./CompareControls";
import { HiddenPlaceCard, ReactionControl, useReaction } from "@/components/feedback/ReactionControl";
import { TasteFit } from "@/components/feedback/TasteFit";
import { MatchLine } from "@/components/recs/MatchLine";

export function AttractionCards({ args, status, toolCallId }: { args: Streaming<ShowAttractionsArgs>; status: ToolCallStatus; toolCallId: string }) {
  const items = (args.attractions ?? []).filter((a) => a && a.name);
  const dest = args.destination ?? "";
  const title = dest ? `Things to do in ${dest}` : "Things to do";
  useRegisterPlaces({
    toolCallId,
    status,
    kind: "attraction",
    destination: dest,
    items: items.map((a) => ({ name: a.name, hint: a.neighborhood })),
  });
  return (
    <div>
      <SectionHeader title={title} status={status} />
      <CardRow
        kind="attraction"
        label={title}
        items={items.map((a, i) => ({ id: `${a.name}-${i}`, name: a.name, node: <AttractionCard attraction={a} index={i} dest={dest} toolCallId={toolCallId} /> }))}
      />
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
  const reaction = useReaction({ name: a.name, kind: "attraction", place: pin.place, destination: dest });
  const query = `${a.name} ${dest}`.trim();
  if (reaction.current?.verdict === "disliked" && a.name) return <HiddenPlaceCard name={a.name} feedbackId={reaction.current.id} />;
  return (
            <CardShell highlighted={pin.isSelected} onMouseEnter={() => pin.hover(true)} onMouseLeave={() => pin.hover(false)}>
              <CardPhoto place={pin.place} queries={[a.name ?? "", dest]} alt={a.name ?? "Attraction"} className="aspect-[16/9]" onOpen={pin.place ? pin.open : undefined}>
                <SaveButton place={pin.place} kind="attraction" title={a.name} subtitle={[a.category, dest].filter(Boolean).join(" · ")} destination={dest} url={googleMapsSearchUrl(query)} className="absolute right-2 top-2" />
                {a.category ? <span className="absolute left-3 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[12px] font-semibold">{a.category}</span> : null}
              </CardPhoto>
              <Body>
                <div className="text-[15px] font-semibold">{a.name}</div>
                {/* The area, with Compare across from it. */}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate text-[13px] text-muted">
                    <Text value={[a.neighborhood, a.category].filter(Boolean).join(" · ")} />
                  </div>
                  <CompareToggle
                    pinKey={placeKey(toolCallId, index)}
                    name={a.name}
                    kind="attraction"
                    facts={[a.category, a.neighborhood, a.durationHours ? `${a.durationHours}h` : "", a.ticketNote].filter(Boolean).join(", ")}
                    place={pin.place}
                    size="sm"
                  />
                </div>
                <p className="text-[13px] text-neutral-700">
                  <Text value={a.description} lines={2} />
                </p>
                {a.whyItFits ? <p className="text-[13px] text-neutral-600">{a.whyItFits}</p> : null}
                {/* Tags, with the heads-ups folded into one chip at the end of the row. */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
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
                  <Tradeoffs items={a.tradeoffs} name={a.name} />
                </div>
                <TasteFit kind="attraction" name={a.name} category={pin.place?.category ?? a.category} text={[a.description, a.whyItFits, a.category].filter(Boolean).join(" ")} />
                <MatchLine
                  name={a.name}
                  kind="attraction"
                  place={pin.place}
                  destination={dest}
                  context="chat"
                  category={a.category}
                  priceLevel={a.ticketNote && /free/i.test(a.ticketNote) ? "Free" : undefined}
                  text={[a.description, a.whyItFits, a.category, a.neighborhood, a.bestTimeOfDay].filter(Boolean).join(" ")}
                  tradeoffs={a.tradeoffs}
                  className="pt-1"
                />
              </Body>
              {/* Maps and tickets live in the place panel (a tap on the photo). */}
              <CardActions>
                <AddToTripButton place={pin.place} primary />
                <ReactionControl name={a.name} kind="attraction" place={pin.place} destination={dest} source="card" size="sm" />
              </CardActions>
            </CardShell>
  );
}
