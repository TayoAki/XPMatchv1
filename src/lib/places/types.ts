export type PlaceKind = "destination" | "hotel" | "restaurant" | "attraction";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Viewport {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** The author attribution Google attaches to a Places photo. */
export interface PhotoCredit {
  name: string;
  uri?: string;
}

/** A place pinned on the map. `source` says whether the location is real or estimated. */
export interface ResolvedPlace {
  /** Google place id, or a synthetic `est:` id for estimated locations. */
  id: string;
  name: string;
  kind: PlaceKind;
  lat: number;
  lng: number;
  address?: string;
  /** Short "City, Region" line for headers. */
  locality?: string;
  /** Human-readable primary type, e.g. "Art museum". */
  category?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  summary?: string;
  /** Same-origin photo URLs (proxied so no API key reaches the browser). */
  photos: string[];
  /** Who took each photo, aligned with `photos`; Google requires it to be shown with the photo. */
  photoCredits?: PhotoCredit[];
  googleMapsUri?: string;
  websiteUri?: string;
  viewport?: Viewport;
  /** Google place types ("restaurant", "locality"), when the search asked for them. */
  types?: string[];
  source: "google" | "estimate";
}

export interface PlaceReview {
  author: string;
  authorPhoto?: string;
  rating?: number;
  text: string;
  relativeTime?: string;
}

export interface PlaceDetails extends ResolvedPlace {
  reviews: PlaceReview[];
  openingHours?: string[];
  phone?: string;
}

/** A pinned place as tracked by the client, keyed by the tool call that produced it. */
export interface MapPlace extends ResolvedPlace {
  key: string;
  toolCallId: string;
}

export interface ResolveRequestItem {
  key: string;
  query: string;
  kind: PlaceKind;
}

export interface ResolveRequest {
  destination?: string;
  items: ResolveRequestItem[];
}

export interface ResolveResponse {
  destination: ResolvedPlace | null;
  items: { key: string; place: ResolvedPlace | null }[];
  provider: "google" | "fallback";
}
