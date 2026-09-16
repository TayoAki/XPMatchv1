"use client";

import { useSyncExternalStore } from "react";

/** Reactive CSS media query (server render assumes `serverDefault`). */
export function useMediaQuery(query: string, serverDefault = true): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverDefault,
  );
}
