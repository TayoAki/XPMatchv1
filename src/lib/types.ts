import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";

export type BudgetTier = "budget" | "mid-range" | "premium" | "luxury";
export type Pace = "relaxed" | "balanced" | "packed";
export type Companions = "solo" | "partner" | "family" | "friends" | "mixed";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  handle: string;
}

export interface TravelerProfile {
  name: string;
  homeCity: string;
  homeAirport: string;
  travelStyles: string[];
  pace: Pace;
  budgetTier: BudgetTier;
  companions: Companions;
  dietary: string;
  accommodation: string;
  notes: string;
  /** When false the assistant never offers to remember things said in chat. */
  learnFromChat: boolean;
  onboarded: boolean;
}

export type PreferenceDomain = "stays" | "food" | "flights" | "activities" | "general";
export type PreferencePolarity = "like" | "dislike" | "dealbreaker";
export type PreferenceSource = "onboarding" | "chat" | "feedback";

/** One thing XPMatch has learned about the traveler ("prefers boutique hotels", "no early flights"). */
export interface LearnedPreference {
  id: string;
  /** Set when the preference only applies to one trip. */
  tripId?: string;
  domain: PreferenceDomain;
  polarity: PreferencePolarity;
  statement: string;
  source: PreferenceSource;
  createdAt: string;
}

export const PREFERENCE_DOMAINS: PreferenceDomain[] = ["stays", "food", "flights", "activities", "general"];
export const PREFERENCE_POLARITIES: PreferencePolarity[] = ["like", "dislike", "dealbreaker"];

export const DOMAIN_LABEL: Record<PreferenceDomain, string> = {
  stays: "Stays",
  food: "Food",
  flights: "Flights",
  activities: "Things to do",
  general: "General",
};

/** Onboarding "what ruins a trip for you?" chips; stored as dealbreaker preferences. */
export const DEALBREAKER_OPTIONS: { statement: string; domain: PreferenceDomain }[] = [
  { statement: "Street noise at night", domain: "stays" },
  { statement: "No desk or workspace in the room", domain: "stays" },
  { statement: "Stairs with no elevator", domain: "stays" },
  { statement: "Shared bathrooms", domain: "stays" },
  { statement: "Far from the center", domain: "stays" },
  { statement: "No air conditioning", domain: "stays" },
  { statement: "Tiny rooms", domain: "stays" },
  { statement: "Big crowds and tourist traps", domain: "activities" },
  { statement: "Early starts", domain: "activities" },
  { statement: "Long transfers and layovers", domain: "flights" },
  { statement: "Red-eye flights", domain: "flights" },
  { statement: "Very spicy food", domain: "food" },
];

export interface TripPlanner {
  where: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budgetTier: BudgetTier | "";
}

export type SavedKind = "destination" | "hotel" | "flight" | "restaurant" | "attraction" | "guide";

export interface SavedItem {
  id: string;
  kind: SavedKind;
  title: string;
  subtitle?: string;
  destination?: string;
  url?: string;
  /** Guide id for saved guides, Google place id for places. */
  refId?: string;
  place?: ResolvedPlace;
  savedAt: string;
}

/** One stop of a day: a place (when resolved) or a text-only line, with optional timing. */
export interface ItineraryStop {
  id: string;
  title: string;
  note: string;
  kind?: PlaceKind;
  place?: ResolvedPlace;
  /** "HH:MM" local time. */
  startTime?: string;
  durationMin?: number;
  /** The trip idea this stop was scheduled from, when any. */
  itemId?: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  stops: ItineraryStop[];
}

export type TripRole = "owner" | "editor" | "viewer";

export interface TripMember {
  userId: string;
  name: string;
  handle: string;
  email: string;
  role: TripRole;
}

export type TripItemKind = "idea" | "booking" | "media";

export interface TripItem {
  id: string;
  kind: TripItemKind;
  title: string;
  note: string;
  url?: string;
  place?: ResolvedPlace;
  addedBy?: string;
  createdAt: string;
}

export interface Trip {
  id: string;
  ownerId: string;
  role: TripRole;
  title: string;
  destination: string;
  place?: ResolvedPlace;
  startDate?: string;
  endDate?: string;
  travelers?: number;
  budgetTier?: string;
  summary?: string;
  itinerary: ItineraryDay[];
  preferences: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TripDetail extends Trip {
  members: TripMember[];
  items: TripItem[];
  chats: ChatSummary[];
}

export interface ChatSummary {
  id: string;
  title: string;
  tripId?: string;
  createdAt: string;
  updatedAt: string;
}

export type UpdateKind = "trip_invite" | "trip_activity" | "guide_saved" | "system";

export interface UpdateItem {
  id: string;
  kind: UpdateKind;
  text: string;
  at: string;
  read: boolean;
  data?: Record<string, unknown>;
}

export interface GuideItem {
  id: string;
  position: number;
  place: ResolvedPlace;
  note: string;
}

export interface Guide {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  title: string;
  destination: string;
  place?: ResolvedPlace;
  description: string;
  coverUrl?: string;
  tags: string[];
  published: boolean;
  itemCount: number;
  saveCount: number;
  savedByMe?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GuideDetail extends Guide {
  items: GuideItem[];
}

/** Everything the client needs after login, in one round trip. */
export interface UserState {
  user: SessionUser;
  profile: TravelerProfile;
  saved: SavedItem[];
  trips: Trip[];
  chats: ChatSummary[];
  updates: UpdateItem[];
  preferences: LearnedPreference[];
}

export const DEFAULT_PROFILE: TravelerProfile = {
  name: "",
  homeCity: "",
  homeAirport: "",
  travelStyles: [],
  pace: "balanced",
  budgetTier: "mid-range",
  companions: "partner",
  dietary: "",
  accommodation: "",
  notes: "",
  learnFromChat: true,
  onboarded: false,
};

export const DEFAULT_PLANNER: TripPlanner = {
  where: "",
  startDate: "",
  endDate: "",
  travelers: 2,
  budgetTier: "",
};
