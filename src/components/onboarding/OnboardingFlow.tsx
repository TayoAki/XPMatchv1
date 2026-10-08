"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { ChevronLeft, Minus, Pause, Play, Plus, Sparkles, X } from "lucide-react";
import { formatDateRange, useTravelStore, type TravelerProfile } from "@/lib/store";
import { useAppConfig } from "@/lib/app-config";
import { PERSONALITY_OPTIONS, VOICE_OPTIONS } from "@/lib/profile/options";
import { QUIZ, QUIZ_QUESTIONS, answersSummary, applyRecordedAnswers, sectionOf, type QuizField, type QuizSection } from "@/lib/onboarding/quiz";
import type { InterviewContext } from "@/lib/onboarding/interview";
import { voiceSupported } from "@/lib/voice/live-interview";
import { Button } from "@/components/ui/Button";
import { CityInput } from "./CityInput";
import { MAX_PLACES, PlaceList } from "./PlaceList";
import { Pill, QuizStepView } from "./QuizStepView";
import { VoiceBar } from "./VoiceBar";
import { useSamples } from "./useSamples";
import { useVoiceInterview } from "./useVoiceInterview";

/**
 * First run, full screen: five setup screens (the basics; voice and personality; a trip in mind;
 * places been and wanted; the interview), then four sections of questions about how they travel.
 * "Start voice interview" has Gemini Live ask those questions out loud and fill the answers in as
 * the traveler talks; "Skip interview" lets them tap through the same screens. Closing at any
 * point keeps what was entered. "Update my assistant" edits all of it later.
 */

type SetupKey = "basics" | "voice" | "trip" | "places" | "interview";
type StepKey = SetupKey | QuizSection;

interface StepMeta {
  key: StepKey;
  /** The footer label beside the back arrow. */
  label: string;
  title: string;
  image: string;
}

const QUIZ_LABEL: Record<QuizSection, string> = { style: "Travel style", stays: "Stays", food: "Food", wrap: "Wrapping up" };

const STEPS: StepMeta[] = [
  { key: "basics", label: "The basics", title: "Hi, I’m your travel assistant.", image: "/onboarding/basics.webp" },
  { key: "voice", label: "Voice & personality", title: "Before we dive in, how would you like our conversations to sound?", image: "/onboarding/voice.webp" },
  { key: "trip", label: "Your next trip", title: "Do you have a trip in mind now?", image: "/onboarding/trip.webp" },
  { key: "places", label: "Favorite places", title: "Share a few places you’ve been and want to go", image: "/onboarding/places.webp" },
  { key: "interview", label: "Interview", title: "Let’s talk about how you like to travel.", image: "/onboarding/places.webp" },
  ...QUIZ.map((s) => ({ key: s.key, label: QUIZ_LABEL[s.key], title: s.title, image: s.image })),
];

const indexOf = (key: StepKey) => STEPS.findIndex((s) => s.key === key);
const LAST = STEPS.length - 1;

const BODY = "text-[16px] leading-relaxed text-foreground/85 sm:text-[17px]";
const LABEL = "text-[17px] font-semibold tracking-tight";
const INPUT =
  "h-[52px] w-full rounded-full border border-border bg-white px-5 text-[16px] text-foreground placeholder:text-neutral-400 focus:border-foreground focus:outline-none";

function splitName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return [parts[0] ?? "", parts.slice(1).join(" ")];
}

function initialDraft(profile: TravelerProfile): TravelerProfile {
  return { ...profile, voice: VOICE_OPTIONS.some((o) => o.name === profile.voice) ? profile.voice : VOICE_OPTIONS[0].name };
}

const people = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;

/** The trip in mind as one line for the interview ("A long weekend… Where: Tokyo. When: Mar 3 – 10. 2 people."). */
function tripLine(d: TravelerProfile): string {
  if (d.tripInMind === "no") return "No trip in mind right now.";
  if (d.tripInMind !== "yes") return "";
  const when = formatDateRange(d.nextStartDate, d.nextEndDate);
  return [
    d.nextNotes.trim().slice(0, 400),
    d.nextDestination.trim() ? `Where: ${d.nextDestination.trim()}.` : "",
    when ? `When: ${when}.` : "",
    d.nextTravelers ? `${people(d.nextTravelers)}.` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 600);
}

/** What is already answered on screen, in the interview's words, so a second interview skips it. */
function answeredLine(d: TravelerProfile, answered: ReadonlySet<QuizField>): string {
  const fields = QUIZ_QUESTIONS.filter((q) => (q.kind === "single" ? answered.has(q.field) : q.kind === "multi" ? (d[q.field] as string[]).length > 0 : d.notes.trim() !== "")).map((q) => q.field);
  return Object.entries(answersSummary(d, fields))
    .map(([arg, value]) => `${arg}: ${Array.isArray(value) ? value.join(", ") : value}`)
    .join("; ")
    .slice(0, 1500);
}

/* ------------------------------ small pieces ------------------------------ */

function BrandMark() {
  return (
    <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-brand text-white" aria-hidden="true">
      <Sparkles className="h-6 w-6" strokeWidth={2} />
    </span>
  );
}

function OptionCard({ selected, onSelect, children, className }: { selected: boolean; onSelect: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={clsx(
        "w-full rounded-2xl border bg-white text-left transition-[border-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        selected ? "border-foreground shadow-[0_0_0_1px_var(--xp-fg)]" : "border-border hover:border-neutral-400",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** A Where / When / Who row: the value (or a prompt) on the right, its editor below when open. */
function DetailRow({ label, value, empty, open, onToggle, children }: { label: string; value: string; empty: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className={clsx("rounded-2xl border bg-white transition-colors", open ? "border-foreground" : "border-border")}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex h-[56px] w-full items-center justify-between gap-4 rounded-2xl px-5 text-left">
        <span className="text-[16px] font-semibold">{label}</span>
        <span className={clsx("min-w-0 truncate text-[14px]", value ? "font-medium text-foreground" : "text-muted")}>{value || empty}</span>
      </button>
      {open ? <div className="px-5 pb-5">{children}</div> : null}
    </div>
  );
}

/* --------------------------------- the flow -------------------------------- */

export function OnboardingFlow() {
  const { profile, updateProfile, updatePlanner } = useTravelStore();
  const config = useAppConfig();
  const [supported] = useState(() => voiceSupported());
  const voiceReady = !!config?.voice && supported;

  const [draft, setDraft] = useState<TravelerProfile>(() => initialDraft(profile));
  const draftRef = useRef(draft);
  const [[first, last], setName] = useState<[string, string]>(() => splitName(profile.name));
  const [step, setStep] = useState(0);
  // Single-answer questions start unpicked even though the profile holds a default.
  const [answered, setAnswered] = useState<Set<QuizField>>(() => new Set());
  const answeredRef = useRef(answered);
  const markAnswered = useCallback((fields: QuizField[]) => {
    if (fields.every((f) => answeredRef.current.has(f))) return;
    answeredRef.current = new Set([...answeredRef.current, ...fields]);
    setAnswered(answeredRef.current);
  }, []);
  /** The next section, shown a moment after the voice interview fills the last question of one. */
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flash, setFlash] = useState<Set<QuizField>>(() => new Set());
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tripEditor, setTripEditor] = useState<"where" | "when" | "who" | null>(null);
  const [voiceUsed, setVoiceUsed] = useState(false);
  const [interviewDone, setInterviewDone] = useState(false);
  const samples = useSamples();
  const scrollRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  /** Every change goes through here, so the voice interview's tool calls always build on the latest answers. */
  const update = useCallback((patch: Partial<TravelerProfile> | ((d: TravelerProfile) => TravelerProfile)) => {
    const next = typeof patch === "function" ? patch(draftRef.current) : { ...draftRef.current, ...patch };
    draftRef.current = next;
    setDraft(next);
  }, []);
  const set = <K extends keyof TravelerProfile>(key: K, value: TravelerProfile[K]) => update({ [key]: value } as Partial<TravelerProfile>);

  const meta = STEPS[step];
  const quizIndex = QUIZ.findIndex((s) => s.key === meta.key);

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  // A new screen starts at the top and moves focus to its title (the first screen focuses the name instead).
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    scrollRef.current?.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const compose = (onboarded: boolean): TravelerProfile => {
    const d = draftRef.current;
    const trip = d.tripInMind === "yes";
    return {
      ...d,
      name: [first.trim(), last.trim()].filter(Boolean).join(" ") || d.name,
      homeCity: d.homeCity.trim(),
      // The home page lines up picks for the trip in mind, else for the first place they want to go.
      nextDestination: (trip ? d.nextDestination.trim() : "") || d.placesWant[0] || "",
      nextWhen: trip ? formatDateRange(d.nextStartDate, d.nextEndDate) : "",
      nextNotes: trip ? d.nextNotes.trim() : "",
      nextStartDate: trip ? d.nextStartDate : "",
      nextEndDate: trip ? d.nextEndDate : "",
      nextTravelers: trip ? d.nextTravelers : 0,
      onboarded,
    };
  };

  const voice = useVoiceInterview((name, args) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (name === "record_answers") {
      const { profile: next, changed } = applyRecordedAnswers(draftRef.current, args);
      if (!changed.length) return { saved: {}, note: "Nothing matched the questionnaire; ask again or move on." };
      update(next);
      markAnswered(changed);
      setFlash(new Set(changed));
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(new Set()), 1600);
      // Show what was just filled in; once a section is complete, move on to the next one, since
      // the assistant is about to ask it (it does not always say so with show_section).
      const at = QUIZ.findIndex((s) => s.key === sectionOf(changed[changed.length - 1]));
      setStep(indexOf(QUIZ[at].key));
      const complete = QUIZ[at].questions.every((q) => answeredRef.current.has(q.field));
      if (complete && at < QUIZ.length - 1) advanceTimer.current = setTimeout(() => setStep(indexOf(QUIZ[at + 1].key)), 1200);
      return { saved: answersSummary(next, changed) };
    }
    if (name === "show_section") {
      const section = QUIZ.find((s) => s.key === args.section)?.key;
      if (!section) return { error: `Unknown section. Use one of: ${QUIZ.map((s) => s.key).join(", ")}.` };
      setStep(indexOf(section));
      return { shown: section };
    }
    if (name === "finish_interview") {
      setInterviewDone(true);
      setStep(LAST);
      // Kept in the account straight away; Finish (or closing) completes the setup.
      updateProfile(compose(false));
      return { ok: true };
    }
    return { error: `Unknown function ${name}` };
  });

  const startInterview = (fromIntro: boolean) => {
    samples.stop();
    setVoiceUsed(true);
    setInterviewDone(false);
    if (fromIntro) setStep(indexOf("style"));
    const d = draftRef.current;
    const ctx: InterviewContext = {
      firstName: first.trim(),
      homeCity: d.homeCity.trim(),
      personality: d.personality,
      placesBeen: d.placesBeen.slice(0, MAX_PLACES),
      placesWant: d.placesWant.slice(0, MAX_PLACES),
      trip: tripLine(d),
      answered: fromIntro ? "" : answeredLine(d, answered),
    };
    voice.start(ctx, d.voice);
  };

  const finish = () => {
    voice.stop();
    samples.stop();
    const done = compose(true);
    if (done.tripInMind === "yes" && done.nextDestination) {
      // A trip in mind is where the planner starts (the Discover fields and the next chat).
      updatePlanner({ where: done.nextDestination, startDate: done.nextStartDate, endDate: done.nextEndDate, ...(done.nextTravelers ? { travelers: done.nextTravelers } : {}) });
    }
    updateProfile(done);
  };

  const onAnswer = (field: QuizField, value: TravelerProfile[QuizField]) => {
    set(field, value);
    markAnswered([field]);
  };

  const canNext = meta.key !== "basics" || first.trim().length > 0;
  const next = () => {
    if (!canNext) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    samples.stop();
    if (step >= LAST) finish();
    else setStep(step + 1);
  };
  const back = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    samples.stop();
    setStep((s) => Math.max(0, s - 1));
  };

  const voiceActive = voice.status === "connecting" || voice.status === "live";
  const startDateInvalid = !!draft.nextStartDate && !!draft.nextEndDate && draft.nextEndDate < draft.nextStartDate;

  let body: ReactNode;
  if (meta.key === "basics") {
    body = (
      <>
        <p className={BODY}>I’d love to learn how you like to travel. I’ll remember what matters to you and build on it over time, so every recommendation, plan, and trip feels more like you. First, the basics.</p>
        <h2 className={clsx(LABEL, "mt-9")}>What’s your name?</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            autoFocus
            aria-label="First name"
            placeholder="First name"
            autoComplete="given-name"
            maxLength={40}
            value={first}
            onChange={(e) => setName([e.target.value, last])}
            onKeyDown={(e) => e.key === "Enter" && next()}
            className={INPUT}
          />
          <input
            aria-label="Last name"
            placeholder="Last name"
            autoComplete="family-name"
            maxLength={60}
            value={last}
            onChange={(e) => setName([first, e.target.value])}
            onKeyDown={(e) => e.key === "Enter" && next()}
            className={INPUT}
          />
        </div>
        <h2 className={clsx(LABEL, "mt-8")}>
          <label htmlFor="onboarding-home">Where do you live?</label>
        </h2>
        <CityInput
          id="onboarding-home"
          className="mt-3"
          scope="home"
          label="Where do you live?"
          placeholder="City or town"
          value={draft.homeCity}
          onChange={(v) => set("homeCity", v)}
          onSubmit={() => next()}
          testId="onboarding-home"
        />
      </>
    );
  } else if (meta.key === "voice") {
    body = (
      <>
        {voiceReady ? (
          <>
            <h2 className={clsx(LABEL, "mt-8")}>Voice</h2>
            <div role="radiogroup" aria-label="Voice" className="mt-3 grid gap-3 sm:grid-cols-2">
              {VOICE_OPTIONS.map((o) => {
                const selected = draft.voice === o.name;
                const playing = samples.playing === o.name;
                return (
                  <div key={o.name} className="relative">
                    <OptionCard selected={selected} onSelect={() => set("voice", o.name)} className="flex h-[60px] items-center gap-2 pl-5 pr-16">
                      <span className="text-[16px] font-semibold">{o.name}</span>
                      <span className="text-[13px] text-muted">{o.hint}</span>
                    </OptionCard>
                    <button
                      type="button"
                      onClick={() => samples.toggle(o.name)}
                      aria-label={playing ? `Stop the ${o.name} sample` : `Play a sample of ${o.name}`}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-foreground hover:bg-surface"
                    >
                      {playing ? <Pause className="h-4 w-4 fill-current" aria-hidden="true" /> : <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden="true" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
        <h2 className={clsx(LABEL, "mt-8")}>Personality</h2>
        <div role="radiogroup" aria-label="Personality" className="mt-3 grid gap-3">
          {PERSONALITY_OPTIONS.map((o) => (
            <OptionCard key={o.value} selected={draft.personality === o.value} onSelect={() => set("personality", o.value)} className="px-5 py-4">
              <span className="block text-[16px] font-semibold">{o.label}</span>
              <span className="mt-0.5 block text-[15px] text-muted">{o.hint}</span>
            </OptionCard>
          ))}
        </div>
      </>
    );
  } else if (meta.key === "trip") {
    const when = formatDateRange(draft.nextStartDate, draft.nextEndDate);
    body = (
      <>
        <div role="radiogroup" aria-label="Do you have a trip in mind now?" className="mt-6 flex gap-3">
          <Pill single size="lg" active={draft.tripInMind === "yes"} onClick={() => set("tripInMind", "yes")}>
            Yes
          </Pill>
          <Pill single size="lg" active={draft.tripInMind === "no"} onClick={() => set("tripInMind", "no")}>
            No
          </Pill>
        </div>
        {draft.tripInMind === "yes" ? (
          <div className="mt-6">
            <textarea
              aria-label="Tell me about the trip"
              value={draft.nextNotes}
              maxLength={2000}
              onChange={(e) => set("nextNotes", e.target.value)}
              placeholder="Somewhere warm in March, a long weekend with friends, a honeymoon…"
              className="min-h-[132px] w-full resize-y rounded-2xl border border-border bg-white px-4 py-3 text-[16px] leading-relaxed placeholder:text-neutral-400 focus:border-foreground focus:outline-none"
            />
            <div className="mt-1 text-right text-[12px] tabular-nums text-muted">{draft.nextNotes.length}/2000</div>
            <p className="mt-4 text-[15px] text-muted">Have details? Share what you know.</p>
            <div className="mt-3 grid gap-3">
              <DetailRow label="Where" value={draft.nextDestination.trim()} empty="Select destination" open={tripEditor === "where"} onToggle={() => setTripEditor((e) => (e === "where" ? null : "where"))}>
                <CityInput
                  autoFocus
                  scope="any"
                  label="Where to?"
                  placeholder="City, region or country"
                  value={draft.nextDestination}
                  onChange={(v) => set("nextDestination", v)}
                  onPick={(s) => {
                    set("nextDestination", s.text);
                    setTripEditor(null);
                  }}
                  onSubmit={() => setTripEditor(null)}
                  onCancel={() => setTripEditor(null)}
                />
              </DetailRow>
              <DetailRow label="When" value={when} empty="Select dates" open={tripEditor === "when"} onToggle={() => setTripEditor((e) => (e === "when" ? null : "when"))}>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-medium">From</span>
                    <input
                      type="date"
                      value={draft.nextStartDate}
                      onChange={(e) => update((d) => ({ ...d, nextStartDate: e.target.value, nextEndDate: d.nextEndDate && e.target.value && d.nextEndDate < e.target.value ? "" : d.nextEndDate }))}
                      className="h-11 w-full rounded-xl border border-border bg-white px-3 text-[15px] focus:border-foreground focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-medium">To</span>
                    <input
                      type="date"
                      value={draft.nextEndDate}
                      min={draft.nextStartDate || undefined}
                      onChange={(e) => set("nextEndDate", e.target.value)}
                      aria-invalid={startDateInvalid || undefined}
                      className="h-11 w-full rounded-xl border border-border bg-white px-3 text-[15px] focus:border-foreground focus:outline-none"
                    />
                  </label>
                </div>
                {startDateInvalid ? (
                  <p role="alert" className="mt-2 text-[13px] text-error">
                    The end date must come after the start date.
                  </p>
                ) : null}
              </DetailRow>
              <DetailRow label="Who" value={draft.nextTravelers ? people(draft.nextTravelers) : ""} empty="Add people" open={tripEditor === "who"} onToggle={() => setTripEditor((e) => (e === "who" ? null : "who"))}>
                <div className="flex items-center justify-between">
                  <span className="text-[15px]">People going, you included</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Fewer people"
                      disabled={draft.nextTravelers <= 1}
                      onClick={() => set("nextTravelers", Math.max(1, draft.nextTravelers - 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:bg-surface disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="w-8 text-center text-[16px] font-semibold tabular-nums" aria-live="polite">
                      {draft.nextTravelers || "–"}
                    </span>
                    <button
                      type="button"
                      aria-label="More people"
                      disabled={draft.nextTravelers >= 16}
                      onClick={() => set("nextTravelers", Math.min(16, Math.max(1, draft.nextTravelers + 1)))}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:bg-surface disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </DetailRow>
            </div>
          </div>
        ) : draft.tripInMind === "no" ? (
          <p className={clsx(BODY, "mt-6")}>No problem. I’ll keep ideas coming, and you can start planning whenever something catches your eye.</p>
        ) : null}
      </>
    );
  } else if (meta.key === "places") {
    body = (
      <>
        <p className={BODY}>These help me understand the kinds of trips you like and recommend what’s next.</p>
        <div className="mt-8 grid gap-8">
          <PlaceList title="Favorite places you’ve been" values={draft.placesBeen} onChange={(v) => set("placesBeen", v)} testId="places-been" />
          <PlaceList title="Places you want to go" values={draft.placesWant} onChange={(v) => set("placesWant", v)} testId="places-want" />
        </div>
      </>
    );
  } else if (meta.key === "interview") {
    body = voiceReady ? (
      <>
        <p className={BODY}>
          I’m going to ask a few questions about those places you’ve loved, experiences you’ve enjoyed, and the things that matter most when you travel. Hearing about them in your own words will help me get a real sense of your travel style.
        </p>
        <Button size="lg" onClick={() => startInterview(true)} className="mt-8 h-[56px] px-[32px] text-[16px]" data-testid="start-voice-interview">
          Start voice interview
        </Button>
        <p className="mt-4 max-w-[560px] text-[13px] leading-relaxed text-muted">
          About four minutes. Your voice goes to Google’s Gemini so it can follow along; XPMatch keeps your answers, not the recording. You can switch to typing at any point.
        </p>
      </>
    ) : (
      <p className={BODY}>I’m going to ask a few questions about how you like to travel: who comes along, where you stay, what you eat and how you spend a free weekend. It takes about two minutes.</p>
    );
  } else {
    body = <QuizStepView step={QUIZ[quizIndex]} draft={draft} answered={answered} onAnswer={onAnswer} flash={flash} />;
  }

  let action: ReactNode;
  if (meta.key === "interview" && voiceReady) {
    action = (
      <button type="button" onClick={() => setStep(indexOf("style"))} className="px-2 text-[15px] font-medium text-foreground underline underline-offset-4 hover:text-brand">
        Skip interview
      </button>
    );
  } else {
    action = (
      <Button size="lg" onClick={next} disabled={!canNext} className="h-[50px] min-w-[132px] px-[32px] text-[16px]">
        {step >= LAST ? "Finish" : "Next"}
      </Button>
    );
  }

  const progress = ((step + 1) / (STEPS.length + 1)) * 100;

  return (
    <div role="dialog" aria-modal="true" aria-label="Set up your travel assistant" className="xp-backdrop-in fixed inset-0 z-[75] flex bg-white" data-testid="onboarding" data-step={meta.key}>
      <div ref={scrollRef} className="xp-scroll relative flex min-h-0 w-full flex-col overflow-y-auto lg:w-[51%]">
        {/* The close button stays put while the screen scrolls under it. */}
        <div className="sticky top-0 z-20 flex h-16 shrink-0 items-center bg-white px-4">
          <button
            type="button"
            onClick={finish}
            aria-label="Close setup"
            title="Close (your answers are kept)"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-foreground hover:bg-surface-2"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 px-5 pb-10 pt-1 sm:px-10 lg:px-[clamp(40px,6.5vw,128px)]">
          <div className="max-w-[720px]">
            <BrandMark />
            <h1 ref={headingRef} tabIndex={-1} className="mt-8 text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] focus:outline-none sm:text-[34px]">
              {meta.title}
            </h1>
            <div className="mt-4">{body}</div>
          </div>
        </div>
        <div className="sticky bottom-0 z-20 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:px-8">
          {voiceUsed && quizIndex >= 0 ? (
            <div className="mb-4">
              <VoiceBar
                status={voice.status}
                error={voice.error}
                captions={voice.captions}
                speaking={voice.speaking}
                level={voice.level}
                muted={voice.muted}
                finished={interviewDone && !voiceActive}
                onMute={voice.setMuted}
                onStop={voice.stop}
                onRetry={() => startInterview(false)}
              />
            </div>
          ) : null}
          <div
            role="progressbar"
            aria-label="Setup progress"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={step + 1}
            aria-valuetext={`Step ${step + 1} of ${STEPS.length}: ${meta.label}`}
            className="h-[3px] w-full overflow-hidden rounded-full bg-surface-2"
          >
            <div className="h-full rounded-full bg-foreground transition-[width] duration-500 ease-[var(--xp-ease)]" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              {step > 0 ? (
                <button type="button" onClick={back} aria-label="Back" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-surface">
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
              ) : null}
              <span className={clsx("truncate text-[14px] font-medium text-muted", step === 0 && "pl-1")}>{meta.label}</span>
            </div>
            {action}
          </div>
        </div>
      </div>
      <div className="hidden min-h-0 p-6 lg:block lg:w-[49%] xl:p-8">
        {/* eslint-disable-next-line @next/next/no-img-element -- static art from /public, already sized */}
        <img key={meta.image} src={meta.image} alt="" className="xp-page-in h-full w-full rounded-[28px] object-cover" />
      </div>
    </div>
  );
}
