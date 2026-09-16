"use client";

import { useMemo, useState, type FormEvent } from "react";
import { MessageCircleQuestion, Send } from "lucide-react";
import { api } from "@/lib/api";
import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import { SUGGESTED_QUESTIONS, type PlaceAnswer } from "@/lib/places/facts";
import { useTravelStore } from "@/lib/store";
import { EvidenceList } from "./EvidenceList";

/** Suggested questions: the place kind's defaults, led by what the traveler's dealbreakers and preferences care about. */
export function suggestedQuestions(kind: PlaceKind, statements: string[]): string[] {
  const base = SUGGESTED_QUESTIONS[kind] ?? [];
  const personal: string[] = [];
  const text = statements.join(" ").toLowerCase();
  if (kind === "hotel") {
    if (/noise|quiet/.test(text)) personal.push("Is it quiet at night?");
    if (/desk|workspace|work/.test(text)) personal.push("Is there a desk to work at?");
    if (/stairs|elevator|mobility/.test(text)) personal.push("Is there an elevator?");
    if (/air conditioning/.test(text)) personal.push("Does it have air conditioning?");
    if (/far from the center|center/.test(text)) personal.push("How far is it from the center?");
  }
  if (kind === "restaurant") {
    if (/vegetarian|vegan/.test(text)) personal.push("Are there vegetarian options?");
    if (/spicy/.test(text)) personal.push("Is the food very spicy?");
    if (/crowd|tourist/.test(text)) personal.push("Is it touristy?");
  }
  if (kind === "attraction") {
    if (/crowd|tourist/.test(text)) personal.push("Is it crowded?");
    if (/stairs|mobility/.test(text)) personal.push("Is it wheelchair accessible?");
    if (/early/.test(text)) personal.push("When is the best time to go?");
  }
  const merged = [...personal, ...base.filter((q) => !personal.includes(q))];
  return merged.slice(0, 3);
}

/**
 * "Ask about this place": a question box with suggested questions and the
 * answer cards (answer, confidence, verbatim evidence) for one place.
 */
export function AskAboutPlace({ place }: { place: ResolvedPlace }) {
  const { preferences, profile } = useTravelStore();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ placeId: string; items: PlaceAnswer[] }>({ placeId: place.id, items: [] });
  const items = answers.placeId === place.id ? answers.items : [];

  const suggestions = useMemo(
    () => suggestedQuestions(place.kind, [...preferences.map((p) => p.statement), profile.notes, profile.accommodation, profile.dietary]),
    [place.kind, preferences, profile.notes, profile.accommodation, profile.dietary],
  );

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    try {
      const answer = await api<PlaceAnswer>("/api/places/ask", { method: "POST", json: { placeId: place.id, kind: place.kind, question: q } });
      setAnswers((prev) => ({ placeId: place.id, items: [answer, ...(prev.placeId === place.id ? prev.items : [])] }));
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not answer right now");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void ask(question);
  };

  if (place.source !== "google") return null;

  return (
    <section className="grid gap-3" data-testid="ask-about-place">
      <form onSubmit={submit} className="flex items-center gap-2 rounded-full border border-border bg-white py-1 pl-4 pr-1 focus-within:border-neutral-900">
        <MessageCircleQuestion className="h-4 w-4 shrink-0 text-neutral-500" />
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={`Ask about ${place.name}… e.g. ${suggestions[0] ?? "Is it quiet at night?"}`}
          aria-label="Ask about this place"
          className="h-9 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-neutral-400"
          maxLength={240}
        />
        <button type="submit" disabled={busy || !question.trim()} aria-label="Ask" className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white disabled:opacity-30">
          <Send className="h-4 w-4" />
        </button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button key={s} type="button" onClick={() => ask(s)} disabled={busy} className="h-8 rounded-full border border-border bg-white px-3 text-[13px] font-medium hover:bg-surface disabled:opacity-50">
            {s}
          </button>
        ))}
      </div>
      {busy ? <p className="text-[13px] text-muted">Reading the reviews…</p> : null}
      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
      {items.map((a, i) => (
        <article key={`${a.question}-${i}`} className="rounded-2xl border border-border bg-white p-4" data-testid="place-answer">
          <div className="text-[13px] font-semibold text-neutral-600">{a.question}</div>
          <p className="mt-1 text-[15px] text-neutral-900">{a.answer}</p>
          <div className="mt-3">
            <EvidenceList answer={a} />
          </div>
        </article>
      ))}
    </section>
  );
}
