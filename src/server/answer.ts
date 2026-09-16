import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import type { AnswerConfidence, Evidence, PlaceAnswer, PlaceFacts } from "@/lib/places/facts";
import { evidenceBasis, findEvidence } from "@/lib/places/evidence";

/**
 * Answers a question about a place from its evidence. The model only ever sees
 * the retrieved snippets, attributes and summary lines, and points at them by
 * index; quotes are rendered from the source text, never from the model.
 */

const answerSchema = z.object({
  answer: z.string().describe("One to three plain sentences answering the question from the evidence, hedged where it is thin"),
  confidence: z.enum(["clear", "mixed", "thin"]).describe("clear = evidence agrees, mixed = evidence disagrees, thin = one weak mention"),
  refs: z
    .array(z.object({ type: z.enum(["review", "attribute", "summary"]), ref: z.number().int().min(0) }))
    .max(6)
    .describe("Evidence items the answer rests on, by index"),
});

export type AnswerModel = LanguageModel | null;

const PERSONAL = /\b(owner|manager|who works|employee|phone number of|home address|email of)\b/i;

/** Questions the assistant will not try to answer from reviews. */
export function questionGuard(question: string): string | null {
  const q = question.trim();
  if (q.length < 3) return "Ask a question about the place, e.g. “Is it quiet at night?”";
  if (q.length > 240) return "Please keep the question under 240 characters.";
  if (PERSONAL.test(q)) return "XPMatch only answers questions about the place itself, not about the people who work there.";
  return null;
}

function templateAnswer(question: string, evidence: Evidence): { answer: string; confidence: AnswerConfidence; refs: PlaceAnswer["refs"] } {
  const refs: PlaceAnswer["refs"] = [];
  const parts: string[] = [];
  if (evidence.attributes.length) {
    const yes = evidence.attributes.filter((a) => a.value === true).map((a) => a.label.toLowerCase());
    const no = evidence.attributes.filter((a) => a.value === false).map((a) => a.label.toLowerCase());
    if (yes.length) parts.push(`Google lists ${yes.join(", ")}.`);
    if (no.length) parts.push(`Google lists no ${no.join(", ")}.`);
    evidence.attributes.forEach((_, i) => refs.push({ type: "attribute", ref: i }));
  }
  if (evidence.summaryHits.length) {
    parts.push(`Google's review summary says: ${evidence.summaryHits[0]}`);
    refs.push({ type: "summary", ref: 0 });
  }
  if (evidence.snippets.length) {
    const first = evidence.snippets[0];
    parts.push(`${first.author} wrote: “${first.sentence}”`);
    evidence.snippets.slice(0, 3).forEach((_, i) => refs.push({ type: "review", ref: i }));
  }
  const confidence: AnswerConfidence = parts.length === 0 ? "none" : evidence.snippets.length + evidence.summaryHits.length >= 2 || evidence.attributes.length ? "clear" : "thin";
  return {
    answer: parts.length ? parts.join(" ") : "The available reviews and details don't mention this. Check the website or ask the place directly.",
    confidence,
    refs,
  };
}

function evidenceForModel(question: string, facts: PlaceFacts, evidence: Evidence): string {
  const lines: string[] = [`Place: ${facts.name} (${facts.kind})`, `Question: ${question}`, ""];
  if (evidence.summaryHits.length) {
    lines.push("Google's review summary (type summary):");
    evidence.summaryHits.forEach((s, i) => lines.push(`  [summary ${i}] ${s}`));
  }
  if (evidence.attributes.length) {
    lines.push("Attributes from Google (type attribute):");
    evidence.attributes.forEach((a, i) => lines.push(`  [attribute ${i}] ${a.label}: ${a.value === true ? "yes" : a.value === false ? "no" : a.value}`));
  }
  if (evidence.snippets.length) {
    lines.push("Review passages (type review):");
    evidence.snippets.forEach((s, i) => lines.push(`  [review ${i}] ${s.author}${s.rating ? `, ${s.rating}★` : ""}${s.relativeTime ? `, ${s.relativeTime}` : ""}: "${s.sentence}"`));
  }
  return lines.join("\n");
}

const SYSTEM =
  "You answer one traveler question about a place using ONLY the evidence provided. Never add facts that are not in the evidence. If the evidence is thin, say so. Answer in one to three plain sentences, no bullet points, no quotes (the UI shows the quotes). List the refs you used.";

export async function answerPlaceQuestion(facts: PlaceFacts, question: string, model: AnswerModel): Promise<PlaceAnswer> {
  const evidence = findEvidence(facts, question);
  const basis = evidenceBasis(facts);
  const base = { placeId: facts.placeId, name: facts.name, question, evidence, basis };
  const empty = evidence.snippets.length === 0 && evidence.attributes.length === 0 && evidence.summaryHits.length === 0;
  if (empty || !model) {
    const t = templateAnswer(question, evidence);
    return { ...base, answer: t.answer, confidence: t.confidence, refs: t.refs };
  }
  try {
    const { object } = await generateObject({
      model,
      schema: answerSchema,
      system: SYSTEM,
      prompt: evidenceForModel(question, facts, evidence),
      maxRetries: 1,
    });
    const refs = object.refs.filter((r) => {
      if (r.type === "review") return r.ref < evidence.snippets.length;
      if (r.type === "attribute") return r.ref < evidence.attributes.length;
      return r.ref < evidence.summaryHits.length;
    });
    const answer = object.answer.trim();
    if (!answer) throw new Error("empty answer");
    return { ...base, answer, confidence: object.confidence, refs: refs.length ? refs : templateAnswer(question, evidence).refs };
  } catch (err) {
    console.warn("[answer] model call failed, using the template answer:", err instanceof Error ? err.message : err);
    const t = templateAnswer(question, evidence);
    return { ...base, answer: t.answer, confidence: t.confidence, refs: t.refs };
  }
}
