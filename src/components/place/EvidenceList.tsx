"use client";

import clsx from "clsx";
import { Check, CircleHelp, Quote, X } from "lucide-react";
import type { PlaceAnswer } from "@/lib/places/facts";

function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return <>{text}</>;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length);
  const re = new RegExp(`(${escaped.join("|")})`, "ig");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        re.test(part) && i % 2 === 1 ? (
          <mark key={i} className="rounded bg-amber-100 px-0.5 text-inherit">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

const CONFIDENCE: Record<PlaceAnswer["confidence"], { label: string; className: string }> = {
  clear: { label: "Clear from the evidence", className: "bg-emerald-50 text-emerald-800" },
  mixed: { label: "Reviews disagree", className: "bg-amber-50 text-amber-800" },
  thin: { label: "Only one mention", className: "bg-amber-50 text-amber-800" },
  none: { label: "Not mentioned", className: "bg-neutral-100 text-neutral-600" },
};

/**
 * The evidence behind an answer: verbatim review passages with the matching
 * words highlighted, attribute badges, and the summary lines used, plus the
 * line that says what the answer is based on.
 */
export function EvidenceList({ answer, compact = false }: { answer: PlaceAnswer; compact?: boolean }) {
  const used = (type: "review" | "attribute" | "summary", index: number) => answer.refs.some((r) => r.type === type && r.ref === index);
  const { evidence } = answer;
  const confidence = CONFIDENCE[answer.confidence];
  return (
    <div className="grid gap-3" data-testid="evidence-list">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className={clsx("rounded-full px-2 py-0.5 font-medium", confidence.className)}>{confidence.label}</span>
        <span className="text-muted">{answer.basis}</span>
      </div>
      {evidence.attributes.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Attributes from Google">
          {evidence.attributes.map((a, i) => (
            <li
              key={a.key}
              className={clsx(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-medium",
                a.value === true ? "border-emerald-200 bg-emerald-50 text-emerald-800" : a.value === false ? "border-neutral-200 bg-neutral-50 text-neutral-600" : "border-border bg-surface",
                used("attribute", i) && "ring-1 ring-neutral-900/30",
              )}
              data-testid="evidence-attribute"
            >
              {a.value === true ? <Check className="h-3 w-3" /> : a.value === false ? <X className="h-3 w-3" /> : <CircleHelp className="h-3 w-3" />}
              {a.label}
              {a.value === false ? ": no" : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {evidence.summaryHits.length ? (
        <div className="rounded-xl bg-surface/70 px-3 py-2 text-[13px] text-neutral-800">
          <span className="font-semibold">{"Google's review summary: "}</span>
          {evidence.summaryHits.join(" ")}
        </div>
      ) : null}
      {evidence.snippets.length ? (
        <ul className="grid gap-2">
          {evidence.snippets.slice(0, compact ? 3 : 5).map((s, i) => (
            <li key={`${s.reviewIndex}-${i}`} className={clsx("rounded-xl border px-3 py-2 text-[13px]", used("review", i) ? "border-neutral-900/30 bg-white" : "border-border bg-white/60")} data-testid="evidence-quote">
              <div className="flex items-start gap-2">
                <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <div className="min-w-0">
                  <p className="text-neutral-800">
                    “<Highlighted text={s.sentence} terms={s.terms} />”
                  </p>
                  <div className="mt-0.5 text-[12px] text-muted">
                    {s.author}
                    {s.rating ? ` · ${s.rating}★` : ""}
                    {s.relativeTime ? ` · ${s.relativeTime}` : ""}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {evidence.snippets.length === 0 && evidence.attributes.length === 0 && evidence.summaryHits.length === 0 ? (
        <p className="text-[13px] text-muted">Nothing in the available reviews or details covers this. Google shares at most five reviews per place, so silence is not a verdict.</p>
      ) : null}
    </div>
  );
}
