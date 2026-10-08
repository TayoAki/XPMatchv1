import type { Personality } from "@/lib/types";
import { PERSONALITY_OPTIONS } from "@/lib/profile/options";
import { QUIZ, type QuizSection } from "./quiz";

/**
 * The voice interview: what Gemini Live is told and the tools it calls while the traveler talks.
 * Built from the quiz itself, so the spoken questions and the screens never drift apart. The
 * server locks both into the session token; the browser handles the tool calls.
 */

export const INTERVIEW_MODEL = "gemini-3.8-live";
/** The interview ends itself after this long; Live sessions stop at 15 minutes anyway. */
export const INTERVIEW_MAX_MS = 8 * 60_000;

export interface InterviewContext {
  firstName: string;
  homeCity: string;
  personality: Personality;
  placesBeen: string[];
  placesWant: string[];
  /** What they said on "Do you have a trip in mind now?", already in words. */
  trip: string;
  /** Questions already answered on screen ("companions: Couple; budget: Upscale"), so a second interview picks up where the first stopped. */
  answered: string;
}

/** Function declarations in the Gemini schema format (types are the API's names). */
export function interviewTools() {
  const properties: Record<string, unknown> = {};
  for (const step of QUIZ) {
    for (const q of step.questions) {
      const labels = q.options.map((o) => o.label);
      if (q.kind === "single") properties[q.arg] = { type: "STRING", enum: labels, description: q.prompt };
      else if (q.kind === "multi") {
        properties[q.arg] = {
          type: "ARRAY",
          items: { type: "STRING" },
          description: `${q.prompt} The full list of what applies so far, using these options where they fit: ${labels.join(", ")}.${q.other ? " Anything else in a few of their own words." : ""}`,
        };
      } else properties[q.arg] = { type: "STRING", description: `${q.prompt} In their words, briefly.` };
    }
  }
  return [
    {
      functionDeclarations: [
        {
          name: "record_answers",
          description: "Saves the traveler's answers on screen as soon as you hear them. Send only the questions just answered; a list replaces what was saved for that question, so include earlier picks that still apply.",
          parameters: { type: "OBJECT", properties },
        },
        {
          name: "show_section",
          description: "Shows the next part of the questionnaire on screen. Call it before you start asking that part.",
          parameters: { type: "OBJECT", properties: { section: { type: "STRING", enum: QUIZ.map((s) => s.key) } }, required: ["section"] },
        },
        {
          name: "finish_interview",
          description: "Ends the interview once all four parts are covered or the traveler wants to stop.",
          parameters: { type: "OBJECT", properties: {} },
        },
      ],
    },
  ];
}

const SECTION_GUIDE: Record<QuizSection, string> = {
  style: "who they usually travel with, their typical budget, and what they sometimes splurge on",
  stays: "their usual accommodation style and any hotel loyalty programs",
  food: "the kinds of restaurants they like and any dietary restrictions",
  wrap: "how they like to have fun on weekends, then anything else you should know as their travel assistant",
};

const list = (values: string[]) => values.filter(Boolean).slice(0, 8).join(", ");

/** The system instruction for one traveler's interview. */
export function interviewInstruction(ctx: InterviewContext): string {
  const tone = PERSONALITY_OPTIONS.find((o) => o.value === ctx.personality) ?? PERSONALITY_OPTIONS[1];
  const known = [
    ctx.homeCity ? `They live in ${ctx.homeCity}.` : "",
    ctx.placesBeen.length ? `Places they have loved: ${list(ctx.placesBeen)}.` : "",
    ctx.placesWant.length ? `Places they want to go: ${list(ctx.placesWant)}.` : "",
    ctx.trip ? `Trip in mind: ${ctx.trip}` : "",
  ].filter(Boolean);
  const resumed = !!ctx.answered;
  const parts = QUIZ.map((s, i) => `${i + 1}. ${s.key}: ${SECTION_GUIDE[s.key]}.`).join("\n");
  return `You are XPMatch, a personal travel assistant, having a short spoken conversation (about four minutes) to learn how ${ctx.firstName || "the traveler"} likes to travel. Their answers fill a questionnaire they can see on screen.

Speak ${tone.label.toLowerCase()}ly: ${tone.hint} Use short sentences. Ask one question at a time and let them talk; react briefly and naturally to what they say. Only read out options when they seem unsure.

What you already know (use it to make questions personal, for example ask what they loved about a place):
${known.length ? known.join("\n") : "Nothing yet beyond their name."}

Cover these four parts in order. Every time you move on to a part, call show_section with its name before its first question:
${parts}

Whenever you hear an answer, call record_answers right away with the matching options, and keep talking; do not wait for it. If they correct themselves, send the corrected list. If they don't know or would rather skip, move on. Never ask for anything outside the questionnaire, and never ask for personal details such as their address, phone number or payment details.
${resumed ? `\nAlready answered on screen, so don't ask again unless they want to change something: ${ctx.answered}\n` : ""}
${
  resumed
    ? `Start by welcoming ${ctx.firstName || "them"} back in one sentence, then call show_section with the first part that still has unanswered questions and carry on from there.`
    : `Start by greeting ${ctx.firstName || "them"} by name in one sentence, then call show_section with "style" and ask who they usually travel with.`
} When all four parts are done, thank them in one sentence, say their answers are saved on screen and can be edited any time, and call finish_interview.`;
}
