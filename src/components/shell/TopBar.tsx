"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Bug, ChevronDown, Luggage } from "lucide-react";
import { useTravelStore, formatDateRange } from "@/lib/store";
import { useMapView } from "@/lib/map-store";
import { useUiState, type PlannerTab } from "@/components/providers/UiState";
import { useChatsExpanded } from "@/lib/ui-prefs";

const BUDGET_LABEL: Record<string, string> = {
  budget: "Budget",
  "mid-range": "Mid-range",
  premium: "Premium",
  luxury: "Luxury",
};

export function TopBar() {
  const { planner, chats } = useTravelStore();
  const { openPlanner, openBugReport, startNewChat } = useUiState();
  const { threadId } = useMapView();
  const activeChat = chats.find((c) => c.id === threadId);
  const chatLabel = activeChat ? (activeChat.title.length > 34 ? `${activeChat.title.slice(0, 34)}…` : activeChat.title) : "New chat";
  const [menuOpen, setMenuOpen] = useState(false);
  const [, setChatsExpanded] = useChatsExpanded();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const segments: { tab: PlannerTab; label: string; value?: string }[] = [
    { tab: "where", label: "Where", value: planner.where || undefined },
    { tab: "when", label: "When", value: formatDateRange(planner.startDate, planner.endDate) || undefined },
    {
      tab: "who",
      label: "Who",
      // Travelers defaults to 2, so only surface it once a trip is actually being planned.
      value: planner.where && planner.travelers ? `${planner.travelers} ${planner.travelers === 1 ? "traveler" : "travelers"}` : undefined,
    },
    { tab: "budget", label: "Budget", value: planner.budgetTier ? BUDGET_LABEL[planner.budgetTier] : undefined },
  ];

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border/60 bg-white px-3 sm:px-4">
      {/* min-w-0 lets a long chat title truncate on phones instead of pushing the buttons off screen. */}
      <div className="relative min-w-0 shrink" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex w-full max-w-[320px] items-center gap-1 rounded-lg px-2 py-1 text-[15px] font-semibold hover:bg-surface"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="truncate">{chatLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </button>
        {menuOpen ? (
          <div role="menu" className="absolute left-0 top-9 z-30 w-72 rounded-xl border border-border bg-white p-1 shadow-xl">
            <button
              type="button"
              role="menuitem"
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-surface"
              onClick={() => {
                setMenuOpen(false);
                startNewChat();
              }}
            >
              + Start a new chat
            </button>
            {chats.length > 0 ? (
              <>
                <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Recent</div>
                {chats.slice(0, 6).map((c) => (
                  <Link
                    key={c.id}
                    role="menuitem"
                    href={`/?thread=${encodeURIComponent(c.id)}`}
                    onClick={() => setMenuOpen(false)}
                    className="block truncate rounded-lg px-3 py-2 text-sm hover:bg-surface"
                  >
                    {c.title}
                  </Link>
                ))}
                <Link
                  href="/"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setChatsExpanded(true);
                  }}
                  className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface"
                >
                  All chats
                </Link>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 justify-center">
        <div className="hidden items-center rounded-full border border-border bg-white p-0.5 text-[13px] sm:flex">
          {segments.map((s, i) => (
            <button
              key={s.tab}
              type="button"
              onClick={() => openPlanner(s.tab)}
              className={clsx(
                "h-8 max-w-[160px] truncate rounded-full px-3.5 transition-colors hover:bg-surface",
                s.value ? "font-semibold text-foreground" : "text-neutral-600",
                i > 0 && "border-l border-border/80",
              )}
              title={s.value ? `${s.label}: ${s.value}` : s.label}
            >
              {s.value ?? s.label}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={openBugReport} aria-label="Report a bug" title="Report a bug" className="hidden shrink-0 rounded-full p-2 text-neutral-600 hover:bg-surface hover:text-foreground sm:block md:hidden">
        <Bug className="h-5 w-5" />
      </button>
      {/* Phones get the icon only; the More sheet in the tab bar carries the bug report. */}
      <button
        type="button"
        onClick={() => openPlanner("where")}
        aria-label="Create a trip"
        className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-brand px-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover sm:px-4"
      >
        <Luggage className="h-4 w-4" />
        <span className="hidden sm:inline">Create a trip</span>
      </button>
    </header>
  );
}
