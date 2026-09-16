import type { FeedbackVerdict } from "@/lib/feedback/types";

/**
 * Beli-style local insertion. A reaction picks a bucket (loved / fine / not
 * for me); pairwise "which did you prefer?" answers then place the new spot
 * among the places already rated in the same bucket by binary search, and its
 * score is read off its position. Nobody types a number.
 */

export const BUCKET_RANGE: Record<FeedbackVerdict, [number, number]> = {
  loved: [6.7, 10],
  fine: [3.4, 6.6],
  disliked: [0, 3.3],
};

export interface RankedEntry {
  id: string;
  name: string;
  score: number;
}

export interface Insertion {
  verdict: FeedbackVerdict;
  /** Same-bucket places, best first. */
  ranked: RankedEntry[];
  /** Candidate position bounds: it lands somewhere in [lo, hi] (indices into `ranked`, hi may equal ranked.length). */
  lo: number;
  hi: number;
  asked: number;
  maxQuestions: number;
  done: boolean;
}

export const MAX_QUESTIONS = 3;

export function startInsertion(verdict: FeedbackVerdict, ranked: RankedEntry[], maxQuestions = MAX_QUESTIONS): Insertion {
  const sorted = [...ranked].sort((a, b) => b.score - a.score);
  const state: Insertion = { verdict, ranked: sorted, lo: 0, hi: sorted.length, asked: 0, maxQuestions, done: false };
  state.done = sorted.length === 0 || maxQuestions === 0;
  return state;
}

/** The place to compare against next (the middle of the remaining range), or null when placement is settled. */
export function nextOpponent(state: Insertion): RankedEntry | null {
  if (state.done || state.lo >= state.hi || state.asked >= state.maxQuestions) return null;
  return state.ranked[Math.floor((state.lo + state.hi) / 2)] ?? null;
}

/** Records an answer: `preferredNew` true when the traveler prefers the new place over the opponent. */
export function answer(state: Insertion, preferredNew: boolean): Insertion {
  const opponent = nextOpponent(state);
  if (!opponent) return { ...state, done: true };
  const mid = Math.floor((state.lo + state.hi) / 2);
  const next: Insertion = preferredNew ? { ...state, hi: mid, asked: state.asked + 1 } : { ...state, lo: mid + 1, asked: state.asked + 1 };
  next.done = next.lo >= next.hi || next.asked >= next.maxQuestions;
  return next;
}

/** The traveler cannot compare the pair: settle at the bottom of the undecided range, never above a place it did not beat. */
export function skip(state: Insertion): Insertion {
  return { ...state, lo: state.hi, done: true };
}

/** Index in `ranked` before which the candidate goes. */
export function finalPosition(state: Insertion): number {
  return Math.floor((state.lo + state.hi) / 2);
}

/** Score between neighbors, inside the bucket's range; a lone place sits in the bucket's upper third. */
export function scoreAt(state: Insertion): number {
  const [lo, hi] = BUCKET_RANGE[state.verdict];
  const position = finalPosition(state);
  const above = state.ranked[position - 1]?.score;
  const below = state.ranked[position]?.score;
  const upper = above !== undefined ? above : hi;
  const lower = below !== undefined ? below : lo;
  const value = state.ranked.length === 0 ? lo + (hi - lo) * 0.66 : (upper + lower) / 2;
  return Math.round(Math.min(hi, Math.max(lo, value)) * 10) / 10;
}

/** Score for a place that was never compared: the bucket's midpoint. */
export function bucketScore(verdict: FeedbackVerdict): number {
  const [lo, hi] = BUCKET_RANGE[verdict];
  return Math.round(((lo + hi) / 2) * 10) / 10;
}
