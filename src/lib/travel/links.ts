/**
 * Deep-link builders for "actionable" recommendations. None of these need an
 * API key: they open the provider's own search pre-filled with what the
 * assistant recommended, so the traveler can check live prices and book.
 */

const enc = encodeURIComponent;

function isIsoDate(value?: string): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${enc(query)}`;
}

export function googleFlightsUrl(params: {
  origin?: string;
  destination: string;
  departDate?: string;
  returnDate?: string;
  travelers?: number;
}): string {
  const parts = ["Flights"];
  if (params.origin) parts.push(`from ${params.origin}`);
  parts.push(`to ${params.destination}`);
  if (isIsoDate(params.departDate)) parts.push(`on ${params.departDate}`);
  if (isIsoDate(params.returnDate)) parts.push(`returning ${params.returnDate}`);
  if (params.travelers && params.travelers > 1) parts.push(`for ${params.travelers} adults`);
  return `https://www.google.com/travel/flights?q=${enc(parts.join(" "))}`;
}

export function bookingSearchUrl(params: {
  query: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}): string {
  const url = new URL("https://www.booking.com/searchresults.html");
  url.searchParams.set("ss", params.query);
  if (isIsoDate(params.checkIn)) url.searchParams.set("checkin", params.checkIn);
  if (isIsoDate(params.checkOut)) url.searchParams.set("checkout", params.checkOut);
  url.searchParams.set("group_adults", String(params.guests && params.guests > 0 ? params.guests : 2));
  url.searchParams.set("no_rooms", "1");
  return url.toString();
}

export function googleHotelsUrl(query: string): string {
  return `https://www.google.com/travel/hotels?q=${enc(query)}`;
}

export function airbnbSearchUrl(params: {
  destination: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}): string {
  const url = new URL(`https://www.airbnb.com/s/${enc(params.destination)}/homes`);
  if (isIsoDate(params.checkIn)) url.searchParams.set("checkin", params.checkIn);
  if (isIsoDate(params.checkOut)) url.searchParams.set("checkout", params.checkOut);
  if (params.guests) url.searchParams.set("adults", String(params.guests));
  return url.toString();
}

export function openTableSearchUrl(query: string): string {
  return `https://www.opentable.com/s?term=${enc(query)}`;
}

export function tripadvisorSearchUrl(query: string): string {
  return `https://www.tripadvisor.com/Search?q=${enc(query)}`;
}

export function getYourGuideSearchUrl(query: string): string {
  return `https://www.getyourguide.com/s/?q=${enc(query)}`;
}

export function wikipediaSummaryUrl(title: string): string {
  return `https://en.wikipedia.org/api/rest_v1/page/summary/${enc(title.replace(/ /g, "_"))}`;
}
