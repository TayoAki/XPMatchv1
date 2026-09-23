"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeftRight, CalendarPlus, Check, Loader2, MapPin } from "lucide-react";
import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { photoAtWidth } from "@/lib/places/destination-photo";
import { shortPlaceName } from "@/lib/places/names";
import { mapActions } from "@/lib/map-store";
import { useTravelStore } from "@/lib/store";
import { draftTripInput } from "@/lib/recs/itinerary-draft";
import type { DraftPick, ItineraryDraft } from "@/server/itineraries";
import { useCardThreadId } from "@/components/map/useRegisterPlaces";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { photoCreditTitle } from "@/components/ui/PhotoCredit";
import { Score, SwapOptions, SwappedTag, type PlanSwapProps } from "./PlanParts";

/**
 * "Make itinerary": saves the card's complete itinerary as a trip in one click (no picker, no
 * confirmation), puts it in the chat's trip tray, then turns into "Open itinerary". With no plan
 * to save (a place the catalog cannot fill yet), it asks the concierge to plan the days instead.
 * Two buttons for the same plan (the card and its full view) share `tripId` so both turn.
 */
export function MakeItineraryButton({
  name,
  label,
  getDraft,
  fallbackPrompt,
  tripId,
  onSaved,
  className,
}: {
  name: string;
  label: string;
  getDraft: () => Promise<ItineraryDraft | null>;
  fallbackPrompt: string;
  /** The trip this plan was already saved as, when the parent keeps it. */
  tripId?: string | null;
  onSaved?: (tripId: string) => void;
  className?: string;
}) {
  const { addTrip, planner, profile } = useTravelStore();
  const threadId = useCardThreadId();
  const send = useSendMessage();
  const [state, setState] = useState<{ phase: "idle" | "working" | "failed" } | { phase: "saved"; tripId: string }>({ phase: "idle" });
  const savedId = tripId ?? (state.phase === "saved" ? state.tripId : null);

  if (savedId) {
    return (
      <Link href={`/trips/${savedId}`} aria-label={`Open ${name} itinerary`} className={className}>
        <Check className="h-4 w-4" aria-hidden="true" /> Open itinerary
      </Link>
    );
  }

  const make = async () => {
    if (state.phase === "working") return;
    setState({ phase: "working" });
    try {
      const draft = await getDraft().catch(() => null);
      if (!draft || !draft.days.length) {
        setState({ phase: "idle" });
        void send(fallbackPrompt);
        return;
      }
      const trip = await addTrip(draftTripInput(draft, { name, label, planner, profile }));
      if (threadId) mapActions.setThreadTrip(threadId, trip.id);
      onSaved?.(trip.id);
      setState({ phase: "saved", tripId: trip.id });
    } catch {
      setState({ phase: "failed" });
    }
  };

  const working = state.phase === "working";
  return (
    <button type="button" onClick={make} disabled={working} aria-label={`Make ${name} itinerary`} aria-busy={working || undefined} className={className}>
      {working ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CalendarPlus className="h-4 w-4" aria-hidden="true" />}
      {working ? "Saving…" : state.phase === "failed" ? "Try again" : "Make itinerary"}
    </button>
  );
}

function PlanRow({
  pick,
  kind,
  time,
  meal,
  selected,
  followSelection,
  onShow,
  swap,
}: {
  pick: DraftPick;
  kind: PlaceKind;
  time?: string;
  meal?: "lunch" | "dinner";
  selected: boolean;
  followSelection: boolean;
  onShow: (place: ResolvedPlace, kind: PlaceKind) => void;
  swap?: PlanSwapProps;
}) {
  const [swapOpen, setSwapOpen] = useState(false);
  const photo = pick.place.photos?.[0];
  const meta = meal ? `${meal === "lunch" ? "Lunch" : "Dinner"} · ${pick.place.category ?? "Restaurant"}` : pick.place.category;
  const ref = useRef<HTMLLIElement>(null);
  const recent = !!swap && swap.recentId === pick.place.id;
  // A place picked on the map (in the full view, not in the chat), or just chosen from a list, brings its row into view.
  useEffect(() => {
    if ((selected && followSelection) || recent) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected, followSelection, recent]);
  return (
    <li
      ref={ref}
      className={clsx("rounded-[10px] border transition-colors", selected ? "border-brand bg-brand-soft/60" : recent ? "border-emerald-300 bg-emerald-50/40" : "border-border bg-white")}
      data-testid="itinerary-stop"
      data-kind={kind}
      data-place-id={pick.place.id}
      data-selected={selected || undefined}
      data-recent={recent || undefined}
    >
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => onShow(pick.place, kind)}
          aria-label={`Show ${pick.place.name} on map`}
          aria-current={selected || undefined}
          className={clsx("flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] py-2 pl-2.5 text-left transition-colors", swap ? "pr-1.5" : "pr-2.5", !selected && "hover:bg-surface")}
        >
          {time ? <span className="w-10 shrink-0 text-[12px] font-semibold tabular-nums text-neutral-600">{time}</span> : null}
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
            <img src={photoAtWidth(photo, 120)} alt="" title={photoCreditTitle(pick.place.photoCredits?.[0])} loading="lazy" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-neutral-500">
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[13px] font-semibold leading-tight" title={pick.place.name}>
                {shortPlaceName(pick.place.name)}
              </span>
              {pick.swappedFrom ? <SwappedTag /> : null}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-muted">{[meta, pick.why].filter(Boolean).join(" · ")}</span>
          </span>
          <Score pick={pick} small />
        </button>
        {swap ? (
          <button
            type="button"
            onClick={() => setSwapOpen((v) => !v)}
            aria-expanded={swapOpen}
            aria-label={`Swap ${pick.place.name}`}
            title="Swap"
            className={clsx(
              "mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors pointer-coarse:h-10 pointer-coarse:w-10",
              swapOpen ? "border-brand bg-brand text-white" : "border-border bg-white text-neutral-600 hover:bg-surface",
            )}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {swap && swapOpen ? (
        <SwapOptions
          pick={pick}
          kind={kind}
          options={(pick.alternates ?? []).filter((a) => !swap.unavailable.has(a.place.id))}
          onSwap={(to) => {
            setSwapOpen(false);
            swap.onSwap(pick, to);
          }}
          onSeeAll={() => {
            setSwapOpen(false);
            swap.onSeeAll(pick, kind);
          }}
          compact
        />
      ) : null}
    </li>
  );
}

/** The itinerary itself: where they stay, then each day's stops with their times, meals and scores; a row shows its place on the map. */
export function ItineraryPlan({
  draft,
  loading,
  error,
  onRetry,
  onAsk,
  onShow,
  selectedId = null,
  followSelection = false,
  swap,
  className,
}: {
  draft: ItineraryDraft | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAsk: () => void;
  onShow: (place: ResolvedPlace, kind: PlaceKind) => void;
  /** The place picked on the map, highlighted here. */
  selectedId?: string | null;
  /** Scroll a newly picked place's row into view. */
  followSelection?: boolean;
  /** Swapping places, when the plan can be changed here. */
  swap?: PlanSwapProps;
  className?: string;
}) {
  if (!draft && loading) {
    return (
      <ul className={clsx("grid gap-2", className)} aria-busy="true" aria-label="Building your itinerary">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="xp-skeleton h-[56px] rounded-[10px]" />
        ))}
      </ul>
    );
  }
  if (!draft && error) {
    return (
      <div className={clsx("rounded-[10px] border border-dashed border-border bg-white px-3 py-3 text-[13px] text-muted", className)}>
        Couldn&apos;t build the itinerary.{" "}
        <button type="button" onClick={onRetry} className="font-semibold text-brand hover:underline">
          Retry
        </button>
      </div>
    );
  }
  if (!draft || !draft.days.length) {
    return (
      <div className={clsx("rounded-[10px] border border-dashed border-border bg-white px-3 py-3 text-[13px] text-muted", className)} data-testid="itinerary-empty">
        Not enough places here yet to plan the days.{" "}
        <button type="button" onClick={onAsk} className="font-semibold text-brand hover:underline">
          Ask the concierge
        </button>
      </div>
    );
  }
  return (
    <div className={clsx("grid grid-cols-[minmax(0,1fr)] gap-3", className)} data-testid="itinerary-plan">
      {draft.stay ? (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Where you&apos;ll stay</div>
          <ul className="mt-1.5 grid grid-cols-[minmax(0,1fr)] gap-1.5">
            <PlanRow pick={draft.stay} kind="hotel" selected={draft.stay.place.id === selectedId} followSelection={followSelection} onShow={onShow} swap={swap} />
          </ul>
        </div>
      ) : null}
      {draft.days.map((d) => (
        <section key={d.day} className="min-w-0" data-testid="itinerary-day" aria-label={`Day ${d.day}`}>
          <h4 className="truncate text-[12px] font-semibold">
            <span className="text-brand">Day {d.day}</span> · {d.title}
          </h4>
          <ul className="mt-1.5 grid grid-cols-[minmax(0,1fr)] gap-1.5">
            {d.stops.map((s) => (
              <PlanRow
                key={`${s.place.id}-${s.startTime}`}
                pick={s}
                kind={s.kind}
                time={s.startTime}
                meal={s.meal}
                selected={s.place.id === selectedId}
                followSelection={followSelection}
                onShow={onShow}
                swap={swap}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
