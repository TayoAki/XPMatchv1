"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { INTERVIEW_MAX_MS, type InterviewContext } from "@/lib/onboarding/interview";
import { InterviewUnavailable, LiveInterview, type InterviewStart, type InterviewState } from "@/lib/voice/live-interview";

export type VoiceStatus = "idle" | InterviewState;

export interface VoiceCaptions {
  assistant: string;
  you: string;
}

/** Captions keep the end of a long turn. */
const CAPTION_MAX = 280;
const tail = (s: string) => (s.length > CAPTION_MAX ? `…${s.slice(-CAPTION_MAX)}` : s);

function reportUsage(usage: { seconds: number; modelSeconds: number }) {
  if (usage.seconds <= 0 && usage.modelSeconds <= 0) return;
  void fetch("/api/voice/usage", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seconds: Math.min(900, usage.seconds), modelSeconds: Math.min(900, usage.modelSeconds) }),
    keepalive: true,
  }).catch(() => undefined);
}

/**
 * The onboarding's voice interview as React state: start it from a click with what the traveler
 * already said, and the model's tool calls arrive at `onToolCall` (always the latest one passed).
 * The interview stops itself after `INTERVIEW_MAX_MS`, and its minutes are reported for the cost
 * meter however it ends.
 */
export function useVoiceInterview(onToolCall: (name: string, args: Record<string, unknown>) => Record<string, unknown>) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<VoiceCaptions>({ assistant: "", you: "" });
  const [speaking, setSpeaking] = useState(false);
  const [level, setLevel] = useState(0);
  const [muted, setMutedState] = useState(false);
  const current = useRef<LiveInterview | null>(null);
  const toolHandler = useRef(onToolCall);
  const lastSpeaker = useRef<"you" | "assistant" | null>(null);
  const cap = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    toolHandler.current = onToolCall;
  });

  const start = useCallback((ctx: InterviewContext, voice: string) => {
    if (current.current) return;
    setError(null);
    setCaptions({ assistant: "", you: "" });
    setMutedState(false);
    lastSpeaker.current = null;
    let reported = false;
    const instance: LiveInterview = new LiveInterview({
      onState: (state, detail) => {
        if (current.current !== instance) return;
        setStatus(state);
        if (state === "live") {
          cap.current = setTimeout(() => void instance.stop(), INTERVIEW_MAX_MS);
          return;
        }
        if (state === "error") setError(detail ?? "The voice interview stopped. You can finish by typing.");
        if (state === "ended" || state === "error") {
          // A new interview can start after this one.
          current.current = null;
          if (cap.current) clearTimeout(cap.current);
          setSpeaking(false);
          setLevel(0);
          // Already stopped: this only reads how long it ran.
          void instance.stop().then((usage) => {
            if (reported) return;
            reported = true;
            reportUsage(usage);
          });
        }
      },
      onToolCall: (name, args) => toolHandler.current(name, args),
      onTranscript: (who, text) => {
        const fresh = lastSpeaker.current !== who;
        lastSpeaker.current = who;
        setCaptions((c) => ({ ...c, [who]: tail(fresh ? text.trimStart() : c[who] + text) }));
      },
      onLevel: setLevel,
      onSpeaking: setSpeaking,
      onTurnComplete: () => {
        lastSpeaker.current = null;
      },
    });
    current.current = instance;
    void instance.start(async () => {
      try {
        return await api<InterviewStart>("/api/voice/session", { method: "POST", json: { voice, ...ctx } });
      } catch (err) {
        throw new InterviewUnavailable(err instanceof ApiError && err.status !== 401 && err.message ? err.message : "Couldn't start the voice interview. You can finish by typing.");
      }
    });
  }, []);

  /** Ends the interview; what was said so far stays on screen. */
  const stop = useCallback(() => {
    void current.current?.stop();
  }, []);

  const setMuted = useCallback((value: boolean) => {
    current.current?.setMuted(value);
    setMutedState(value);
  }, []);

  // Leaving the page ends the call.
  useEffect(
    () => () => {
      if (cap.current) clearTimeout(cap.current);
      void current.current?.stop();
    },
    [],
  );

  return { status, error, captions, speaking, level, muted, start, stop, setMuted };
}
