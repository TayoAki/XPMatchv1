"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Briefcase, MessageCircle, PanelLeftClose, PanelLeftOpen, Search, SquarePen, Trash2 } from "lucide-react";
import { useTravelStore } from "@/lib/store";
import { useChatRailOpen } from "@/lib/ui-prefs";
import { useUiState } from "@/components/providers/UiState";

function relativeDay(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Chat history beside the active chat: every conversation, newest first, with
 * its trip, a search box and delete. Collapses to a slim strip.
 */
export function ChatHistoryRail({ activeThreadId }: { activeThreadId?: string }) {
  const { chats, trips, removeChat } = useTravelStore();
  const { startNewChat } = useUiState();
  const [open, setOpen] = useChatRailOpen();
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = q ? chats.filter((c) => c.title.toLowerCase().includes(q)) : chats;
    const map = new Map<string, typeof chats>();
    for (const c of visible) {
      const label = relativeDay(c.updatedAt);
      map.set(label, [...(map.get(label) ?? []), c]);
    }
    return Array.from(map.entries());
  }, [chats, query]);

  if (!open) {
    return (
      <div className="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-border/60 bg-white py-3" data-testid="chat-rail-collapsed">
        <button type="button" onClick={() => setOpen(true)} aria-label="Show chat history" title="Show chat history" className="rounded-full p-2 hover:bg-surface">
          <PanelLeftOpen className="h-5 w-5" />
        </button>
        <button type="button" onClick={startNewChat} aria-label="New chat" title="New chat" className="rounded-full p-2 hover:bg-surface">
          <SquarePen className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-[272px] shrink-0 flex-col border-r border-border/60 bg-white" data-testid="chat-rail">
      <div className="flex items-center justify-between px-3 pt-3">
        <h2 className="px-1 text-[15px] font-semibold tracking-tight">Chats</h2>
        <div className="flex items-center">
          <button type="button" onClick={startNewChat} aria-label="New chat" title="New chat" className="rounded-full p-2 hover:bg-surface">
            <SquarePen className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setOpen(false)} aria-label="Hide chat history" title="Hide chat history" className="rounded-full p-2 hover:bg-surface">
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="relative px-3 pt-2">
        <Search className="pointer-events-none absolute left-6 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          aria-label="Search chats"
          className="h-9 w-full rounded-full border border-border bg-surface pl-8 pr-3 text-[13px] outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white"
        />
      </div>
      <div className="xp-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2">
        {chats.length === 0 ? (
          <p className="px-3 py-6 text-center text-[13px] text-muted">Your conversations will be listed here.</p>
        ) : groups.length === 0 ? (
          <p className="px-3 py-6 text-center text-[13px] text-muted">No chats match “{query.trim()}”.</p>
        ) : (
          groups.map(([label, items]) => (
            <div key={label} className="mb-2">
              <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
              <ul className="grid gap-0.5">
                {items.map((c) => {
                  const active = c.id === activeThreadId;
                  const trip = c.tripId ? trips.find((t) => t.id === c.tripId) : undefined;
                  return (
                    <li key={c.id} className="group relative">
                      <Link
                        href={`/?thread=${encodeURIComponent(c.id)}`}
                        aria-current={active ? "page" : undefined}
                        className={clsx("block rounded-xl px-3 py-2 pr-9 transition-colors", active ? "bg-surface" : "hover:bg-surface/70")}
                      >
                        <span className="flex items-center gap-2">
                          <MessageCircle className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                          <span className="truncate text-[14px] font-medium">{c.title}</span>
                        </span>
                        {trip ? (
                          <span className="mt-0.5 flex items-center gap-1 pl-5 text-[12px] text-muted">
                            <Briefcase className="h-3 w-3" /> {trip.title}
                          </span>
                        ) : null}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeChat(c.id)}
                        aria-label={`Remove ${c.title}`}
                        className="absolute right-2 top-2 rounded-full p-1.5 text-neutral-400 opacity-0 transition-opacity hover:bg-white hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
