"use client";

import { useState } from "react";
import clsx from "clsx";
import { MapPin } from "lucide-react";
import type { ResolvedPlace } from "@/lib/places/types";
import { destinationCaption, photoAtWidth } from "@/lib/places/destination-photo";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { PhotoCredit } from "@/components/ui/PhotoCredit";

/**
 * The hero photograph: the Google Places photo of the destination in focus through the photo
 * proxy, with the motto, the caption naming the place and the photo's author attribution. It
 * fades and settles in once loaded; while the place resolves the slot keeps its height; without
 * a Places photo the Wikipedia thumbnail steps in, and without that a flat brand panel keeps the
 * text readable.
 */
export function HeroImage({ destination, place, loading, className }: { destination: string; place: ResolvedPlace | null; loading: boolean; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const photo = place?.photos?.[0];
  const src = photo && failed !== photo ? photoAtWidth(photo, 1920) : null;
  const caption = destinationCaption(place, destination);
  return (
    <div className={clsx("relative overflow-hidden bg-brand", className)} data-testid="hero-image" aria-busy={loading || undefined}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
        <img
          key={src}
          src={src}
          alt={caption}
          fetchPriority="high"
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailed(photo ?? null)}
          data-loaded={loadedSrc === src ? "true" : undefined}
          className="xp-photo xp-photo--settle absolute inset-0 h-full w-full object-cover"
        />
      ) : !loading ? (
        <PlaceImage queries={[place?.name ?? destination.split(",")[0].trim(), destination]} alt={caption} className="absolute inset-0 rounded-none" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15" aria-hidden="true" />
      <p className="absolute right-6 top-6 text-right font-serif text-[12px] font-medium uppercase leading-[1.9] tracking-[0.3em] text-white drop-shadow-md sm:right-8 sm:top-8">
        More
        <br />
        than a trip
        <br />
        a brighter you
        <span className="mt-2 block h-px w-8 bg-white/80 ml-auto" aria-hidden="true" />
      </p>
      <p className="absolute bottom-6 right-6 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.3em] text-white drop-shadow-md sm:right-8" data-testid="hero-caption">
        <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} aria-hidden="true" />
        {caption}
      </p>
      {src ? <PhotoCredit credit={place?.photoCredits?.[0]} className="bottom-6 left-6 sm:left-8" /> : null}
    </div>
  );
}
