"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Plays the short voice samples in /public/onboarding/voices, one at a time. */
export function useSamples() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const stop = useCallback(() => {
    audio.current?.pause();
    audio.current = null;
    setPlaying(null);
  }, []);
  const toggle = useCallback(
    (name: string) => {
      if (playing === name) {
        stop();
        return;
      }
      audio.current?.pause();
      const a = new Audio(`/onboarding/voices/${name.toLowerCase()}.wav`);
      audio.current = a;
      const done = () => {
        if (audio.current !== a) return;
        audio.current = null;
        setPlaying(null);
      };
      a.onended = done;
      a.onerror = done;
      setPlaying(name);
      void a.play().catch(done);
    },
    [playing, stop],
  );
  useEffect(() => () => audio.current?.pause(), []);
  return { playing, toggle, stop };
}
