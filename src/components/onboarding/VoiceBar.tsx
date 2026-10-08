"use client";

import clsx from "clsx";
import { Check, Keyboard, Mic, MicOff, RotateCcw } from "lucide-react";
import type { VoiceCaptions, VoiceStatus } from "./useVoiceInterview";

function Orb({ speaking, level, live, finished, failed }: { speaking: boolean; level: number; live: boolean; finished: boolean; failed: boolean }) {
  // The ring grows with the traveler's voice; bars bounce while the assistant talks.
  return (
    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center" aria-hidden="true">
      <span
        className="absolute inset-0 rounded-full bg-brand/15 transition-transform duration-100"
        style={{ transform: `scale(${live && !speaking ? 1 + Math.min(0.5, level * 0.8) : 1})` }}
      />
      <span className="relative flex h-10 w-10 items-center justify-center gap-[3px] rounded-full bg-brand">
        {speaking ? (
          [0, 1, 2, 3].map((i) => <span key={i} className="xp-voice-bar h-4 w-[3px] rounded-full bg-white" style={{ animationDelay: `${i * 120}ms` }} />)
        ) : finished ? (
          <Check className="h-[18px] w-[18px] text-white" strokeWidth={2.5} />
        ) : failed ? (
          <MicOff className="h-[18px] w-[18px] text-white" strokeWidth={2} />
        ) : (
          <Mic className="h-[18px] w-[18px] text-white" strokeWidth={2} />
        )}
      </span>
    </span>
  );
}

/**
 * The voice interview's bar under the questions: who is talking, the live captions, mute, and a
 * way out to typing. When it ends or fails, it says so and offers to try again.
 */
export function VoiceBar({
  status,
  error,
  captions,
  speaking,
  level,
  muted,
  finished,
  onMute,
  onStop,
  onRetry,
}: {
  status: VoiceStatus;
  error: string | null;
  captions: VoiceCaptions;
  speaking: boolean;
  level: number;
  muted: boolean;
  /** The assistant wrapped up the interview itself. */
  finished: boolean;
  onMute: (muted: boolean) => void;
  onStop: () => void;
  onRetry: () => void;
}) {
  const live = status === "live";
  const active = live || status === "connecting";
  const heading =
    status === "connecting"
      ? "Connecting…"
      : live
        ? speaking
          ? "Speaking"
          : muted
            ? "Muted"
            : "Listening"
        : status === "error"
          ? "Voice stopped"
          : finished
            ? "Interview finished"
            : "Voice paused";
  const caption =
    status === "error"
      ? error
      : !active
        ? finished
          ? "Your answers are on screen. Change anything you like, then Finish."
          : "Your answers so far are kept. Carry on by tapping, or talk again."
        : status === "connecting"
          ? "Allow the microphone when your browser asks."
          : captions.assistant && (speaking || !captions.you)
            ? captions.assistant
            : captions.you
              ? `You: ${captions.you}`
              : "Say hi when you’re ready.";

  return (
    <div className="rounded-3xl border border-border bg-canvas p-3 sm:p-4" data-testid="voice-bar" data-status={status}>
      <div className="flex items-center gap-3">
        <Orb speaking={speaking} level={level} live={live} finished={finished && !active} failed={status === "error"} />
        <div className="min-w-0 flex-1" aria-live="polite">
          <div className={clsx("text-[13px] font-semibold", status === "error" ? "text-error" : "text-foreground")}>{heading}</div>
          <p className="line-clamp-2 text-[14px] leading-snug text-foreground/80" data-testid="voice-caption">
            {caption}
          </p>
        </div>
        {active ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => onMute(!muted)}
              aria-pressed={muted}
              aria-label={muted ? "Unmute microphone" : "Mute microphone"}
              disabled={!live}
              className={clsx(
                "flex h-10 w-10 items-center justify-center rounded-full border transition-colors disabled:opacity-40",
                muted ? "border-error bg-error text-white" : "border-border bg-white text-foreground hover:bg-surface",
              )}
            >
              {muted ? <MicOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Mic className="h-[18px] w-[18px]" aria-hidden="true" />}
            </button>
            <button type="button" onClick={onStop} className="flex h-10 items-center gap-1.5 rounded-full border border-border bg-white px-3.5 text-[13px] font-medium hover:bg-surface">
              <Keyboard className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Type instead</span>
              <span className="sm:hidden">Type</span>
            </button>
          </div>
        ) : finished ? null : (
          <button type="button" onClick={onRetry} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border bg-white px-3.5 text-[13px] font-medium hover:bg-surface">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Talk again
          </button>
        )}
      </div>
    </div>
  );
}
