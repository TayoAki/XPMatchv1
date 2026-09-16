"use client";

import { useMemo } from "react";
import { useAgentContext, useConfigureSuggestions, useFrontendTool, useHumanInTheLoop } from "@copilotkit/react-core/v2";
import type { ToolCallStatus } from "@copilotkit/core";
import { travelActions, useTravelStore, type TravelerProfile, type Trip, type TripPlanner } from "@/lib/store";
import { useAppConfig } from "@/lib/app-config";
import {
  createTripSchema,
  showAttractionsSchema,
  showDestinationsSchema,
  showFlightsSchema,
  showHotelsSchema,
  showRestaurantsSchema,
  updateTravelerProfileSchema,
  type CreateTripArgs,
  type ShowAttractionsArgs,
  type ShowDestinationsArgs,
  type ShowFlightsArgs,
  type ShowHotelsArgs,
  type ShowRestaurantsArgs,
  type Streaming,
  type UpdateTravelerProfileArgs,
} from "@/lib/travel/schemas";
import { DestinationCards } from "@/components/chat/cards/DestinationCards";
import { HotelCards } from "@/components/chat/cards/HotelCards";
import { FlightCards } from "@/components/chat/cards/FlightCards";
import { RestaurantCards } from "@/components/chat/cards/RestaurantCards";
import { AttractionCards } from "@/components/chat/cards/AttractionCards";
import { TripProposalCard } from "@/components/chat/cards/TripProposalCard";
import { ProfileUpdatedChip } from "@/components/chat/cards/ProfileUpdatedChip";

type RenderProps<T> = { args: Partial<T> | T; status: ToolCallStatus; result?: string };

const CARDS_DONE =
  "Cards are now displayed to the traveler. Do not repeat their contents; add at most two short sentences of guidance or a natural next step.";

// Stable renderer components (defined once so React keeps card state across re-renders).
const DestinationsRenderer = ({ args, status }: RenderProps<ShowDestinationsArgs>) => (
  <DestinationCards args={args as Streaming<ShowDestinationsArgs>} status={status} />
);
const HotelsRenderer = ({ args, status }: RenderProps<ShowHotelsArgs>) => (
  <HotelCards args={args as Streaming<ShowHotelsArgs>} status={status} />
);
const FlightsRenderer = ({ args, status }: RenderProps<ShowFlightsArgs>) => (
  <FlightCards args={args as Streaming<ShowFlightsArgs>} status={status} />
);
const RestaurantsRenderer = ({ args, status }: RenderProps<ShowRestaurantsArgs>) => (
  <RestaurantCards args={args as Streaming<ShowRestaurantsArgs>} status={status} />
);
const AttractionsRenderer = ({ args, status }: RenderProps<ShowAttractionsArgs>) => (
  <AttractionCards args={args as Streaming<ShowAttractionsArgs>} status={status} />
);
const ProfileRenderer = ({ args, status }: RenderProps<UpdateTravelerProfileArgs>) => (
  <ProfileUpdatedChip args={args as Streaming<UpdateTravelerProfileArgs>} status={status} />
);
const TripRenderer = ({
  args,
  status,
  result,
  respond,
}: RenderProps<CreateTripArgs> & { respond?: (result: unknown) => Promise<void> }) => (
  <TripProposalCard args={args as Streaming<CreateTripArgs>} status={status} result={result} respond={respond} />
);

function nextMonthName(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("en-US", { month: "long" });
}

function upcomingTrip(trips: Trip[]): Trip | undefined {
  const today = new Date().toISOString().slice(0, 10);
  return trips
    .filter((t) => !t.endDate || t.endDate >= today)
    .sort((a, b) => (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999"))[0];
}

export function buildStaticSuggestions(profile: TravelerProfile, planner: TripPlanner, trips: Trip[]) {
  const home = profile.homeCity.trim();
  if (planner.where.trim()) {
    const where = planner.where.trim();
    const when = planner.startDate && planner.endDate ? ` from ${planner.startDate} to ${planner.endDate}` : "";
    return [
      { title: `Plan my ${where} trip`, message: `Plan a trip to ${where}${when} for ${planner.travelers || 2} travelers and create it when the plan is ready.` },
      { title: `Hotels in ${where}`, message: `Find hotels in ${where}${when} that fit my budget and style.` },
      { title: `Things to do in ${where}`, message: `What are the top things to do in ${where} for someone like me?` },
    ];
  }
  const trip = upcomingTrip(trips);
  if (trip) {
    return [
      { title: `Restaurants in ${trip.destination}`, message: `Recommend restaurants for my ${trip.title} trip to ${trip.destination}.` },
      { title: "Weather & packing", message: `What will the weather be like for my trip to ${trip.destination} and what should I pack?` },
      { title: `Day trips from ${trip.destination}`, message: `Suggest day trips from ${trip.destination} that fit my pace.` },
    ];
  }
  const style = profile.travelStyles[0]?.toLowerCase();
  return [
    { title: home ? `Weekends from ${home}` : "Weekend getaway ideas", message: home ? `Suggest weekend getaways within a short flight or drive of ${home}.` : "Suggest a few weekend getaway destinations for me." },
    { title: `Where to go in ${nextMonthName()}`, message: `Where should I travel in ${nextMonthName()}? Give me destinations that fit my profile.` },
    { title: style ? `Best ${style} trips` : "Surprise me", message: style ? `What are the best destinations for ${style} right now?` : "Surprise me with a destination that fits my profile and tell me why." },
  ];
}

/**
 * Registers everything the assistant knows and can do on the client:
 * traveler context, generative-UI tools, the human-in-the-loop trip flow and
 * personalized suggestions. Rendered once inside the providers.
 */
export function TravelCopilot() {
  const { profile, planner, saved, trips } = useTravelStore();
  const config = useAppConfig();
  const demo = config?.mode === "demo";

  useAgentContext({
    description: "Traveler profile: who the recommendations are for",
    value: {
      name: profile.name || "unknown",
      homeCity: profile.homeCity || "unknown",
      homeAirport: profile.homeAirport || "unknown",
      travelStyles: profile.travelStyles,
      pace: profile.pace,
      budgetTier: profile.budgetTier,
      usuallyTravelsWith: profile.companions,
      dietary: profile.dietary || "none stated",
      accommodationPreference: profile.accommodation || "none stated",
      notes: profile.notes || "",
    },
  });

  useAgentContext({
    description: "Trip planner values the traveler set in the app header (empty means not set)",
    value: {
      destination: planner.where,
      startDate: planner.startDate,
      endDate: planner.endDate,
      travelers: planner.travelers,
      budgetTier: planner.budgetTier,
    },
  });

  useAgentContext({
    description: "Items the traveler saved (favorites so far)",
    value: saved.slice(0, 30).map((s) => ({ kind: s.kind, title: s.title, destination: s.destination ?? "" })),
  });

  useAgentContext({
    description: "Trips the traveler already has",
    value: trips.slice(0, 10).map((t) => ({
      title: t.title,
      destination: t.destination,
      startDate: t.startDate ?? "",
      endDate: t.endDate ?? "",
      travelers: t.travelers ?? 0,
    })),
  });

  useAgentContext({
    description: "Current date and timezone for the traveler",
    value: {
      date: new Date().toISOString().slice(0, 10),
      weekday: new Date().toLocaleDateString("en-US", { weekday: "long" }),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  useFrontendTool(
    {
      name: "show_destinations",
      description:
        "Show destination recommendation cards (where to go). Use whenever suggesting places to travel; include 3-5 options with why each fits this traveler.",
      parameters: showDestinationsSchema,
      followUp: true,
      handler: async () => CARDS_DONE,
      render: DestinationsRenderer,
    },
    [],
  );

  useFrontendTool(
    {
      name: "show_hotels",
      description:
        "Show hotel / place-to-stay cards for a destination, with neighborhood, style, estimated nightly rate and why each fits. Include the traveler's dates and guest count when known so booking links are pre-filled.",
      parameters: showHotelsSchema,
      followUp: true,
      handler: async () => CARDS_DONE,
      render: HotelsRenderer,
    },
    [],
  );

  useFrontendTool(
    {
      name: "show_flights",
      description:
        "Show flight option cards between an origin and destination with realistic estimated round-trip prices, stops and duration. Use the traveler's home airport as origin when not specified.",
      parameters: showFlightsSchema,
      followUp: true,
      handler: async () => CARDS_DONE,
      render: FlightsRenderer,
    },
    [],
  );

  useFrontendTool(
    {
      name: "show_restaurants",
      description:
        "Show restaurant cards for a destination: cuisine, neighborhood, price tier, the dish to order and whether to book ahead. Respect dietary needs from the profile.",
      parameters: showRestaurantsSchema,
      followUp: true,
      handler: async () => CARDS_DONE,
      render: RestaurantsRenderer,
    },
    [],
  );

  useFrontendTool(
    {
      name: "show_attractions",
      description:
        "Show cards for things to do in a destination (sights, activities, neighborhoods, tours) with best time of day, typical duration and ticket notes.",
      parameters: showAttractionsSchema,
      followUp: true,
      handler: async () => CARDS_DONE,
      render: AttractionsRenderer,
    },
    [],
  );

  useFrontendTool(
    {
      name: "update_traveler_profile",
      description:
        "Remember lasting traveler preferences (name, home city/airport, travel styles, pace, budget tier, companions, dietary needs, accommodation preference, notes). Only include fields the traveler actually stated. travelStyles replaces the whole list.",
      parameters: updateTravelerProfileSchema,
      followUp: true,
      handler: async (args) => {
        const patch = Object.fromEntries(
          Object.entries(args).filter(([, v]) => v !== undefined && v !== null && v !== ""),
        ) as Partial<TravelerProfile>;
        travelActions.updateProfile(patch);
        return "Preferences saved to the traveler profile. Acknowledge in one short sentence and continue.";
      },
      render: ProfileRenderer,
    },
    [],
  );

  useHumanInTheLoop(
    {
      name: "create_trip",
      description:
        "Propose a complete trip (title, destination, dates if known, travelers, budget tier, summary and a day-by-day itinerary) for the traveler to confirm. The traveler saves or declines it in the UI; wait for that response.",
      parameters: createTripSchema,
      followUp: true,
      render: TripRenderer,
    },
    [],
  );

  const staticSuggestions = useMemo(() => buildStaticSuggestions(profile, planner, trips), [profile, planner, trips]);

  useConfigureSuggestions(
    {
      suggestions: staticSuggestions,
      available: "before-first-message",
    },
    [staticSuggestions],
  );

  useConfigureSuggestions(
    config === null
      ? null
      : {
          instructions: demo
            ? "Suggest three short next steps for planning this trip."
            : "Suggest 2-3 short next steps the traveler could ask for next, grounded in the conversation and their profile (for example: find hotels for the destination being discussed, compare flights from their home airport, restaurants near the chosen hotel, weather and packing, or turning the plan into a saved trip). Titles under six words; messages written in first person as the traveler would type them.",
          minSuggestions: 2,
          maxSuggestions: 3,
          available: "after-first-message",
        },
    [config, demo],
  );

  return null;
}
