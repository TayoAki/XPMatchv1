"use client";

import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Heart } from "lucide-react";
import type { Collection } from "@/lib/travel/collections";
import { photoAtWidth, useDestinationPlace } from "@/lib/places/destination-photo";
import { findSaved, useTravelStore } from "@/lib/store";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { PhotoCredit } from "@/components/ui/PhotoCredit";

/**
 * One themed collection: the Places photo of its representative destination (with the author
 * attribution), a serif title and description over a gradient, a link to the matching
 * Inspiration rows and a heart that keeps the collection under Saved.
 */
export function CollectionCard({ collection }: { collection: Collection }) {
  const { saved, toggleSaved } = useTravelStore();
  const { place, loading } = useDestinationPlace(collection.destination);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const photo = place?.photos?.[0];
  const src = photo && !failed ? photoAtWidth(photo, 1200) : null;
  const isSaved = !!findSaved(saved, { kind: "collection", title: collection.title, refId: collection.key });
  const href = `/inspiration?collection=${collection.key}`;

  return (
    <article className="xp-lift group relative rounded-[10px]" data-testid="collection-card">
      <Link href={href} className="block overflow-hidden rounded-[10px] bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
        <div className="relative aspect-[1.95/1] w-full" aria-busy={loading || undefined}>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
            <img src={src} alt={place?.name ?? collection.destination} onError={() => setFailed(true)} onLoad={() => setLoaded(true)} data-loaded={loaded ? "true" : undefined} loading="lazy" className="xp-photo absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[var(--xp-ease)] motion-safe:group-hover:scale-[1.04]" />
          ) : !loading ? (
            <PlaceImage queries={collection.queries} alt={collection.destination} className="absolute inset-0 rounded-none" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" aria-hidden="true" />
          {src ? <PhotoCredit credit={place?.photoCredits?.[0]} className="left-3 top-3" asLink={false} /> : null}
          <div className="absolute inset-x-6 bottom-5 text-white drop-shadow">
            <h3 className="font-serif text-[26px] leading-tight md:text-[28px]">{collection.title}</h3>
            <p className="mt-1 font-serif text-[15px] text-white/90 md:text-[16px]">{collection.description}</p>
          </div>
        </div>
      </Link>
      <button
        type="button"
        aria-pressed={isSaved}
        aria-label={isSaved ? `Remove ${collection.title} from saved` : `Save ${collection.title}`}
        onClick={() => toggleSaved({ kind: "collection", title: collection.title, subtitle: collection.description, url: href, refId: collection.key })}
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Heart className={clsx("h-[18px] w-[18px]", isSaved ? "fill-red-500 text-red-500" : "text-neutral-700")} aria-hidden="true" />
      </button>
    </article>
  );
}
