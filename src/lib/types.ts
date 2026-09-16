import type { ResolvedPlace } from "@/lib/places/types";

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
  onboarded: boolean;
}

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

export interface ItineraryDay {
  day: number;
  title: string;
  items: string[];
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
  onboarded: false,
};

export const DEFAULT_PLANNER: TripPlanner = {
  where: "",
  startDate: "",
  endDate: "",
  travelers: 2,
  budgetTier: "",
};
