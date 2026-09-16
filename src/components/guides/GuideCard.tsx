"use client";

import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Heart } from "lucide-react";
import type { Guide } from "@/lib/types";
import { useTravelStore } from "@/lib/store";
import { PlaceImage } from "@/components/ui/PlaceImage";

function Cover({ guide }: { guide: Guide }) {
  const [failed, setFailed] = useState(false);
  const src = guide.coverUrl ?? guide.place?.photos?.[0];
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
    return <img src={src} alt={guide.title} onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />;
  }
  return <PlaceImage queries={[guide.destination]} alt={guide.destination} className="absolute inset-0" />;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Community guide tile: cover photo, title, destination, author and counts, with a save heart. */
export function GuideCard({ guide, large = false }: { guide: Guide; large?: boolean }) {
  const { saved, toggleGuideSaved, user } = useTravelStore();
  const isSaved = saved.some((s) => s.kind === "guide" && s.refId === guide.id);
  const mine = user?.id === guide.authorId;
  return (
    <div className={clsx("group relative overflow-hidden rounded-3xl bg-neutral-200", large ? "aspect-[4/3]" : "aspect-[16/11]")} data-testid="guide-card">
      <Link href={`/guides/${guide.id}`} className="absolute inset-0 block">
        <Cover guide={guide} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
        <div className="absolute inset-x-5 bottom-5 text-white drop-shadow">
          <div className={clsx("font-semibold leading-tight", large ? "text-[22px]" : "text-[18px]")}>{guide.title}</div>
          <div className="mt-1 truncate text-[13px] opacity-90">
            {guide.destination} · @{guide.authorHandle}
          </div>
          <div className="mt-0.5 text-[12px] opacity-80">
            {plural(guide.itemCount, "place")} · {plural(guide.saveCount, "save")}
          </div>
        </div>
      </Link>
      {!guide.published ? <span className="absolute left-4 top-4 rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-semibold text-amber-900">Draft</span> : null}
      {!mine ? (
        <button
          type="button"
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${guide.title} from saved` : `Save ${guide.title}`}
          onClick={() => toggleGuideSaved(guide)}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur hover:bg-white"
        >
          <Heart className={clsx("h-4 w-4", isSaved ? "fill-red-500 text-red-500" : "text-neutral-700")} />
        </button>
      ) : null}
    </div>
  );
}
