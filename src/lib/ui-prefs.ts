"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Small per-browser UI preferences (never synced; safe to lose). */

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function useBoolPref(key: string, fallback: boolean): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? fallback : raw === "1";
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );
  const set = useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // ignore: preference simply won't persist
      }
      listeners.forEach((l) => l());
    },
    [key],
  );
  return [value, set];
}

/** Whether the side rail is collapsed to icons. */
export function useRailCollapsed(): [boolean, (collapsed: boolean) => void] {
  return useBoolPref("xpmatch:railCollapsed", false);
}

/** Whether the Chats item in the side rail shows the conversation list. */
export function useChatsExpanded(): [boolean, (open: boolean) => void] {
  return useBoolPref("xpmatch:chatsNav", true);
}
