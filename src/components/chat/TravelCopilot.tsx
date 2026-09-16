"use client";

import { useEffect, useMemo, useState } from "react";
import { useAgentContext, useConfigureSuggestions, useFrontendTool, useHumanInTheLoop } from "@copilotkit/react-core/v2";
import type { ToolCallStatus } from "@copilotkit/core";
import { travelActions, useTravelStore, type LearnedPreference, type TravelerProfile, type Trip, type TripPlanner } from "@/lib/store";
import { useAppConfig } from "@/lib/app-config";
import { useHitlPending } from "@/lib/hitl-store";
import { mapActions, useMapView } from "@/lib/map-store";
import { resolvePlaces } from "@/lib/places/client";
import {
  askAboutPlaceSchema,
  compareOptionsSchema,
  createTripSchema,
  focusMapSchema,
  recordFeedbackSchema,
  rememberPreferenceSchema,
  setSearchConstraintsSchema,
  showAttractionsSchema,
  showDestinationsSchema,
  showFlightsSchema,
  showHotelsSchema,
  showRestaurantsSchema,
  updateTravelerProfileSchema,
  type AskAboutPlaceArgs,
  type CompareOptionsArgs,
  type CreateTripArgs,
  type FocusMapArgs,
  type RecordFeedbackArgs,
  type RememberPreferenceArgs,
  type SetSearchConstraintsArgs,
  type ShowAttractionsArgs,
  type ShowDestinationsArgs,
  type ShowFlightsArgs,
  type ShowHotelsArgs,
  type ShowRestaurantsArgs,
  type Streaming,
  type UpdateTravelerProfileArgs,
} from "@/lib/travel/schemas";
import { constraintActions, useConstraints } from "@/lib/constraints-store";
import { DestinationCards } from "@/components/chat/cards/DestinationCards";
import { HotelCards } from "@/components/chat/cards/HotelCards";
import { FlightCards } from "@/components/chat/cards/FlightCards";
import { RestaurantCards } from "@/components/chat/cards/RestaurantCards";
import { AttractionCards } from "@/components/chat/cards/AttractionCards";
import { TripProposalCard } from "@/components/chat/cards/TripProposalCard";
import { ProfileUpdatedChip } from "@/components/chat/cards/ProfileUpdatedChip";
import { FocusCallout } from "@/components/chat/cards/FocusCallout";
import { ConstraintChips } from "@/components/chat/cards/ConstraintChips";
import { ComparisonCard } from "@/components/chat/cards/ComparisonCard";
import { RememberPreferenceCard } from "@/components/chat/cards/RememberPreferenceCard";
import { PlaceAnswerCard } from "@/components/chat/cards/PlaceAnswerCard";
import { FeedbackChip } from "@/components/chat/cards/FeedbackChip";
import { tasteForContext } from "@/lib/feedback/taste";
import type { ResolvedPlace } from "@/lib/places/types";
import { api } from "@/lib/api";

type RenderProps<T> = { args: Partial<T> | T; status: ToolCallStatus; result?: string; toolCallId: string };

const CARDS_DONE =
  "Cards are now displayed to the traveler. Do not repeat their contents; add at most two short sentences of guidance or a natural next step.";

// Stable renderer components (defined once so React keeps card state across re-renders).
const DestinationsRenderer = ({ args, status, toolCallId }: RenderProps<ShowDestinationsArgs>) => (
  <DestinationCards args={args as Streaming<ShowDestinationsArgs>} status={status} toolCallId={toolCallId} />
);
const HotelsRenderer = ({ args, status, toolCallId }: RenderProps<ShowHotelsArgs>) => (
  <HotelCards args={args as Streaming<ShowHotelsArgs>} status={status} toolCallId={toolCallId} />
);
const FlightsRenderer = ({ args, status }: RenderProps<ShowFlightsArgs>) => (
  <FlightCards args={args as Streaming<ShowFlightsArgs>} status={status} />
);
const RestaurantsRenderer = ({ args, status, toolCallId }: RenderProps<ShowRestaurantsArgs>) => (
  <RestaurantCards args={args as Streaming<ShowRestaurantsArgs>} status={status} toolCallId={toolCallId} />
);
const AttractionsRenderer = ({ args, status, toolCallId }: RenderProps<ShowAttractionsArgs>) => (
  <AttractionCards args={args as Streaming<ShowAttractionsArgs>} status={status} toolCallId={toolCallId} />
);
const FocusRenderer = ({ args, status }: RenderProps<FocusMapArgs>) => (
  <FocusCallout args={args as Streaming<FocusMapArgs>} status={status} />
);
const ProfileRenderer = ({ args, status }: RenderProps<UpdateTravelerProfileArgs>) => (
  <ProfileUpdatedChip args={args as Streaming<UpdateTravelerProfileArgs>} status={status} />
);
const TripRenderer = ({
  args,
  status,
  result,
  toolCallId,
  respond,
}: RenderProps<CreateTripArgs> & { respond?: (result: unknown) => Promise<void> }) => (
  <TripProposalCard args={args as Streaming<CreateTripArgs>} status={status} result={result} toolCallId={toolCallId} respond={respond} />
);
const ConstraintsRenderer = ({ args, status, toolCallId }: RenderProps<SetSearchConstraintsArgs>) => (
  <ConstraintChips args={args as Streaming<SetSearchConstraintsArgs>} status={status} toolCallId={toolCallId} />
);
const CompareRenderer = ({ args, status, toolCallId }: RenderProps<CompareOptionsArgs>) => (
  <ComparisonCard args={args as Streaming<CompareOptionsArgs>} status={status} toolCallId={toolCallId} />
);
const AskRenderer = ({ args, status, result }: RenderProps<AskAboutPlaceArgs>) => (
  <PlaceAnswerCard args={args as Streaming<AskAboutPlaceArgs>} status={status} result={result} />
);
const RememberRenderer = ({
  args,
  status,
  result,
  toolCallId,
  respond,
}: RenderProps<RememberPreferenceArgs> & { respond?: (result: unknown) => Promise<void> }) => (
  <RememberPreferenceCard args={args as Streaming<RememberPreferenceArgs>} status={status} result={result} toolCallId={toolCallId} respond={respond} />
);
const FeedbackRenderer = ({ args, status }: RenderProps<RecordFeedbackArgs>) => <FeedbackChip args={args as Streaming<RecordFeedbackArgs>} status={status} />;

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

/** Trails `value` by `delayMs`; used to keep suggestion configs stable while a run is in flight. */
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Registers everything the assistant knows and can do on the client:
 * traveler context, generative-UI tools, the human-in-the-loop trip flow and
 * personalized suggestions. Rendered once inside the providers.
 */
/** Learned preferences as the model sees them: grouped by polarity, one line each. */
export function preferencesForContext(preferences: LearnedPreference[], tripId?: string | null) {
  const scoped = preferences.filter((p) => (tripId ? p.tripId === tripId : !p.tripId)).slice(0, 60);
  const line = (p: LearnedPreference) => `${p.statement} (${p.domain})`;
  return {
    dealbreakers: scoped.filter((p) => p.polarity === "dealbreaker").map(line),
    likes: scoped.filter((p) => p.polarity === "like").map(line),
    dislikes: scoped.filter((p) => p.polarity === "dislike").map(line),
  };
}

export function TravelCopilot() {
  const { profile, planner, saved, trips, preferences, feedback, taste } = useTravelStore();
  const config = useAppConfig();
  const demo = config?.mode === "demo";
  const mapView = useMapView();

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
      learnFromChat: profile.learnFromChat,
    },
  });

  const learned = useMemo(() => preferencesForContext(preferences), [preferences]);
  useAgentContext({
    description:
      "Learned preferences (profile-wide). Dealbreakers must never be violated silently: check every pick against them and call out any conflict in the card's tradeoffs. Likes and dislikes steer picks.",
    value: learned,
  });

  const tasteContext = useMemo(() => tasteForContext(taste, feedback), [taste, feedback]);
  useAgentContext({
    description:
      "Taste profile: places the traveler loved or found not for them, the reasons that keep coming up per domain, and their latest reactions. Lean toward what they loved (say so in whyItFits), avoid disliked patterns, and never re-recommend a place marked not for them unless asked.",
    value: tasteContext,
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
    description: "Map panel: destination in focus and places already pinned (do not repeat pinned places unless asked)",
    value: {
      focus: mapView.focus ? { name: mapView.focus.name, locality: mapView.focus.locality ?? "" } : "none",
      pinned: mapView.placeList.slice(0, 25).map((p) => ({ name: p.name, kind: p.kind })),
    },
  });

  const constraints = useConstraints(mapView.threadId);
  useAgentContext({
    description: "Active search constraints (the chips the traveler currently sees; honor hard ones, prefer soft ones, until they change topic)",
    value: constraints
      ? {
          searching: constraints.kind,
          hard: constraints.constraints.filter((c) => c.hard).map((c) => c.label),
          soft: constraints.constraints.filter((c) => !c.hard).map((c) => c.label),
          notUnderstood: constraints.notUnderstood,
        }
      : "none",
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
      name: "focus_map",
      description:
        "Center the live map on the destination the traveler is talking about. Call it as soon as a place is clear (correct typos, e.g. 'roam' → 'Rome, Italy') and again whenever the destination changes. Use 'City, Country' as it appears on Google Maps.",
      parameters: focusMapSchema,
      followUp: true,
      handler: async ({ location }) => {
        const threadId = mapActions.activeThreadId();
        // Resolve in the background so the tool result is appended right away; the map, chat title
        // and planner update as soon as the lookup returns.
        void resolvePlaces({ items: [{ key: "focus", query: location, kind: "destination" }] }).then((res) => {
          const place = res?.items[0]?.place ?? null;
          if (!place) return;
          if (threadId) {
            mapActions.setFocus(threadId, place);
            travelActions.upsertChat({ id: threadId, title: `Exploring ${place.name}` });
          }
          if (travelActions.getPlanner().where !== place.name) travelActions.updatePlanner({ where: place.name });
        });
        return `Centering the map on ${location}. Recommendations you show will be pinned there. Continue.`;
      },
      render: FocusRenderer,
    },
    [],
  );

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

  useFrontendTool(
    {
      name: "set_search_constraints",
      description:
        "Show the traveler how you understood their search criteria, as editable chips, BEFORE calling a card tool. One chip per criterion (budget, area, amenity, vibe, dietary, timing, distance, other); hard = stated requirement, soft = preference. Put phrases you could not map into notUnderstood.",
      parameters: setSearchConstraintsSchema,
      followUp: true,
      handler: async (args, context) => {
        const threadId = context.agent?.threadId ?? mapActions.activeThreadId();
        if (threadId) {
          constraintActions.set(threadId, {
            kind: args.kind,
            constraints: args.constraints,
            notUnderstood: args.notUnderstood ?? [],
            toolCallId: context.toolCall.id,
          });
        }
        const hard = args.constraints.filter((c) => c.hard).map((c) => c.label);
        return `Chips shown to the traveler${hard.length ? ` (must have: ${hard.join(", ")})` : ""}. Now call the card tool with results that satisfy every hard chip; do not list the chips again in text.`;
      },
      render: ConstraintsRenderer,
    },
    [],
  );

  useFrontendTool(
    {
      name: "compare_options",
      description:
        "Compare two or three specific options side by side on this traveler's priorities. Use it when asked to compare, or when a 'Compare these options' message arrives. Verdicts: strong / ok / weak / unknown; never guess facts you do not know (put them in unknowns).",
      parameters: compareOptionsSchema,
      followUp: true,
      handler: async () =>
        "The comparison is displayed with map links, save and add-to-trip actions per option. Do not repeat the table; add at most two sentences.",
      render: CompareRenderer,
    },
    [],
  );

  useFrontendTool(
    {
      name: "ask_about_place",
      description:
        "Answer a question about one specific hotel, restaurant or attraction (noise, workspace, kids, dogs, booking, crowds, accessibility, timing…) from Google's reviews, review summary and attributes. Call it whenever the traveler asks something about a specific place; the card shows the answer with verbatim quotes.",
      parameters: askAboutPlaceSchema,
      followUp: true,
      handler: async (args) => {
        const threadId = mapActions.activeThreadId();
        const pinned = threadId ? mapActions.getState().threads[threadId]?.places : undefined;
        const match = pinned ? Object.values(pinned).find((p) => p.name.toLowerCase() === args.name.toLowerCase()) : undefined;
        const destination = args.destination ?? (threadId ? mapActions.getState().threads[threadId]?.focus?.name : undefined);
        try {
          const answer = await api<{ answer: string; confidence: string; basis: string; refs: unknown[]; evidence: unknown; placeId: string; name: string; question: string }>(
            "/api/places/ask",
            { method: "POST", json: { placeId: match?.id, name: args.name, kind: args.kind ?? match?.kind, destination, question: args.question } },
          );
          return JSON.stringify({ ...answer, guidance: "The answer card with quotes is displayed. Add at most one sentence; do not repeat the quotes." });
        } catch (err) {
          return JSON.stringify({ error: err instanceof Error ? err.message : "Could not answer", guidance: "Tell the traveler briefly that the reviews could not be checked." });
        }
      },
      render: AskRenderer,
    },
    [],
  );

  useFrontendTool(
    {
      name: "record_feedback",
      description:
        "Record how a specific place was for the traveler ('the Artemide was too noisy', 'we loved Da Enzo'): a verdict (loved / fine / disliked) with short reasons. Saved immediately; it shapes future picks. Not for hypotheticals or places they have not been to.",
      parameters: recordFeedbackSchema,
      followUp: true,
      handler: async (args) => {
        const threadId = mapActions.activeThreadId();
        const thread = threadId ? mapActions.getState().threads[threadId] : undefined;
        const pinned = thread ? Object.values(thread.places) : [];
        let place: ResolvedPlace | undefined = pinned.find((p) => p.name.toLowerCase() === args.name.toLowerCase());
        const destination = args.destination ?? thread?.focus?.name;
        if (!place) {
          const res = await resolvePlaces({ destination, items: [{ key: "0", query: [args.name, destination].filter(Boolean).join(", "), kind: args.kind }] }).catch(() => null);
          place = res?.items[0]?.place ?? undefined;
        }
        try {
          const saved = await travelActions.recordFeedback({
            name: place?.name ?? args.name,
            kind: args.kind,
            place,
            destination,
            verdict: args.verdict,
            reasons: args.reasons ?? [],
            note: args.note ?? "",
            source: "chat",
          });
          return `Recorded: ${saved.name} — ${saved.verdict}${saved.reasons.length ? ` (${saved.reasons.join(", ")})` : ""}. Acknowledge in one short line; do not repeat the details.`;
        } catch (err) {
          return `Could not record the reaction (${err instanceof Error ? err.message : "error"}). Apologize briefly.`;
        }
      },
      render: FeedbackRenderer,
    },
    [],
  );

  useHumanInTheLoop(
    {
      name: "remember_preference",
      description:
        "Offer to remember a lasting taste the traveler revealed in passing (e.g. 'Prefers boutique hotels'). The traveler picks Always, For this trip or No thanks in the UI; wait for that response and acknowledge it in one line. Only when the profile says learnFromChat is true.",
      parameters: rememberPreferenceSchema,
      followUp: true,
      available: profile.learnFromChat,
      render: RememberRenderer,
    },
    [profile.learnFromChat],
  );

  const debouncedPlanner = useDebounced(planner, 1500);
  const staticSuggestions = useMemo(
    () => buildStaticSuggestions(profile, debouncedPlanner, trips),
    [profile, debouncedPlanner, trips],
  );

  useConfigureSuggestions(
    {
      suggestions: staticSuggestions,
      available: "before-first-message",
    },
    [staticSuggestions],
  );

  // No follow-up suggestions while a proposal or "remember this?" card waits for a click: the
  // suggestions run would send the model a tool call without a result, which providers reject.
  const hitlPending = useHitlPending();
  useConfigureSuggestions(
    config === null
      ? null
      : {
          instructions: demo
            ? "Suggest three short next steps for planning this trip."
            : "Suggest 2-3 short next steps the traveler could ask for next, grounded in the conversation and their profile (for example: find hotels for the destination being discussed, compare flights from their home airport, restaurants near the chosen hotel, weather and packing, or turning the plan into a saved trip). Titles under six words; messages written in first person as the traveler would type them.",
          minSuggestions: 2,
          maxSuggestions: 3,
          available: hitlPending ? "disabled" : "after-first-message",
        },
    [config, demo, hitlPending],
  );

  return null;
}
