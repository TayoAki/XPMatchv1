"use client";

import clsx from "clsx";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { photoAtWidth } from "@/lib/places/destination-photo";
import { shortPlaceName } from "@/lib/places/names";
import type { DraftPick } from "@/server/itineraries";
import { photoCreditTitle } from "@/components/ui/PhotoCredit";

/** What the plan's rows need from the card: which places are spoken for, the one just chosen, and the swap actions. */
export interface PlanSwapProps {
  /** Places a swap must not offer: already in the plan, or marked not a fit. */
  unavailable: ReadonlySet<string>;
  /** The place just chosen from a list, brought into view. */
  recentId: string | null;
  onSwap: (pick: DraftPick, to: DraftPick) => void;
  /** "See all": choose from every place of the pick's kind, on its tab. */
  onSeeAll: (pick: DraftPick, kind: PlaceKind) => void;
}

/** Where "See all" goes from a pick's swap list: every place of its kind, to choose from. */
export const SEE_ALL: Record<PlaceKind, string> = { hotel: "See all stays", attraction: "See all things to do", restaurant: "See all restaurants", destination: "See all" };

export function Thumb({ place, size = 56 }: { place: ResolvedPlace; size?: number }) {
  const photo = place.photos?.[0];
  if (!photo) {
    return (
      <span className="flex shrink-0 items-center justify-center rounded-xl bg-surface text-neutral-500" style={{ width: size, height: size }}>
        <MapPin className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
  return <img src={photoAtWidth(photo, size * 3)} alt="" title={photoCreditTitle(place.photoCredits?.[0])} loading="lazy" className="shrink-0 rounded-xl object-cover" style={{ width: size, height: size }} />;
}

export function Score({ pick, small = false }: { pick: DraftPick; small?: boolean }) {
  return (
    <span
      className={clsx("inline-flex shrink-0 items-center gap-0.5 rounded-full bg-brand-soft font-semibold text-brand", small ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-[12px]")}
      title={`${pick.match.label} · ${pick.match.score}%`}
    >
      <Sparkles className="h-3 w-3" aria-hidden="true" /> {pick.match.score}%
    </span>
  );
}

/** Marks a place the plan did not start with: the traveler swapped it in (or it replaced a place marked not a fit). */
export function SwappedTag() {
  return <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">Swapped in</span>;
}

/**
 * A pick's swap list: its ready options (the place it replaced first, when it was swapped), each
 * with Use this, then "See all stays" (or things to do, restaurants) for every other place of its
 * kind in the city, to choose from on its tab.
 */
export function SwapOptions({
  pick,
  kind,
  options,
  onSwap,
  onSeeAll,
  compact = false,
}: {
  pick: DraftPick;
  kind: PlaceKind;
  options: DraftPick[];
  onSwap: (to: DraftPick) => void;
  onSeeAll: () => void;
  /** On the card (a phone, a narrow screen): smaller photos and type. */
  compact?: boolean;
}) {
  return (
    <div className={clsx("border-t border-border/70", compact ? "px-2.5 pb-2.5 pt-2" : "px-3 pb-3 pt-2")} data-testid="swap-options">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Swap {shortPlaceName(pick.place.name)} for</div>
      {options.length ? (
        <ul className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2">
          {options.map((alt) => (
            <li key={alt.place.id} className={clsx("flex items-center rounded-xl border border-border bg-white", compact ? "gap-2 p-1.5" : "gap-3 p-2")}>
              <Thumb place={alt.place} size={compact ? 36 : 44} />
              <div className="min-w-0 flex-1">
                <div className={clsx("truncate font-semibold", compact ? "text-[13px]" : "text-[14px]")} title={alt.place.name}>
                  {shortPlaceName(alt.place.name)}
                </div>
                {/* On the card the score joins the second line, so the name keeps its room. */}
                <div className={clsx("truncate text-muted", compact ? "text-[11px]" : "text-[12px]")}>
                  {(compact ? [`${alt.match.score}% match`, alt.place.category] : [alt.place.category, alt.why]).filter(Boolean).join(" · ")}
                </div>
              </div>
              {compact ? null : <Score pick={alt} />}
              <button
                type="button"
                onClick={() => onSwap(alt)}
                aria-label={`Swap in ${alt.place.name}`}
                className="h-8 shrink-0 rounded-full bg-brand px-3 text-[12px] font-semibold text-white hover:bg-brand-hover pointer-coarse:h-10"
              >
                Use this
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[13px] text-muted">No other ready picks nearby.</p>
      )}
      <button type="button" onClick={onSeeAll} className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline pointer-coarse:min-h-10">
        {SEE_ALL[kind]} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
