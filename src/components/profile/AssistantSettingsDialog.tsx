"use client";

import { useState } from "react";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, Brain, Sparkles, Trash2 } from "lucide-react";
import { YourTaste } from "@/components/feedback/YourTaste";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DEALBREAKER_OPTIONS, DOMAIN_LABEL, useTravelStore, type LearnedPreference, type TravelerProfile } from "@/lib/store";
import { useUiState } from "@/components/providers/UiState";
import { useMediaQuery } from "@/lib/use-media-query";
import { SECTIONS, SECTION_COMPONENT, type SectionKey } from "./ProfileSections";

/** Phones get three screens instead of six: two sections per step, same questions. */
const PHONE_STEPS: SectionKey[][] = [
  ["about", "style"],
  ["stays", "food"],
  ["logistics", "dealbreakers"],
];

export function AssistantSettingsDialog() {
  const { assistantOpen } = useUiState();
  // Mount the form only while open so the draft always starts from the saved profile.
  return assistantOpen ? <AssistantSettingsForm /> : null;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const POLARITY_LABEL: Record<LearnedPreference["polarity"], string> = { like: "Likes", dislike: "Avoids", dealbreaker: "Dealbreaker" };
const SOURCE_LABEL: Record<LearnedPreference["source"], string> = { onboarding: "from onboarding", chat: "learned in chat", feedback: "from your feedback" };

/**
 * First run: a six-step wizard (about you · style & interests · stays · food ·
 * logistics & next trip · dealbreakers & notes). Afterwards: the same sections
 * stacked, plus what XPMatch has learned and the taste profile.
 */
function AssistantSettingsForm() {
  const { profile, preferences, trips, updateProfile, addPreference, removePreference } = useTravelStore();
  const { closeAssistant } = useUiState();
  const wizard = !profile.onboarded;
  const phone = !useMediaQuery("(min-width: 640px)");
  const [draft, setDraft] = useState<TravelerProfile>(() => profile);
  const [step, setStep] = useState(0);
  // Dealbreaker chips start from the stored dealbreakers so the dialog is idempotent.
  const [dealbreakers, setDealbreakers] = useState<string[]>(() =>
    DEALBREAKER_OPTIONS.filter((o) => preferences.some((p) => !p.tripId && p.polarity === "dealbreaker" && same(p.statement, o.statement))).map((o) => o.statement),
  );

  const set = <K extends keyof TravelerProfile>(key: K, value: TravelerProfile[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const toggleDealbreaker = (statement: string) =>
    setDealbreakers((list) => (list.includes(statement) ? list.filter((s) => s !== statement) : [...list, statement]));

  const syncDealbreakers = () => {
    for (const option of DEALBREAKER_OPTIONS) {
      const stored = preferences.find((p) => !p.tripId && p.polarity === "dealbreaker" && same(p.statement, option.statement));
      const wanted = dealbreakers.includes(option.statement);
      if (wanted && !stored) void addPreference({ statement: option.statement, domain: option.domain, polarity: "dealbreaker", source: "onboarding" }).catch(() => undefined);
      if (!wanted && stored) removePreference(stored.id);
    }
  };

  const save = () => {
    updateProfile({ ...draft, onboarded: true });
    syncDealbreakers();
    closeAssistant();
  };

  const skip = () => {
    updateProfile({ ...draft, onboarded: true });
    closeAssistant();
  };

  const learned = preferences.filter((p) => !DEALBREAKER_OPTIONS.some((o) => o.statement === p.statement && p.polarity === "dealbreaker" && !p.tripId));
  const tripTitle = (id?: string) => (id ? trips.find((t) => t.id === id)?.title ?? "a trip" : null);
  const sectionProps = { draft, set, dealbreakers, toggleDealbreaker };
  const jump = (key: SectionKey) => {
    document.getElementById(`profile-section-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (wizard) {
    const steps: SectionKey[][] = phone ? PHONE_STEPS : SECTIONS.map((s) => [s.key]);
    const index = Math.min(step, steps.length - 1);
    const last = steps.length - 1;
    const meta = (key: SectionKey) => SECTIONS.find((s) => s.key === key) ?? SECTIONS[0];
    const stepTitle = (keys: SectionKey[]) => keys.map((k) => meta(k).title).join(" · ");
    return (
      <Modal
        open
        onClose={skip}
        title="Let's personalize your assistant"
        description={`Step ${index + 1} of ${steps.length} · ${stepTitle(steps[index])}. Everything is optional and editable later under Update my assistant.`}
        size="lg"
        footer={
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={skip} className="text-sm text-muted hover:underline">
              Skip for now
            </button>
            <div className="flex gap-2">
              {index > 0 ? (
                <Button variant="outline" onClick={() => setStep(index - 1)}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              ) : null}
              {index < last ? (
                <Button onClick={() => setStep(index + 1)}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={save}>Save preferences</Button>
              )}
            </div>
          </div>
        }
      >
        <ol className="mb-5 flex gap-1.5" aria-label="Onboarding steps" data-testid="onboarding-steps">
          {steps.map((keys, i) => (
            <li key={keys.join("-")} className="flex-1">
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={i === index ? "step" : undefined}
                aria-label={`Step ${i + 1}: ${stepTitle(keys)}`}
                className={clsx("block h-1.5 w-full rounded-full", i <= index ? "bg-neutral-900" : "bg-surface-2")}
              />
            </li>
          ))}
        </ol>
        {steps[index].map((key) => {
          const Section = SECTION_COMPONENT[key];
          const section = meta(key);
          return (
            <div key={key} className="mb-7 last:mb-0">
              <div className="mb-4">
                <h3 className="text-[16px] font-semibold">{section.title}</h3>
                <p className="text-[13px] text-muted">{section.blurb}</p>
              </div>
              <Section {...sectionProps} />
            </div>
          );
        })}
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={closeAssistant}
      title="Update my assistant"
      description="XPMatch uses this to tailor destinations, stays, flights, food and every itinerary to you. Saved to your account."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={closeAssistant}>
            Cancel
          </Button>
          <Button onClick={save}>Save preferences</Button>
        </div>
      }
    >
      <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Profile sections">
        {SECTIONS.map((s) => (
          <button key={s.key} type="button" onClick={() => jump(s.key)} className="h-8 rounded-full border border-border bg-white px-3 text-[12px] font-medium hover:bg-surface">
            {s.title}
          </button>
        ))}
        <button type="button" onClick={() => jump("dealbreakers")} className="hidden" aria-hidden="true" />
      </nav>
      <div className="grid gap-8">
        {SECTIONS.map((s) => {
          const Section = SECTION_COMPONENT[s.key];
          return (
            <section key={s.key} id={`profile-section-${s.key}`} aria-label={s.title}>
              <h3 className="text-[15px] font-semibold">{s.title}</h3>
              <p className="mb-3 text-[12px] text-muted">{s.blurb}</p>
              <Section {...sectionProps} />
            </section>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-border p-4" data-testid="memory-panel">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[14px] font-semibold">
              <Brain className="h-4 w-4" /> What XPMatch has learned
            </div>
            <p className="mt-0.5 text-[12px] text-muted">
              Tastes you confirmed in chat. Each one is sent to the assistant with every message; delete anything that no longer fits.
            </p>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[13px] font-medium">
            <input
              type="checkbox"
              checked={draft.learnFromChat}
              onChange={(e) => set("learnFromChat", e.target.checked)}
              className="h-4 w-4 accent-neutral-900"
            />
            Learn from our chats
          </label>
        </div>
        {learned.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted">Nothing yet. When you mention a taste in chat (“I prefer boutique hotels”), XPMatch will offer to remember it.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {learned.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2 text-[13px]" data-testid="memory-item">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{p.statement}</span>
                  <span className="block text-[12px] text-muted">
                    {POLARITY_LABEL[p.polarity]} · {DOMAIN_LABEL[p.domain]} · {SOURCE_LABEL[p.source]}
                    {p.tripId ? ` · only for ${tripTitle(p.tripId)}` : ""}
                  </span>
                </span>
                <button type="button" onClick={() => removePreference(p.id)} aria-label={`Forget ${p.statement}`} className="rounded-full p-2 text-neutral-500 hover:bg-surface hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-border p-4" data-testid="taste-panel">
        <div className="flex items-center gap-2 text-[14px] font-semibold">
          <Sparkles className="h-4 w-4" /> Your taste
        </div>
        <p className="mb-3 mt-0.5 text-[12px] text-muted">Built from your reactions to places (Loved it / It was fine / Not for me). Reasons that repeat become learned preferences above.</p>
        <YourTaste />
      </div>
    </Modal>
  );
}
