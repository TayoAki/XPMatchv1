"use client";

import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Briefcase, Plus, Trash2 } from "lucide-react";
import { useTravelStore } from "@/lib/store";
import { useMapView } from "@/lib/map-store";
import { useUiState } from "@/components/providers/UiState";

const INITIAL = 8;

/** The conversation list that expands under "Chats" in the sidebar. */
export function ChatNavList() {
  const { chats, trips, removeChat } = useTravelStore();
  const { startNewChat } = useUiState();
  const { threadId } = useMapView();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? chats : chats.slice(0, INITIAL);

  return (
    <div className="mb-1 ml-4 border-l border-border pl-2" data-testid="chat-nav-list">
      <button type="button" onClick={startNewChat} className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[13px] font-medium text-neutral-700 hover:bg-surface">
        <Plus className="h-3.5 w-3.5" /> New chat
      </button>
      {chats.length === 0 ? <p className="px-2 py-1.5 text-[12px] text-muted">No conversations yet.</p> : null}
      <ul className="grid gap-0.5">
        {visible.map((c) => {
          const active = c.id === threadId;
          const trip = c.tripId ? trips.find((t) => t.id === c.tripId) : undefined;
          return (
            <li key={c.id} className="group relative">
              <Link
                href={`/?thread=${encodeURIComponent(c.id)}`}
                aria-current={active ? "page" : undefined}
                title={c.title}
                className={clsx("block rounded-lg px-2 py-1.5 pr-7 text-[13px] leading-snug", active ? "bg-surface font-semibold" : "text-neutral-700 hover:bg-surface/70")}
              >
                <span className="block truncate">{c.title}</span>
                {trip ? (
                  <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted">
                    <Briefcase className="h-3 w-3 shrink-0" /> {trip.title}
                  </span>
                ) : null}
              </Link>
              <button
                type="button"
                onClick={() => removeChat(c.id)}
                aria-label={`Remove ${c.title}`}
                className="absolute right-1 top-1.5 rounded-full p-1 text-neutral-400 opacity-0 hover:bg-white hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          );
        })}
      </ul>
      {chats.length > INITIAL ? (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-0.5 px-2 py-1 text-[12px] font-medium text-neutral-600 hover:underline">
          {showAll ? "Show fewer" : `Show all ${chats.length}`}
        </button>
      ) : null}
    </div>
  );
}
