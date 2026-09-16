"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Globe, MapPin, MessageCircle, Phone, Star } from "lucide-react";
import type { ItineraryStop } from "@/lib/types";
import type { PlaceDetails, ResolvedPlace } from "@/lib/places/types";
import { fetchPlaceDetails } from "@/lib/places/client";
import { todaysHours } from "@/lib/places/hours";
import { googleMapsSearchUrl } from "@/lib/travel/links";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { MatchLine } from "@/components/recs/MatchLine";

function compact(n?: number): string {
  if (!n) return "";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 0 }).format(n);
}

function Photo({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
  return <img src={src} alt={alt} onError={() => setFailed(true)} className="h-20 w-28 shrink-0 rounded-xl object-cover" loading="lazy" />;
}

/**
 * The full card behind a board stop: photos, rating, category, price, address,
 * today's hours, phone, links, the match score with thumbs and a way to ask
 * the assistant about it. Place Details load on open (cached 30 days server-side).
 */
export function StopDetails({ stop, place, destination }: { stop: ItineraryStop; place: ResolvedPlace; destination?: string }) {
  const send = useSendMessage();
  const [details, setDetails] = useState<{ id: string; data: PlaceDetails | null } | null>(null);
  const data = details?.id === place.id ? details.data : null;

  useEffect(() => {
    if (place.source !== "google") return;
    let active = true;
    const id = place.id;
    fetchPlaceDetails(id).then((d) => {
      if (active) setDetails({ id, data: d });
    });
    return () => {
      active = false;
    };
  }, [place.id, place.source]);

  const photos = (data?.photos?.length ? data.photos : place.photos).slice(0, 3);
  const hours = todaysHours(data?.openingHours);
  const website = data?.websiteUri ?? place.websiteUri;
  const maps = place.googleMapsUri ?? googleMapsSearchUrl(`${place.name}${destination ? `, ${destination}` : ""}`);
  const linkClass = "inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-white px-3 text-[12px] font-medium hover:bg-surface";

  return (
    <div className="mt-2 grid gap-2 rounded-xl bg-surface/70 p-3" data-testid="stop-details">
      {photos.length ? (
        <div className="xp-no-scrollbar flex gap-2 overflow-x-auto">
          {photos.map((src) => (
            <Photo key={src} src={src} alt={place.name} />
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        {place.rating ? (
          <span className="inline-flex items-center gap-1 font-semibold">
            <Star className="h-3.5 w-3.5 fill-current" /> {place.rating.toFixed(1)}
            {place.userRatingCount ? <span className="font-normal text-muted">({compact(place.userRatingCount)})</span> : null}
          </span>
        ) : null}
        {place.category ? <span className="text-neutral-700">{place.category}</span> : null}
        {place.priceLevel ? <span className="text-neutral-700">{place.priceLevel}</span> : null}
        {hours ? <span className="text-neutral-700">Today {hours}</span> : null}
      </div>
      {place.summary ? <p className="text-[13px] text-neutral-700">{place.summary}</p> : null}
      {place.address ? <p className="text-[12px] text-muted">{place.address}</p> : null}
      <MatchLine name={stop.title} kind={place.kind} place={place} destination={destination} context="board" size="sm" />
      <div className="flex flex-wrap gap-1.5">
        <a href={maps} target="_blank" rel="noreferrer noopener" className={linkClass}>
          <MapPin className="h-3.5 w-3.5" /> Google Maps <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
        {website ? (
          <a href={website} target="_blank" rel="noreferrer noopener" className={linkClass}>
            <Globe className="h-3.5 w-3.5" /> Website <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        ) : null}
        {data?.phone ? (
          <a href={`tel:${data.phone.replace(/\s+/g, "")}`} className={linkClass}>
            <Phone className="h-3.5 w-3.5" /> {data.phone}
          </a>
        ) : null}
        <button type="button" onClick={() => send(`Is ${stop.title}${destination ? ` in ${destination}` : ""} right for me, and what should I know before going?`)} className={linkClass}>
          <MessageCircle className="h-3.5 w-3.5" /> Ask about it
        </button>
      </div>
    </div>
  );
}
