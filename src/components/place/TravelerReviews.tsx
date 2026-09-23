"use client";

import { useState } from "react";
import clsx from "clsx";
import { BadgeCheck, MapPin, Users } from "lucide-react";
import type { ResolvedPlace } from "@/lib/places/types";
import { VERDICTS, VERDICT_LABEL, feedbackKey, type FeedbackVerdict } from "@/lib/feedback/types";
import { PROOF_LABEL, REVIEW_MAX, type TravelerReview, type VisitProof } from "@/lib/reviews";
import { checkInHere, postReview, removeReview, usePlaceReviews } from "@/lib/reviews-client";
import { shortPlaceName } from "@/lib/places/names";
import { useTravelStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Chip, TextArea } from "@/components/ui/Field";

/** Reviews belong to real places: Google's (and the stand-in's), never an estimated pin. */
export function reviewablePlaceId(place: ResolvedPlace): string | null {
  return place.source === "google" && place.kind !== "destination" ? place.id : null;
}

const monthYear = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });

function ProofBadge({ proof }: { proof: VisitProof }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700" data-testid="proof-badge">
      <BadgeCheck className="h-3 w-3" aria-hidden="true" /> {PROOF_LABEL[proof]}
    </span>
  );
}

/** One line for the overview: how many travelers reviewed it and whether ones like the viewer loved it. */
export function ReviewsTeaser({ place, onRead, onWrite }: { place: ResolvedPlace; onRead: () => void; onWrite: () => void }) {
  const id = reviewablePlaceId(place);
  const { data } = usePlaceReviews(id);
  if (!id || !data) return null;
  const { count, verified, similarLoved } = data.summary;
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-border bg-surface/60 px-4 py-3 text-[14px]" data-testid="reviews-teaser">
      <Users className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
      {count ? (
        <>
          <span className="font-semibold">
            {count} traveler review{count === 1 ? "" : "s"}
            {verified ? ` · ${verified} verified` : ""}
          </span>
          {similarLoved ? <span className="text-brand">Loved by {similarLoved} verified traveler{similarLoved === 1 ? "" : "s"} like you</span> : null}
          <button type="button" onClick={onRead} className="ml-auto font-semibold text-brand hover:underline">
            Read reviews
          </button>
        </>
      ) : (
        <>
          <span className="text-neutral-700">No traveler reviews yet.</span>
          <button type="button" onClick={onWrite} className="ml-auto font-semibold text-brand hover:underline">
            Leave the first review
          </button>
        </>
      )}
    </div>
  );
}

function ReviewItem({ review, onEdit, onDelete }: { review: TravelerReview; onEdit: () => void; onDelete: () => void }) {
  return (
    <li className="rounded-2xl border border-border bg-white p-4" data-testid="traveler-review" data-mine={review.mine || undefined}>
      <div className="flex flex-wrap items-center gap-2 text-[14px]">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-[12px] font-bold text-brand" aria-hidden="true">
          {review.author.charAt(0)}
        </span>
        <span className="font-semibold">{review.author}</span>
        {review.proof ? <ProofBadge proof={review.proof} /> : null}
        {review.similar ? (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand"
            title={review.inCommon.length ? `You both like ${review.inCommon.join(", ")}` : undefined}
            data-testid="similar-badge"
          >
            Travels like you
          </span>
        ) : null}
        <span className="ml-auto text-[12px] text-muted">{monthYear(review.at)}</span>
      </div>
      <div className="mt-2 text-[13px] font-semibold text-neutral-800">{VERDICT_LABEL[review.verdict]}</div>
      <p className="mt-0.5 whitespace-pre-line text-[15px] leading-relaxed text-neutral-700">{review.text}</p>
      {review.mine ? (
        <div className="mt-2 flex items-center gap-3 text-[13px]">
          <button type="button" onClick={onEdit} className="font-semibold text-brand hover:underline">
            Edit
          </button>
          <button type="button" onClick={onDelete} className="font-semibold text-neutral-500 hover:text-red-600">
            Delete
          </button>
          {!review.shared ? <span className="text-muted">Only you can see this</span> : null}
        </div>
      ) : null}
    </li>
  );
}

/**
 * What travelers on XPMatch say about a place, and the viewer's own review: how it was (loved it /
 * fine / not for me), a few words, proof they were there (a check-in on the spot, or a booking of
 * theirs), and whether other travelers may read it. Travelers whose profile overlaps the viewer's
 * are marked "Travels like you"; verified reviews come first.
 */
export function TravelerReviews({ place, destination, startWriting = false }: { place: ResolvedPlace; destination?: string; startWriting?: boolean }) {
  const id = reviewablePlaceId(place);
  const { data, error, loading } = usePlaceReviews(id);
  const { feedback, applyFeedback } = useTravelStore();
  const reaction = feedback.find((f) => f.placeId === feedbackKey(place.name, place));
  const [writing, setWriting] = useState(startWriting);
  const [verdict, setVerdict] = useState<FeedbackVerdict | null>(null);
  const [text, setText] = useState("");
  const [shared, setShared] = useState(true);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkNote, setCheckNote] = useState<{ ok: boolean; text: string } | null>(null);

  if (!id) return null;
  const mine = data?.mine ?? null;
  const proof = data?.myProof ?? null;
  const name = shortPlaceName(place.name);
  const chosen = verdict ?? mine?.verdict ?? reaction?.verdict ?? null;

  const openForm = () => {
    setVerdict(mine?.verdict ?? reaction?.verdict ?? null);
    setText(mine?.text ?? "");
    setShared(mine ? mine.shared : true);
    setProblem(null);
    setWriting(true);
  };

  const submit = async () => {
    if (!chosen) {
      setProblem("Pick how it was first.");
      return;
    }
    if (!text.trim()) {
      setProblem("Write a few words for other travelers.");
      return;
    }
    setSaving(true);
    setProblem(null);
    try {
      const res = await postReview(id, {
        name: place.name,
        kind: place.kind as "hotel" | "restaurant" | "attraction",
        destination,
        place,
        verdict: chosen,
        text: text.trim(),
        shared,
      });
      if (res.feedback) applyFeedback(res.feedback, res.taste);
      setWriting(false);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Couldn't post the review.");
    } finally {
      setSaving(false);
    }
  };

  const checkIn = async () => {
    setChecking(true);
    setCheckNote(null);
    try {
      const res = await checkInHere(id);
      setCheckNote({ ok: true, text: `Checked in at ${res.name}.` });
    } catch (err) {
      setCheckNote({ ok: false, text: err instanceof Error ? err.message : "Couldn't check you in." });
    } finally {
      setChecking(false);
    }
  };

  const reviews = data?.reviews ?? [];
  return (
    <section data-testid="traveler-reviews" aria-label="Traveler reviews">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[16px] font-semibold">From travelers on XPMatch</h3>
        {data?.summary.count ? (
          <span className="text-[13px] text-muted">
            {data.summary.count} review{data.summary.count === 1 ? "" : "s"}
            {data.summary.verified ? ` · ${data.summary.verified} verified` : ""}
          </span>
        ) : null}
      </div>

      {/* Proof first: a traveler on the spot checks in, then reviews whenever they like. */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[14px]" data-testid="check-in">
        {proof ? (
          <>
            <ProofBadge proof={proof} />
            <span className="text-neutral-700">{proof === "checked_in" ? `You checked in at ${name}. Your review shows it.` : `You booked ${name}. Your review shows it.`}</span>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={checkIn} disabled={checking} aria-busy={checking || undefined}>
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {checking ? "Checking…" : "I'm here: check in"}
            </Button>
            <span className="text-[12px] text-muted">One location reading, compared with the place and dropped. Proves your review.</span>
          </>
        )}
        {/* Once checked in, the badge line says so; a note stays only to say why not. */}
        {checkNote && !(checkNote.ok && proof) ? (
          <p className={clsx("w-full text-[13px]", checkNote.ok ? "text-emerald-700" : "text-red-600")} role="status">
            {checkNote.text}
          </p>
        ) : null}
      </div>

      {writing ? (
        <form
          className="mt-4 grid gap-3 rounded-2xl border border-border bg-surface/50 p-4"
          data-testid="review-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="text-[14px] font-semibold">How was {name}?</div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="How was it">
            {VERDICTS.map((v) => (
              <Chip key={v} active={chosen === v} onClick={() => setVerdict(v)}>
                {VERDICT_LABEL[v]}
              </Chip>
            ))}
          </div>
          <TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={REVIEW_MAX}
            placeholder="What should other travelers know? The room, the food, the view, the service…"
            aria-label={`Your review of ${name}`}
          />
          <label className="flex items-center gap-2 text-[13px] text-neutral-700">
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="h-4 w-4 accent-[var(--xp-brand)]" />
            Share with other travelers (as your first name and last initial)
          </label>
          {problem ? (
            <p className="text-[13px] text-red-600" role="alert">
              {problem}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Posting…" : mine ? "Update review" : "Post review"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setWriting(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : !mine ? (
        <Button className="mt-4" onClick={openForm}>
          Leave a review
        </Button>
      ) : null}

      {loading && !data ? <p className="mt-4 text-[14px] text-muted">Loading reviews…</p> : null}
      {error && !data ? <p className="mt-4 text-[14px] text-muted">Couldn&apos;t load traveler reviews.</p> : null}
      {reviews.length ? (
        <ul className="mt-4 grid gap-3">
          {reviews.map((r) => (
            <ReviewItem key={r.id} review={r} onEdit={openForm} onDelete={() => void removeReview(id).catch(() => undefined)} />
          ))}
        </ul>
      ) : data && !writing ? (
        <p className="mt-4 text-[14px] text-muted">No traveler reviews yet. Be the first to review {name}.</p>
      ) : null}
    </section>
  );
}
