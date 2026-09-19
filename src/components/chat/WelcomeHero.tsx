"use client";

import type { ReactElement } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useTravelStore, firstName } from "@/lib/store";
import { useUiState } from "@/components/providers/UiState";
import { useMediaQuery } from "@/lib/use-media-query";
import { DiscoveryFeed } from "@/components/panel/DiscoveryPanel";

function HeroIllustration({ size = 140 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round((size * 120) / 140)} viewBox="0 0 140 120" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="xp-glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#c6f1dc" />
          <stop offset="100%" stopColor="#a8e6c9" />
        </radialGradient>
      </defs>
      <circle cx="70" cy="62" r="46" fill="url(#xp-glow)" />
      {/* skyline */}
      <path d="M32 84h76" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <rect x="40" y="58" width="10" height="26" rx="1.5" fill="#f59e0b" />
      <rect x="53" y="48" width="8" height="36" rx="1.5" fill="#fb7185" />
      <path d="M66 84V52l6-10 6 10v32" fill="#60a5fa" />
      <rect x="82" y="60" width="9" height="24" rx="1.5" fill="#a78bfa" />
      <rect x="94" y="66" width="7" height="18" rx="1.5" fill="#34d399" />
      {/* pin */}
      <path d="M70 12c-8.8 0-16 7.1-16 15.9C54 40 70 56 70 56s16-16 16-28.1C86 19.1 78.8 12 70 12z" fill="#ef4444" />
      <circle cx="70" cy="28" r="6" fill="#fff" />
      {/* clouds */}
      <g fill="#fff">
        <ellipse cx="34" cy="30" rx="14" ry="7" />
        <ellipse cx="42" cy="26" rx="9" ry="6" />
        <ellipse cx="110" cy="40" rx="15" ry="7" />
        <ellipse cx="118" cy="35" rx="9" ry="6" />
      </g>
    </svg>
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
  const name = firstName(profile);

  if (!wide) {
    return (
      <div className="xp-scroll flex h-full min-h-0 flex-col overflow-y-auto" data-testid="mobile-home">
        <div className="flex flex-col items-center px-5 pt-5 text-center">
          <HeroIllustration size={96} />
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight">Where to today{name ? `, ${name}` : ""}?</h1>
          <p className="mt-1 text-[14px] text-neutral-600">Ask me anything travel related.</p>
        </div>
        <div className="mx-auto w-full max-w-[780px] px-4 pt-4">
          <div className="mb-3 flex justify-center">{suggestionView}</div>
          {input}
        </div>
        <div className="px-4 pb-8">
          <DiscoveryFeed compact />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <HeroIllustration />
        <h1 className="mt-4 text-[34px] font-semibold tracking-tight">Where to today{name ? `, ${name}` : ""}?</h1>
        <p className="mt-3 max-w-[520px] text-[17px] leading-relaxed text-neutral-600">
          Hey there, I&apos;m here to assist you in planning your experience. Ask me anything travel related.
        </p>
        <button
          type="button"
          onClick={openAssistant}
          className="mt-5 inline-flex h-9 items-center gap-2 rounded-full bg-surface px-4 text-[13px] font-medium hover:bg-surface-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
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
