"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Sparkles } from "lucide-react";
import { firstName, useTravelStore, type TravelerProfile } from "@/lib/store";
import { INTERESTS } from "@/lib/profile/options";
import { Chip, TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type BudgetTier = TravelerProfile["budgetTier"];

const BUDGETS: { value: BudgetTier; label: string; hint: string }[] = [
  { value: "budget", label: "Budget", hint: "hostels, street food, deals" },
  { value: "mid-range", label: "Mid-range", hint: "3–4★ hotels, nice dinners" },
  { value: "premium", label: "Premium", hint: "boutique & 4–5★" },
  { value: "luxury", label: "Luxury", hint: "the best of everything" },
];

/** Interest chips shown before "Show all"; chosen ones always stay visible. */
const FOLD_AT = 8;

function AssistantBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white">
        <Sparkles className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-surface px-4 py-3 text-[15px] leading-snug">{children}</div>
    </div>
  );
}

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end pl-10">
      <div className="max-w-full rounded-2xl rounded-tr-md bg-neutral-900 px-4 py-2.5 text-[14px] text-white">{children}</div>
    </div>
  );
}

/**
 * The phone's first run: three questions asked in the chat itself (where you start from and
 * where you dream of, what you love doing, how you spend), answered by tapping. Everything
 * else is learned later from conversations and "Update my assistant".
 */
export function PhoneQuiz() {
  const { profile, updateProfile } = useTravelStore();
  const [step, setStep] = useState(0);
  const [homeCity, setHomeCity] = useState(profile.homeCity);
  const [dream, setDream] = useState(profile.nextDestination);
  const [interests, setInterests] = useState<string[]>(profile.interests);
  const [budget, setBudget] = useState<BudgetTier>(profile.budgetTier);
  const [allInterests, setAllInterests] = useState(false);
  const name = firstName(profile);

  const toggleInterest = (label: string) => setInterests((list) => (list.includes(label) ? list.filter((v) => v !== label) : [...list, label]));
  const finish = (done: boolean) => {
    updateProfile({
      ...profile,
      homeCity: homeCity.trim(),
      nextDestination: dream.trim(),
      interests,
      budgetTier: budget,
      onboarded: true,
    });
    if (done) setStep(3);
  };

  const shownInterests = allInterests ? INTERESTS : INTERESTS.filter((o, i) => i < FOLD_AT || interests.includes(o.label));
  const hiddenInterests = INTERESTS.length - shownInterests.length;
  const whereAnswer = [homeCity.trim() ? `From ${homeCity.trim()}` : "", dream.trim() ? `dreaming of ${dream.trim()}` : ""].filter(Boolean).join(" · ") || "Skipped";

  return (
    <div className="grid gap-3" data-testid="phone-quiz">
      <AssistantBubble>
        Hi{name ? ` ${name}` : ""}! Three quick questions and I&apos;ll line up picks that fit you. <span className="font-semibold">Where do you start from, and where are you dreaming of going next?</span>
      </AssistantBubble>
      {step === 0 ? (
        <div className="ml-9 grid gap-2">
          <TextInput value={homeCity} onChange={(e) => setHomeCity(e.target.value)} placeholder="Home city, e.g. Austell, GA" aria-label="Home city" autoFocus />
          <TextInput value={dream} onChange={(e) => setDream(e.target.value)} placeholder="Dreaming of… e.g. Rome, Italy (optional)" aria-label="Dreaming of" />
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => finish(true)} className="text-[13px] text-neutral-500 underline-offset-2 hover:underline">
              Skip for now
            </button>
            <Button size="sm" onClick={() => setStep(1)}>
              Next
            </Button>
          </div>
        </div>
      ) : (
        <UserBubble>{whereAnswer}</UserBubble>
      )}

      {step >= 1 ? (
        <AssistantBubble>
          Got it. <span className="font-semibold">What do you love doing on a trip?</span> Tap everything that applies.
        </AssistantBubble>
      ) : null}
      {step === 1 ? (
        <div className="ml-9 grid gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Things you love doing" data-testid="quiz-interests">
            {shownInterests.map((o) => (
              <Chip key={o.label} active={interests.includes(o.label)} onClick={() => toggleInterest(o.label)}>
                {o.label}
              </Chip>
            ))}
            {!allInterests && hiddenInterests > 0 ? (
              <Chip onClick={() => setAllInterests(true)} className="border-dashed text-neutral-600">
                Show all (+{hiddenInterests})
              </Chip>
            ) : null}
          </div>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setStep(0)} className="text-[13px] text-neutral-500 underline-offset-2 hover:underline">
              Back
            </button>
            <Button size="sm" onClick={() => setStep(2)}>
              Next
            </Button>
          </div>
        </div>
      ) : step > 1 ? (
        <UserBubble>{interests.length ? interests.join(", ") : "A bit of everything"}</UserBubble>
      ) : null}

      {step >= 2 ? (
        <AssistantBubble>
          Last one. <span className="font-semibold">How do you like to spend when you travel?</span>
        </AssistantBubble>
      ) : null}
      {step === 2 ? (
        <div className="ml-9 grid gap-3">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Budget" data-testid="quiz-budget">
            {BUDGETS.map((b) => (
              <button
                key={b.value}
                type="button"
                aria-pressed={budget === b.value}
                onClick={() => setBudget(b.value)}
                className={clsx("rounded-2xl border px-3 py-2.5 text-left transition-colors", budget === b.value ? "border-neutral-900 bg-neutral-900 text-white" : "border-border bg-white hover:bg-surface")}
              >
                <span className="block text-[13px] font-semibold">{b.label}</span>
                <span className={clsx("block text-[12px]", budget === b.value ? "text-white/80" : "text-muted")}>{b.hint}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setStep(1)} className="text-[13px] text-neutral-500 underline-offset-2 hover:underline">
              Back
            </button>
            <Button size="sm" onClick={() => finish(true)}>
              Done
            </Button>
          </div>
        </div>
      ) : step > 2 ? (
        <UserBubble>{BUDGETS.find((b) => b.value === budget)?.label ?? "Mid-range"}</UserBubble>
      ) : null}
    </div>
  );
}
