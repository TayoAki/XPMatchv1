"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Lightbulb, Luggage, Sparkles } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import { useAgentContext, useFrontendTool } from "@copilotkit/react-core/v2";
import { formatDateRange, travelActions } from "@/lib/store";
import { mapActions } from "@/lib/map-store";
import { resolvePlaces } from "@/lib/places/client";
import type { MapPlace, ResolvedPlace } from "@/lib/places/types";
import type { TripDetail } from "@/lib/types";
import { addTripIdeasSchema, updateTripPlanSchema, type AddTripIdeasArgs, type Streaming, type UpdateTripPlanArgs } from "@/lib/travel/schemas";
import { useTripDetail } from "@/components/trips/useTripDetail";
import { useTripScope } from "@/components/trips/TripScope";

type RenderProps<T> = { args: Partial<T> | T; status: ToolCallStatus; result?: string };

function TripUpdatedChip({ args, status }: RenderProps<UpdateTripPlanArgs>) {
  const tripId = useTripScope();
  const a = args as Streaming<UpdateTripPlanArgs>;
  const changed = [
    a.title ? "title" : "",
    a.destination ? "destination" : "",
    a.startDate || a.endDate ? "dates" : "",
    a.travelers ? "travelers" : "",
    a.budgetTier ? "budget" : "",
    a.summary ? "summary" : "",
    a.itinerary?.length ? `itinerary (${a.itinerary.length} day${a.itinerary.length === 1 ? "" : "s"})` : "",
    a.preferences ? "preferences" : "",
  ].filter(Boolean);
  return (
    <div className="mt-2 inline-flex max-w-full items-start gap-2 rounded-2xl border border-border bg-surface/70 px-3 py-2 text-[13px]">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-semibold">{status === ToolCallStatus.Complete ? "Trip updated" : "Updating your trip…"}</div>
        {changed.length ? <div className="text-neutral-700">{changed.join(" · ")}</div> : null}
        {status === ToolCallStatus.Complete ? (
          <Link href={tripId ? `/trips/${tripId}` : "/trips"} className="font-semibold underline-offset-2 hover:underline">
            Open trip
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function IdeasAddedChip({ args, status }: RenderProps<AddTripIdeasArgs>) {
  const tripId = useTripScope();
  const items = ((args as Streaming<AddTripIdeasArgs>).items ?? []).filter((i) => i && i.name);
  return (
    <div className="mt-2 inline-flex max-w-full items-start gap-2 rounded-2xl border border-border bg-surface/70 px-3 py-2 text-[13px]">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-semibold">
          {status === ToolCallStatus.Complete ? `Added ${items.length} idea${items.length === 1 ? "" : "s"} to your trip` : "Adding to your trip ideas…"}
        </div>
        {items.length ? <div className="text-neutral-700">{items.map((i) => i.name).join(" · ")}</div> : null}
        {status === ToolCallStatus.Complete ? (
          <Link href={tripId ? `/trips/${tripId}` : "/trips"} className="font-semibold underline-offset-2 hover:underline">
            Open trip
          </Link>
        ) : null}
      </div>
    </div>
  );
}

const TripUpdatedRenderer = (props: RenderProps<UpdateTripPlanArgs>) => <TripUpdatedChip {...props} />;
const IdeasAddedRenderer = (props: RenderProps<AddTripIdeasArgs>) => <IdeasAddedChip {...props} />;

function cleanPatch(args: UpdateTripPlanArgs): UpdateTripPlanArgs {
  return Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined && v !== null && v !== "")) as UpdateTripPlanArgs;
}

/**
 * Mounted inside a chat that belongs to a trip: tells the assistant about the
 * trip, lets it edit the plan and add ideas, and pins the trip on the map.
 */
export function TripChatScope({ tripId, threadId }: { tripId: string; threadId?: string }) {
  const { trip, setTrip } = useTripDetail(tripId);

  const pins = useMemo<MapPlace[]>(
    () =>
      (trip?.items ?? []).flatMap((item) =>
        item.place ? [{ ...(item.place as ResolvedPlace), key: `trip-item:${item.id}`, toolCallId: "trip" }] : [],
      ),
    [trip?.items],
  );
  const place = trip?.place;

  useEffect(() => {
    if (!threadId || !trip) return;
    const current = mapActions.getState().threads[threadId];
    if (place && !current?.focus) mapActions.setFocus(threadId, place);
    const fresh = pins.filter((p) => !current?.places[p.key]);
    if (fresh.length) mapActions.addPlaces(threadId, fresh);
    // `trip` only gates on presence; the data used is `place` and `pins`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, place, pins, !!trip]);

  useAgentContext({
    description:
      "Trip currently being planned. The conversation is about this trip unless the traveler says otherwise. Change it with update_trip_plan and add places with add_trip_ideas (never create_trip for this trip).",
    value: trip
      ? {
          title: trip.title,
          destination: trip.destination,
          startDate: trip.startDate ?? "",
          endDate: trip.endDate ?? "",
          travelers: trip.travelers ?? 0,
          budgetTier: trip.budgetTier ?? "",
          summary: trip.summary ?? "",
          preferences: trip.preferences,
          members: trip.members.map((m) => m.name),
          ideas: trip.items.filter((i) => i.kind === "idea").map((i) => i.title).slice(0, 30),
          bookings: trip.items.filter((i) => i.kind === "booking").map((i) => i.title).slice(0, 20),
          itinerary: trip.itinerary.map((d) => ({ day: d.day, title: d.title, items: d.items })),
        }
      : { status: "loading" },
  });

  useFrontendTool(
    {
      name: "update_trip_plan",
      description:
        "Update the trip in context: title, destination, dates, travelers, budget tier, summary, the complete day-by-day itinerary, or trip preferences. Call it when the traveler agrees to a change or asks you to build or adjust the itinerary.",
      parameters: updateTripPlanSchema,
      followUp: true,
      handler: async (args) => {
        const patch = cleanPatch(args);
        if (Object.keys(patch).length === 0) return "Nothing to update.";
        const detail = await travelActions.patchTrip(tripId, patch);
        setTrip(detail);
        return `Trip "${detail.title}" updated (${Object.keys(patch).join(", ")}). Confirm in one short sentence and continue.`;
      },
      render: TripUpdatedRenderer,
    },
    [tripId, setTrip],
  );

  const destination = trip?.destination;
  useFrontendTool(
    {
      name: "add_trip_ideas",
      description:
        "Add specific places (hotels, restaurants, attractions) to this trip's Ideas list so they appear on the trip page and its map. Use it when the traveler wants to keep, save or add a place for this trip.",
      parameters: addTripIdeasSchema,
      followUp: true,
      handler: async ({ items }) => {
        const res = await resolvePlaces({
          destination,
          items: items.map((item, index) => ({ key: String(index), query: [item.name, destination].filter(Boolean).join(", "), kind: item.kind })),
        });
        let detail: TripDetail | null = null;
        const added: string[] = [];
        for (const [index, item] of items.entries()) {
          const resolved = res?.items.find((r) => r.key === String(index))?.place ?? undefined;
          detail = await travelActions.addTripItem(tripId, {
            kind: "idea",
            title: resolved?.name ?? item.name,
            note: item.note ?? "",
            url: resolved?.googleMapsUri,
            place: resolved ? { ...resolved, kind: item.kind } : undefined,
          });
          added.push(resolved?.name ?? item.name);
        }
        if (detail) setTrip(detail);
        return `Added to the trip's ideas: ${added.join(", ")}. Confirm in one short sentence.`;
      },
      render: IdeasAddedRenderer,
    },
    [tripId, destination, setTrip],
  );

  if (!trip) return null;
  const dates = formatDateRange(trip.startDate, trip.endDate);
  return (
    <div className="flex items-center gap-3 border-b border-border/60 bg-surface/60 px-4 py-2 text-[13px]">
      <Luggage className="h-4 w-4 shrink-0" />
      <span className="truncate font-semibold">Planning {trip.title}</span>
      <span className="truncate text-muted">{[trip.destination, dates].filter(Boolean).join(" · ")}</span>
      <Link href={`/trips/${trip.id}`} className="ml-auto shrink-0 font-semibold hover:underline">
        Open trip
      </Link>
    </div>
  );
}
