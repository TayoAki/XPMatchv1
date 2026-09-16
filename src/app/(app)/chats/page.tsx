"use client";

import Link from "next/link";
import { Briefcase, MessageCircle, Trash2 } from "lucide-react";
import { PageFrame, EmptyState } from "@/components/PageFrame";
import { Button } from "@/components/ui/Button";
import { useTravelStore } from "@/lib/store";
import { useUiState } from "@/components/providers/UiState";

export default function ChatsPage() {
  const { chats, removeChat, trips } = useTravelStore();
  const { startNewChat } = useUiState();
  return (
    <PageFrame
      title="Chats"
      description="Every planning conversation, newest first."
      actions={<Button onClick={startNewChat}>New chat</Button>}
    >
      {chats.length === 0 ? (
        <EmptyState title="No chats yet" body="Ask XPMatch anything travel related and your conversations will be listed here." action={<Button onClick={startNewChat}>Start a chat</Button>} />
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {chats.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface">
                <MessageCircle className="h-4 w-4" />
              </span>
              <Link href={`/?thread=${encodeURIComponent(c.id)}`} className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium hover:underline">{c.title}</div>
                <div className="text-[12px] text-muted">Updated {new Date(c.updatedAt).toLocaleString()}</div>
              </Link>
              {c.tripId ? (
                <Link href={`/trips/${c.tripId}`} className="inline-flex h-7 items-center gap-1 rounded-full bg-surface px-2.5 text-[12px] font-medium hover:bg-surface-2">
                  <Briefcase className="h-3 w-3" /> {trips.find((t) => t.id === c.tripId)?.title ?? "Trip"}
                </Link>
              ) : null}
              <button type="button" onClick={() => removeChat(c.id)} aria-label={`Remove ${c.title}`} className="rounded-full p-2 text-neutral-500 hover:bg-surface hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
}
