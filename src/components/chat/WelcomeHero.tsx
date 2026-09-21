"use client";

import type { ReactElement } from "react";
import { SlidersHorizontal, Sparkles } from "lucide-react";
import { useTravelStore, firstName } from "@/lib/store";
import { useUiState } from "@/components/providers/UiState";
import { useMediaQuery } from "@/lib/use-media-query";
import { DiscoveryFeed } from "@/components/panel/DiscoveryPanel";
import { PhoneQuiz } from "@/components/chat/PhoneQuiz";

function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <span className="flex items-center justify-center rounded-full bg-brand-soft text-brand" style={{ width: size, height: size }} aria-hidden="true">
      <Sparkles style={{ width: size * 0.45, height: size * 0.45 }} strokeWidth={2} />
    </span>
  );
}

/**
 * Empty-state screen slotted into CopilotChat. Receives the chat input and
 * suggestion pills so the hero owns the layout while the chat owns behavior.
 * Below the xl breakpoint there is no side panel, so the discovery feed (Jump back
 * in, home picks, inspiration) scrolls under the composer instead.
 */
export function WelcomeHero({ input, suggestionView }: { input: ReactElement; suggestionView: ReactElement }) {
  const { profile } = useTravelStore();
  const { openAssistant } = useUiState();
  const wide = useMediaQuery("(min-width: 1280px)");
  const phone = !useMediaQuery("(min-width: 640px)");
  const name = firstName(profile);

  if (phone && !profile.onboarded) {
    // The first run on a phone is a short conversation, not a dialog: three questions, then the picks.
    return (
      <div className="flex h-full min-h-0 flex-col" data-testid="mobile-home">
        <div className="xp-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
          <PhoneQuiz />
        </div>
        <div className="mx-auto w-full max-w-[780px] px-4 pb-2">{input}</div>
      </div>
    );
  }

  if (!wide) {
    return (
      <div className="xp-scroll flex h-full min-h-0 flex-col overflow-y-auto" data-testid="mobile-home">
        <div className="flex flex-col items-center px-5 pt-6 text-center">
          <BrandMark size={44} />
          <h1 className="mt-3 text-[26px] font-semibold tracking-tight">Where to today{name ? `, ${name}` : ""}?</h1>
          <p className="mt-1 font-serif text-[16px] text-muted">Ask me anything travel related.</p>
        </div>
        <div className="mx-auto w-full max-w-[780px] px-4 pt-4">
          <div className="mb-3 flex justify-center">{suggestionView}</div>
          {input}
        </div>
        <div className="px-4 pb-8">
          <DiscoveryFeed compact picksFirst={phone} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <BrandMark />
        <h1 className="mt-5 text-[34px] font-semibold tracking-[-0.03em]">Where to today{name ? `, ${name}` : ""}?</h1>
        <p className="mt-3 max-w-[520px] font-serif text-[18px] leading-relaxed text-muted">
          Hey there, I&apos;m here to assist you in planning your experience. Ask me anything travel related.
        </p>
        <button
          type="button"
          onClick={openAssistant}
          className="mt-5 inline-flex h-9 items-center gap-2 rounded-full border border-border bg-white px-4 text-[13px] font-medium hover:bg-surface"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Update my assistant
        </button>
      </div>
      <div className="mx-auto w-full max-w-[780px] px-4 pb-4">
        <div className="mb-3 flex justify-center">{suggestionView}</div>
        {input}
      </div>
    </div>
  );
}
