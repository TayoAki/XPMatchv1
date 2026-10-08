"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { formatDateRange } from "@/lib/store";
import type { Trip } from "@/lib/types";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { PhotoCredit } from "@/components/ui/PhotoCredit";
import { useState } from "react";

function Cover({ trip }: { trip: Trip }) {
  const [failed, setFailed] = useState(false);
  const photo = trip.place?.photos?.[0];
  if (photo && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
    return <img src={photo} alt={trip.destination} onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />;
  }
  return <PlaceImage queries={[trip.destination]} alt={trip.destination} className="absolute inset-0" />;
}

/** Mindtrip-style trip card: cover photo with the title and dates over a gradient. */
export function TripCard({ trip, large = false }: { trip: Trip; large?: boolean }) {
  return (
    <Link
      href={`/trips/${trip.id}`}
      className={`group relative block overflow-hidden rounded-3xl bg-neutral-200 ${large ? "aspect-[4/3]" : "aspect-[16/11]"}`}
    >
      <Cover trip={trip} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent transition-opacity group-hover:opacity-90" />
      {trip.place?.photos?.[0] ? <PhotoCredit credit={trip.place.photoCredits?.[0]} className="left-3 top-3" asLink={false} /> : null}
      <span className="absolute right-4 top-4 flex gap-1.5">
        {/* A friend's trip you were asked to give feedback on, not one you are going on. */}
        {trip.via === "feedback" ? <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[12px] font-semibold text-violet-800">Feedback</span> : null}
        {trip.memberCount > 1 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-semibold text-neutral-800">
            <Users className="h-3.5 w-3.5" /> {trip.memberCount}
          </span>
        ) : null}
      </span>
      <div className="absolute inset-x-5 bottom-5 text-white drop-shadow">
        <div className={`${large ? "text-[22px]" : "text-[18px]"} font-semibold leading-tight`}>{trip.title}</div>
        <div className="mt-1 text-[14px] opacity-90">
          {trip.destination}
          {trip.startDate ? ` · ${formatDateRange(trip.startDate, trip.endDate)}` : ""}
        </div>
      </div>
    </Link>
  );
}
