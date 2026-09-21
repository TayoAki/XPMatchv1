"use client";

import { photoCreditTitle } from "@/components/ui/PhotoCredit";
import { useState } from "react";
import clsx from "clsx";
import { Check, Meh, ThumbsDown, ThumbsUp, X } from "lucide-react";
import type { TripDetail } from "@/lib/types";
import { travelActions, useTravelStore } from "@/lib/store";
import { DOMAIN_OF_KIND, findFeedback, reasonChips, VERDICT_LABEL, type FeedbackVerdict } from "@/lib/feedback/types";
import { ratingCandidates, type RatingCandidate } from "@/lib/feedback/post-trip";
import { answer, bucketScore, nextOpponent, scoreAt, skip, startInsertion, type Insertion, type RankedEntry } from "@/lib/ranking";
import { Button } from "@/components/ui/Button";

interface Rated {
  candidate: RatingCandidate;
  verdict: FeedbackVerdict;
  reasons: string[];
}

interface Comparison {
  rated: Rated;
  state: Insertion;
}

type Phase = { kind: "rate"; index: number } | { kind: "compare"; queue: Rated[]; current: Comparison | null; asked: number } | { kind: "done" };

/** Pairwise questions per rating session (Beli asks a handful, never a form). */
const MAX_PAIRS = 3;

export const ratedKey = (tripId: string) => `xp-rated:${tripId}`;

const VERDICT_ICON: Record<FeedbackVerdict, typeof ThumbsUp> = { loved: ThumbsUp, fine: Meh, disliked: ThumbsDown };

function Thumb({ candidate }: { candidate: RatingCandidate }) {
  const [failed, setFailed] = useState(false);
  const photo = candidate.place.photos[0];
  if (!photo || failed) return <div className="h-20 w-20 shrink-0 rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-300" aria-hidden="true" />;
  // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
  return <img src={photo} alt="" title={photoCreditTitle(candidate.place.photoCredits?.[0])} onError={() => setFailed(true)} className="h-20 w-20 shrink-0 rounded-2xl object-cover" />;
}

/**
 * "How was Rome?" after a trip: three buckets per place, then up to three
 * "Which did you prefer?" pairs against places already rated in the same
 * domain, which turn into a 0–10 score nobody has to type.
 */
export function PostTripRating({ trip, onClose }: { trip: TripDetail; onClose: () => void }) {
  const { feedback, recordFeedback } = useTravelStore();
  const [candidates] = useState(() => ratingCandidates(trip, feedback));
  const [phase, setPhase] = useState<Phase>(() => (candidates.length ? { kind: "rate", index: 0 } : { kind: "done" }));
  const [rated, setRated] = useState<Rated[]>([]);
  const [draft, setDraft] = useState<{ verdict: FeedbackVerdict | null; reasons: string[] }>({ verdict: null, reasons: [] });

  const finish = () => {
    try {
      window.localStorage.setItem(ratedKey(trip.id), new Date().toISOString());
    } catch {
      // ignore
    }
    onClose();
  };

  const save = (item: Rated, score: number) =>
    recordFeedback({
      name: item.candidate.name,
      kind: item.candidate.kind,
      place: item.candidate.place,
      destination: item.candidate.destination,
      tripId: trip.id,
      verdict: item.verdict,
      reasons: item.reasons,
      note: "",
      source: "post_trip",
      score,
    });

  /** Same-domain, same-bucket places already scored, best first (the new place excluded). Read live: ratings made seconds ago count. */
  const rankedFor = (item: Rated): RankedEntry[] =>
    travelActions
      .getState()
      .feedback.filter((f) => f.placeId !== item.candidate.key && f.verdict === item.verdict && DOMAIN_OF_KIND[f.kind] === DOMAIN_OF_KIND[item.candidate.kind])
      .map((f) => ({ id: f.placeId, name: f.name, score: f.score ?? bucketScore(f.verdict) }))
      .sort((a, b) => b.score - a.score);

  const startCompare = (queue: Rated[], asked: number) => {
    const [next, ...rest] = queue;
    if (!next || asked >= MAX_PAIRS) {
      setPhase({ kind: "done" });
      return;
    }
    const state = startInsertion(next.verdict, rankedFor(next), MAX_PAIRS - asked);
    if (!nextOpponent(state)) {
      void save(next, scoreAt(state));
      startCompare(rest, asked);
      return;
    }
    setPhase({ kind: "compare", queue: rest, current: { rated: next, state }, asked });
  };

  const submitRating = async (skipped: boolean) => {
    if (phase.kind !== "rate") return;
    const candidate = candidates[phase.index];
    let next = rated;
    if (!skipped && draft.verdict) {
      const item: Rated = { candidate, verdict: draft.verdict, reasons: draft.reasons };
      await save(item, bucketScore(item.verdict));
      next = [...rated, item];
      setRated(next);
    }
    setDraft({ verdict: null, reasons: [] });
    if (phase.index + 1 < candidates.length) setPhase({ kind: "rate", index: phase.index + 1 });
    else startCompare(next.filter((r) => r.verdict === "loved").concat(next.filter((r) => r.verdict !== "loved")), 0);
  };

  const respond = (preferredNew: boolean | null) => {
    if (phase.kind !== "compare" || !phase.current) return;
    const state = preferredNew === null ? skip(phase.current.state) : answer(phase.current.state, preferredNew);
    const asked = phase.asked + (preferredNew === null ? 0 : 1);
    if (state.done || !nextOpponent(state)) {
      void save(phase.current.rated, scoreAt(state));
      startCompare(phase.queue, asked);
      return;
    }
    setPhase({ ...phase, current: { ...phase.current, state }, asked });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={`How was ${trip.destination}?`}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight">How was {trip.destination}?</h2>
            <p className="text-[13px] text-muted">
              {phase.kind === "rate"
                ? `Place ${phase.index + 1} of ${candidates.length}. Your reactions shape what XPMatch suggests next.`
                : phase.kind === "compare"
                  ? "A couple of quick comparisons rank your favorites."
                  : rated.length
                    ? `Rated ${rated.length} place${rated.length === 1 ? "" : "s"}. Thanks!`
                    : "Nothing left to rate for this trip."}
            </p>
          </div>
          <button type="button" onClick={finish} aria-label="Close" className="rounded-full p-2 hover:bg-surface">
            <X className="h-5 w-5" />
          </button>
        </div>

        {phase.kind === "rate" ? (
          <div className="mt-5">
            <div className="flex items-center gap-4">
              <Thumb candidate={candidates[phase.index]} />
              <div className="min-w-0">
                <div className="text-[17px] font-semibold">{candidates[phase.index].name}</div>
                <div className="text-[13px] text-muted">{[candidates[phase.index].place.category, candidates[phase.index].place.locality].filter(Boolean).join(" · ")}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(["loved", "fine", "disliked"] as FeedbackVerdict[]).map((v) => {
                const Icon = VERDICT_ICON[v];
                const active = draft.verdict === v;
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDraft({ verdict: v, reasons: active ? draft.reasons : [] })}
                    className={clsx("flex flex-col items-center gap-1 rounded-2xl border px-3 py-3 text-[13px] font-semibold", active ? "border-brand bg-brand text-white" : "border-border hover:bg-surface")}
                  >
                    <Icon className="h-5 w-5" /> {VERDICT_LABEL[v]}
                  </button>
                );
              })}
            </div>
            {draft.verdict ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {reasonChips(candidates[phase.index].kind, draft.verdict).map((chip) => {
                  const on = draft.reasons.includes(chip.label);
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDraft({ ...draft, reasons: on ? draft.reasons.filter((r) => r !== chip.label) : [...draft.reasons, chip.label] })}
                      className={clsx("rounded-full border px-2.5 py-1 text-[12px] font-medium", on ? "border-brand bg-brand text-white" : "border-border bg-white hover:bg-surface")}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="mt-5 flex items-center justify-between">
              <button type="button" onClick={() => void submitRating(true)} className="text-[13px] text-neutral-500 underline-offset-2 hover:underline">
                Skip this one
              </button>
              <Button onClick={() => void submitRating(false)} disabled={!draft.verdict}>
                {phase.index + 1 < candidates.length ? "Next" : "Finish"}
              </Button>
            </div>
          </div>
        ) : null}

        {phase.kind === "compare" && phase.current ? (
          <div className="mt-5" data-testid="pairwise">
            <div className="text-[15px] font-semibold">Which did you prefer?</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => respond(true)} className="rounded-2xl border border-border px-3 py-4 text-[14px] font-semibold hover:border-brand hover:bg-surface">
                {phase.current.rated.candidate.name}
              </button>
              <button type="button" onClick={() => respond(false)} className="rounded-2xl border border-border px-3 py-4 text-[14px] font-semibold hover:border-brand hover:bg-surface">
                {nextOpponent(phase.current.state)?.name}
              </button>
            </div>
            <div className="mt-3 text-center">
              <button type="button" onClick={() => respond(null)} className="text-[13px] text-neutral-500 underline-offset-2 hover:underline">
                Can&apos;t say
              </button>
            </div>
          </div>
        ) : null}

        {phase.kind === "done" ? (
          <div className="mt-5">
            {rated.length ? (
              <ul className="grid gap-2" data-testid="rated-list">
                {rated.map((r) => {
                  const Icon = VERDICT_ICON[r.verdict];
                  const stored = findFeedback(feedback, r.candidate.name, r.candidate.place);
                  return (
                    <li key={r.candidate.key} className="flex items-center gap-3 rounded-2xl border border-border px-3 py-2 text-[14px]">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate font-medium">{r.candidate.name}</span>
                      {stored?.score !== undefined ? <span className="rounded-full bg-surface px-2 py-0.5 text-[12px] font-semibold">{stored.score.toFixed(1)}</span> : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <div className="mt-5 flex justify-end">
              <Button onClick={finish}>
                <Check className="h-4 w-4" /> Done
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
