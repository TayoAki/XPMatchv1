"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Plus } from "lucide-react";
import type { TravelerProfile } from "@/lib/types";
import { ownWords, type QuizField, type QuizQuestion, type QuizStep } from "@/lib/onboarding/quiz";

/** The most answers a question keeps (the profile allows 12 per list). */
const MAX_PICKS = 12;

export function Pill({
  active,
  single,
  size = "md",
  onClick,
  children,
  className,
}: {
  active: boolean;
  /** One answer only: announced as a radio button. */
  single?: boolean;
  size?: "md" | "lg";
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...(single ? { role: "radio", "aria-checked": active } : { "aria-pressed": active })}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border text-[15px] font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        size === "lg" ? "h-12 px-7" : "h-11 px-5",
        active ? "border-brand bg-brand text-white" : "border-border bg-white text-foreground hover:border-neutral-400 hover:bg-surface",
        className,
      )}
    >
      {children}
    </button>
  );
}

function OtherInput({ onAdd, onCancel, label }: { onAdd: (text: string) => void; onCancel: () => void; label: string }) {
  const [text, setText] = useState("");
  const add = () => {
    if (text.trim()) onAdd(text);
    setText("");
  };
  return (
    <div className="mt-3 flex max-w-[460px] items-center gap-2">
      <input
        autoFocus
        value={text}
        maxLength={40}
        aria-label={label}
        placeholder="In your own words"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }
        }}
        className="h-11 min-w-0 flex-1 rounded-full border border-border bg-white px-5 text-[15px] placeholder:text-neutral-400 focus:border-foreground focus:outline-none"
      />
      <button type="button" onClick={add} disabled={!text.trim()} className="h-11 rounded-full bg-brand px-5 text-[14px] font-medium text-white disabled:bg-neutral-300">
        Add
      </button>
    </div>
  );
}

function Question({
  question,
  draft,
  answered,
  onAnswer,
  flashing,
}: {
  question: QuizQuestion;
  draft: TravelerProfile;
  answered: boolean;
  onAnswer: (field: QuizField, value: TravelerProfile[QuizField]) => void;
  flashing: boolean;
}) {
  const [otherOpen, setOtherOpen] = useState(false);
  const headingId = `quiz-${question.field}`;
  const wrap = (body: ReactNode) => (
    <section
      aria-labelledby={headingId}
      data-testid={`question-${question.field}`}
      className={clsx("-mx-3 rounded-2xl px-3 py-3 transition-colors duration-700", flashing ? "bg-brand-soft" : "bg-transparent")}
    >
      <h2 id={headingId} className="mb-3 text-[17px] font-semibold tracking-tight">
        {question.prompt}
      </h2>
      {body}
    </section>
  );

  if (question.kind === "text") {
    const value = draft.notes;
    return wrap(
      <div>
        <textarea
          aria-labelledby={headingId}
          value={value}
          maxLength={2000}
          onChange={(e) => onAnswer("notes", e.target.value)}
          placeholder="Allergies, a bad knee, a love of rooftop bars, points you’re saving… anything helps."
          className="min-h-[132px] w-full resize-y rounded-2xl border border-border bg-white px-4 py-3 text-[15px] leading-relaxed placeholder:text-neutral-400 focus:border-foreground focus:outline-none"
        />
        <div className="mt-1 text-right text-[12px] tabular-nums text-muted">{value.length}/2000</div>
      </div>,
    );
  }

  if (question.kind === "single") {
    const value = draft[question.field] as string;
    return wrap(
      <div role="radiogroup" aria-labelledby={headingId} className="flex flex-wrap gap-2.5">
        {question.options.map((o) => (
          <Pill key={o.value} single active={answered && value === o.value} onClick={() => onAnswer(question.field, o.value as never)}>
            {o.sign ? <span className="font-semibold">{o.sign}</span> : null}
            {o.sign ? " " : null}
            {o.label}
          </Pill>
        ))}
      </div>,
    );
  }

  const values = (draft[question.field] as string[]) ?? [];
  const has = (v: string) => values.some((x) => x.toLowerCase() === v.toLowerCase());
  const toggle = (v: string) => onAnswer(question.field, (has(v) ? values.filter((x) => x.toLowerCase() !== v.toLowerCase()) : [...values, v].slice(0, MAX_PICKS)) as never);
  // Answers in the traveler's own words, and earlier answers no longer offered, show as picked chips too.
  const custom = values.filter((v) => !question.options.some((o) => o.value.toLowerCase() === v.toLowerCase()));
  return wrap(
    <div>
      <div role="group" aria-labelledby={headingId} className="flex flex-wrap gap-2.5">
        {question.options.map((o) => (
          <Pill key={o.value} active={has(o.value)} onClick={() => toggle(o.value)}>
            {o.label}
          </Pill>
        ))}
        {custom.map((v) => (
          <Pill key={`own-${v}`} active onClick={() => toggle(v)}>
            {v}
          </Pill>
        ))}
        {question.other ? (
          <Pill active={false} onClick={() => setOtherOpen((o) => !o)} className={clsx(otherOpen && "border-foreground")}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Other
          </Pill>
        ) : null}
      </div>
      {otherOpen ? (
        <OtherInput
          label={`${question.prompt} Other`}
          onCancel={() => setOtherOpen(false)}
          onAdd={(text) => {
            const v = ownWords(text);
            if (v && !has(v)) onAnswer(question.field, [...values, v].slice(0, MAX_PICKS) as never);
          }}
        />
      ) : null}
    </div>,
  );
}

/** One section of the quiz: its title and questions, answered by tapping or filled in by the voice interview. */
export function QuizStepView({
  step,
  draft,
  answered,
  onAnswer,
  flash,
}: {
  step: QuizStep;
  draft: TravelerProfile;
  /** Single-answer questions show no pick until answered (the profile holds defaults). */
  answered: ReadonlySet<QuizField>;
  onAnswer: (field: QuizField, value: TravelerProfile[QuizField]) => void;
  /** Questions the voice interview just filled, highlighted for a moment. */
  flash?: ReadonlySet<QuizField>;
}) {
  return (
    <div>
      {step.subtitle ? <p className="-mt-2 mb-6 text-[17px] leading-relaxed text-foreground/80">{step.subtitle}</p> : <div className="mb-4" />}
      <div className="grid gap-5">
        {step.questions.map((q) => (
          <Question key={q.field} question={q} draft={draft} answered={answered.has(q.field)} onAnswer={onAnswer} flashing={!!flash?.has(q.field)} />
        ))}
      </div>
    </div>
  );
}
