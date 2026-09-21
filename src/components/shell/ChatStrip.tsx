"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Briefcase, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useTravelStore, formatDateRange } from "@/lib/store";
import { useMapView } from "@/lib/map-store";
import { useUiState, type PlannerTab } from "@/components/providers/UiState";

const BUDGET_LABEL: Record<string, string> = {
  budget: "Budget",
  "mid-range": "Mid-range",
  premium: "Premium",
  luxury: "Luxury",
};

/**
 * The slim strip above the conversation: the chat title opens the Recent menu (every
 * conversation, newest first, with its trip and a remove button), the planner chips edit
 * Where / When / Who / Budget, and New chat starts over.
 */
export function ChatStrip() {
  const { planner, chats, trips, removeChat } = useTravelStore();
  const { openPlanner, startNewChat } = useUiState();
  const { threadId } = useMapView();
  const activeChat = chats.find((c) => c.id === threadId);
  const chatLabel = activeChat ? (activeChat.title.length > 34 ? `${activeChat.title.slice(0, 34)}…` : activeChat.title) : "New chat";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
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
    <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border/60 bg-white px-3 sm:px-4" data-testid="chat-strip">
      {/* min-w-0 lets a long chat title truncate on phones instead of pushing the buttons off screen. */}
      <div className="relative min-w-0 shrink" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex w-full max-w-[320px] items-center gap-1 rounded-lg px-2 py-1 text-[14px] font-semibold hover:bg-surface"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          data-testid="chat-menu-button"
        >
          <span className="truncate">{chatLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
        {menuOpen ? (
          <div className="absolute left-0 top-9 z-30 w-80 rounded-2xl border border-border bg-white p-1.5 shadow-floating" data-testid="chat-nav-list">
            <button
              type="button"
              className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-[13px] font-medium hover:bg-surface"
              onClick={() => {
                setMenuOpen(false);
                startNewChat();
              }}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Start a new chat
            </button>
            <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Recent</div>
            {chats.length === 0 ? <p className="px-3 pb-2 text-[12px] text-muted">No conversations yet.</p> : null}
            <ul className="xp-scroll grid max-h-[50vh] gap-0.5 overflow-y-auto">
              {chats.map((c) => {
                const active = c.id === threadId;
                const trip = c.tripId ? trips.find((t) => t.id === c.tripId) : undefined;
                return (
                  <li key={c.id} className="group relative">
                    <Link
                      href={`/chat?thread=${encodeURIComponent(c.id)}`}
                      aria-current={active ? "page" : undefined}
                      title={c.title}
                      onClick={() => setMenuOpen(false)}
                      className={clsx("block rounded-lg px-3 py-2 pr-9 text-[13px] leading-snug", active ? "bg-surface font-semibold" : "hover:bg-surface/70")}
                    >
                      <span className="block truncate">{c.title}</span>
                      {trip ? (
                        <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted">
                          <Briefcase className="h-3 w-3 shrink-0" aria-hidden="true" /> {trip.title}
                        </span>
                      ) : null}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeChat(c.id)}
                      aria-label={`Remove ${c.title}`}
                      className="absolute right-1.5 top-1.5 rounded-full p-1.5 text-neutral-400 opacity-0 hover:bg-white hover:text-error focus:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
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
                s.value ? "font-semibold text-foreground" : "text-muted",
                i > 0 && "border-l border-border/80",
              )}
              title={s.value ? `${s.label}: ${s.value}` : s.label}
            >
              {s.value ?? s.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={startNewChat}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-white px-3 text-[13px] font-medium hover:bg-surface"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">New chat</span>
        <span className="sr-only sm:hidden">New chat</span>
      </button>
    </div>
  );
}
