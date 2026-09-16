"use client";

import { Meh, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { useTravelStore } from "@/lib/store";
import { TASTE_DOMAINS, TASTE_DOMAIN_LABEL, VERDICT_LABEL, type FeedbackVerdict } from "@/lib/feedback/types";

const VERDICT_ICON: Record<FeedbackVerdict, typeof ThumbsUp> = { loved: ThumbsUp, fine: Meh, disliked: ThumbsDown };

/** The taste profile as the traveler sees it: per-domain summary and the reaction history with delete. */
export function YourTaste() {
  const { feedback, taste, removeFeedback } = useTravelStore();
  if (!taste || taste.total === 0) {
    return <p className="text-[13px] text-muted">No reactions yet. Rate places from their cards, the map sheet or after a trip, and this fills in.</p>;
  }
  return (
    <div className="grid gap-4" data-testid="your-taste">
      <p className="text-[13px] text-muted">
        {taste.total} rating{taste.total === 1 ? "" : "s"} so far. The assistant sees this summary and steers picks toward what you loved.
      </p>
      {TASTE_DOMAINS.map((domain) => {
        const s = taste.domains[domain];
        if (!s) return null;
        return (
          <section key={domain} className="rounded-2xl border border-border p-3" aria-label={TASTE_DOMAIN_LABEL[domain]}>
            <div className="flex items-center justify-between">
              <h4 className="text-[14px] font-semibold">{TASTE_DOMAIN_LABEL[domain]}</h4>
              <span className="text-[12px] text-muted">
                {s.count} rating{s.count === 1 ? "" : "s"}
                {s.priceTendency ? ` · usually ${s.priceTendency}` : ""}
              </span>
            </div>
            {s.liked.length || s.disliked.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.liked.slice(0, 5).map((r) => (
                  <span key={`l-${r.reason}`} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-700">
                    {r.reason} ×{r.count}
                  </span>
                ))}
                {s.disliked.slice(0, 5).map((r) => (
                  <span key={`d-${r.reason}`} className="rounded-full bg-rose-50 px-2 py-0.5 text-[12px] font-medium text-rose-700">
                    {r.reason} ×{r.count}
                  </span>
                ))}
              </div>
            ) : null}
            <ol className="mt-2 grid gap-1">
              {s.ranked.slice(0, 8).map((p) => {
                const Icon = VERDICT_ICON[p.verdict];
                return (
                  <li key={p.placeId} className="flex items-center gap-2 text-[13px]">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-label={VERDICT_LABEL[p.verdict]} />
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    {p.category ? <span className="hidden truncate text-[12px] text-muted sm:inline">{p.category}</span> : null}
                    {p.score !== undefined ? <span className="rounded-full bg-surface px-2 py-0.5 text-[12px] font-semibold">{p.score.toFixed(1)}</span> : null}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      <details className="rounded-2xl border border-border p-3">
        <summary className="cursor-pointer text-[14px] font-semibold">All reactions ({feedback.length})</summary>
        <ul className="mt-2 grid gap-1">
          {feedback.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-[13px]">
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{f.name}</span> · {VERDICT_LABEL[f.verdict]}
                {f.reasons.length ? <span className="text-muted"> · {f.reasons.join(", ")}</span> : null}
              </span>
              <span className="text-[12px] text-muted">{new Date(f.updatedAt).toLocaleDateString()}</span>
              <button type="button" onClick={() => removeFeedback(f.id)} aria-label={`Forget reaction to ${f.name}`} className="rounded-full p-1.5 text-neutral-500 hover:bg-surface hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
