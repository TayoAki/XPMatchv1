"use client";

import { photoCreditTitle } from "@/components/ui/PhotoCredit";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Bed, Calendar, Check, Clock, Landmark, MapPin, Star, StickyNote, Users, Utensils, Wallet } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { CreateTripArgs, Streaming } from "@/lib/travel/schemas";
import { formatDateRange, useTravelStore } from "@/lib/store";
import { daysFromModel, type ModelStop } from "@/lib/itinerary";
import { useHitlPendingMarker } from "@/lib/hitl-store";
import { candidateFromPlace } from "@/lib/match";
import type { PlaceKind } from "@/lib/places/types";
import { shortPlaceName } from "@/lib/places/names";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { Button } from "@/components/ui/Button";
import { usePlacePin, useRegisterPlaces } from "@/components/map/useRegisterPlaces";
import { MatchBadge, useMatch } from "@/components/recs/MatchBadge";
import { useUiState } from "@/components/providers/UiState";
import { useMediaQuery } from "@/lib/use-media-query";
import { CardShell, Skeleton, Tag } from "./shared";

interface TripProposalCardProps {
  args: Streaming<CreateTripArgs>;
  status: ToolCallStatus;
  result?: string;
  toolCallId: string;
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

type StreamStop = NonNullable<NonNullable<Streaming<CreateTripArgs>["itinerary"]>[number]["stops"]>[number];

interface FlatStop {
  index: number;
  stop: StreamStop;
}

const KIND_ICON: Record<PlaceKind, typeof Bed> = { hotel: Bed, restaurant: Utensils, attraction: Landmark, destination: MapPin };

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** One stop of the proposal with the details of its pin once the place resolved: photo, rating, category, price and match. */
function ProposalStop({ stop, index, toolCallId, destination }: { stop: StreamStop; index: number; toolCallId: string; destination: string }) {
  const pin = usePlacePin(toolCallId, index);
  const place = pin.place;
  const candidate = useMemo(() => (place ? candidateFromPlace(place) : null), [place]);
  const match = useMatch(candidate);
  const [failed, setFailed] = useState(false);
  const kind = (stop.kind ?? place?.kind) as PlaceKind | undefined;
  // While the arguments stream, `kind` can be a partial string; never hand React an undefined component.
  const Icon = (kind ? KIND_ICON[kind] : undefined) ?? StickyNote;
  const photo = place?.photos?.[0];
  const meta = [place?.category, place?.priceLevel].filter(Boolean).join(" · ");
  return (
    <li className="flex min-w-0 gap-2.5 rounded-xl bg-white p-2" data-testid="proposal-stop" onMouseEnter={() => pin.hover(true)} onMouseLeave={() => pin.hover(false)}>
      {photo && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
        <img src={photo} alt="" title={photoCreditTitle(place?.photoCredits?.[0])} onError={() => setFailed(true)} className="h-12 w-12 shrink-0 rounded-lg object-cover" loading="lazy" />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface text-neutral-500">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          {/* min-w-0 lets the name truncate on phones; the badge keeps its width. */}
          {place ? (
            <button type="button" onClick={pin.open} className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold hover:underline" title={`Show ${place.name} on the map`}>
              {stop.name ? shortPlaceName(stop.name) : null}
            </button>
          ) : (
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{stop.name}</span>
          )}
          {match ? (
            <span className="shrink-0">
              <MatchBadge match={match} size="sm" />
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
          {stop.startTime ? (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Clock className="h-3 w-3" /> {stop.startTime}
              {stop.durationMin ? ` · ${formatDuration(stop.durationMin)}` : ""}
            </span>
          ) : stop.durationMin ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatDuration(stop.durationMin)}
            </span>
          ) : null}
          {place?.rating ? (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Star className="h-3 w-3 fill-current" /> {place.rating.toFixed(1)}
            </span>
          ) : null}
          {meta ? <span className="min-w-0 truncate">{meta}</span> : null}
          {!place && kind ? <span className="italic">Finding it in {destination || "the destination"}…</span> : null}
        </div>
        {stop.note ? <div className="text-[12px] text-neutral-600">{stop.note}</div> : null}
        {place?.summary ? <div className="line-clamp-2 text-[12px] text-neutral-500">{place.summary}</div> : null}
      </div>
    </li>
  );
}

/**
 * Human-in-the-loop card: the model proposes a trip, the traveler confirms it
 * and it is saved to "Trips". The stops resolve through Places and pin on the
 * map while the traveler decides, so each line carries the real card facts.
 */
export function TripProposalCard({ args, status, result, toolCallId, respond }: TripProposalCardProps) {
  const { addTrip } = useTravelStore();
  const { openBoardSheet } = useUiState();
  // Without a side column the board opens as a sheet over the chat instead of leaving it.
  const wide = useMediaQuery("(min-width: 1280px)");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const outcome = parseResult(result);
  useHitlPendingMarker(toolCallId, status);
  const days = (args.itinerary ?? []).filter((d) => d && d.day !== undefined);
  const dates = formatDateRange(args.startDate, args.endDate);
  const canRespond = status === ToolCallStatus.Executing && !!respond;
  const destination = args.destination ?? "";

  // Every stop gets a stable flat index; only stops with a kind are real places to pin.
  const flat = useMemo(() => {
    const out: FlatStop[] = [];
    let index = 0;
    for (const d of days) for (const st of d.stops ?? []) out.push({ index: index++, stop: st });
    return out;
  }, [days]);
  useRegisterPlaces({
    toolCallId,
    status,
    kind: "attraction",
    destination,
    items: flat.map(({ stop }) => ({ name: stop && stop.kind && stop.name ? stop.name : undefined, kind: stop?.kind as PlaceKind | undefined })),
    readyStatuses: [ToolCallStatus.Executing, ToolCallStatus.Complete],
  });

  const save = async () => {
    if (!respond || !args.title || !args.destination) return;
    setBusy(true);
    try {
      const trip = await addTrip({
        title: args.title,
        destination: args.destination,
        startDate: args.startDate,
        endDate: args.endDate,
        travelers: args.travelers,
        budgetTier: args.budgetTier,
        summary: args.summary,
        itinerary: daysFromModel(
          days.map((d) => ({
            day: d.day ?? 0,
            title: d.title,
            stops: (d.stops ?? []).flatMap<ModelStop>((st) =>
              st && st.name ? [{ name: st.name, kind: st.kind, note: st.note, startTime: st.startTime, durationMin: st.durationMin }] : [],
            ),
          })),
        ),
      });
      await respond({ created: true, tripId: trip.id, note: "Trip saved to the traveler's Trips page. Confirm in one short sentence and offer a next step." });
    } catch (err) {
      console.error("XPMatch: saving trip failed", err);
      await respond({ created: false, note: "Saving the trip failed on the server. Apologize briefly and offer to try again." });
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    if (!respond) return;
    setBusy(true);
    await respond({ created: false, note: "Traveler did not save the trip. Ask what they would like to change." });
    setBusy(false);
  };

  let cursor = 0;
  return (
    <CardShell className="mt-2" data-testid="trip-proposal">
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
                  <ul className="mt-2 grid gap-1.5">
                    {(d.stops ?? []).map((st, j) => {
                      const index = cursor++;
                      if (!st || !st.name) return null;
                      return <ProposalStop key={`${index}-${j}`} stop={st} index={index} toolCallId={toolCallId} destination={destination} />;
                    })}
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
            outcome.tripId && !wide ? (
              <button
                type="button"
                onClick={() => openBoardSheet(outcome.tripId!)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-[13px] font-medium text-emerald-700"
              >
                <Check className="h-4 w-4" /> Saved to Trips · open the board
              </button>
            ) : (
              <Link href={outcome.tripId ? `/trips/${outcome.tripId}?view=board` : "/trips"} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-[13px] font-medium text-emerald-700">
                <Check className="h-4 w-4" /> Saved to Trips · open the board
              </Link>
            )
          ) : null}
          {status === ToolCallStatus.Complete && outcome.created === false ? <Tag>Not saved</Tag> : null}
          {status === ToolCallStatus.InProgress ? <Tag>Drafting itinerary…</Tag> : null}
        </div>
      </div>
    </CardShell>
  );
}
