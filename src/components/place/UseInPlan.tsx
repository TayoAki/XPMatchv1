"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { ArrowLeftRight, Bed, Check } from "lucide-react";
import type { MapPlace, ResolvedPlace } from "@/lib/places/types";
import { candidateFromPlace } from "@/lib/match";
import { shortPlaceName } from "@/lib/places/names";
import { usePlanPicker } from "@/lib/plan-picker";
import { useMatch } from "@/components/recs/MatchBadge";

const chip = "inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[13px] font-semibold text-brand";
const action =
  "inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover pointer-coarse:h-11";

/**
 * In a place's own panel, when the place belongs to a destination card's plan: "Use as my stay"
 * for one of the city's hotels ("Your stay" for the one the plan has), and "Use instead of
 * {stop}" while the traveler is choosing a replacement for a stop from its tab. Choosing puts it
 * in the plan and brings the plan back into view.
 *
 * `pin` is the place as it was opened (its pin fields name the plan); `place` has its details.
 */
export function UseInPlan({ pin, place, className }: { pin: ResolvedPlace; place: ResolvedPlace; className?: string }) {
  const picker = usePlanPicker(pin as Partial<MapPlace>);
  const candidate = useMemo(() => (picker ? candidateFromPlace(place) : null), [picker, place]);
  const match = useMatch(candidate);
  if (!picker || !match) return null;
  const kind = pin.kind;

  if (kind === "hotel") {
    if (!picker.stayId) return null;
    if (picker.stayId === place.id) {
      return (
        <div className={className}>
          <span className={chip} data-testid="plan-stay">
            <Bed className="h-4 w-4" aria-hidden="true" /> Your stay in the {picker.city} plan
          </span>
        </div>
      );
    }
    if (picker.missed.has(place.id)) return null;
    return (
      <div className={className}>
        <button type="button" onClick={() => picker.choose(place, match, "hotel")} className={action}>
          <Bed className="h-4 w-4" aria-hidden="true" /> Use as my stay
        </button>
      </div>
    );
  }

  const choosing = picker.choosing;
  if ((kind === "attraction" || kind === "restaurant") && choosing?.kind === kind) {
    if (picker.taken.has(place.id)) {
      return (
        <div className={className}>
          <span className={clsx(chip, "bg-surface text-neutral-700")}>
            <Check className="h-4 w-4" aria-hidden="true" /> Already in your plan
          </span>
        </div>
      );
    }
    if (picker.missed.has(place.id)) return null;
    return (
      <div className={className}>
        <button type="button" onClick={() => picker.choose(place, match, kind)} className={action}>
          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" /> Use instead of {shortPlaceName(choosing.name)}
        </button>
      </div>
    );
  }
  return null;
}
