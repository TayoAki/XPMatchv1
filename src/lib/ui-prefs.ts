"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Small per-browser UI preferences (never synced; safe to lose). */

const RAIL_KEY = "xpmatch:chatRail";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readRail(): boolean {
  try {
    return window.localStorage.getItem(RAIL_KEY) !== "closed";
  } catch {
    return true;
  }
}

/** Whether the chat history rail is expanded (defaults to open). */
export function useChatRailOpen(): [boolean, (open: boolean) => void] {
  const open = useSyncExternalStore(subscribe, readRail, () => true);
  const setOpen = useCallback((value: boolean) => {
    try {
      window.localStorage.setItem(RAIL_KEY, value ? "open" : "closed");
    } catch {
      // ignore: preference simply won't persist
    }
    listeners.forEach((l) => l());
  }, []);
  return [open, setOpen];
}
