"use client";

import { useEffect } from "react";
import { Bell, Briefcase, Heart, Sparkles } from "lucide-react";
import { PageFrame, EmptyState } from "@/components/PageFrame";
import { useTravelStore, type UpdateItem } from "@/lib/store";

const ICON: Record<UpdateItem["kind"], typeof Bell> = { trip: Briefcase, profile: Sparkles, saved: Heart, system: Bell };

export default function UpdatesPage() {
  const { updates, markUpdatesRead } = useTravelStore();
  useEffect(() => {
    if (updates.some((u) => !u.read)) markUpdatesRead();
  }, [updates, markUpdatesRead]);
  return (
    <PageFrame title="Updates" description="What changed in your trips, saves and preferences.">
      {updates.length === 0 ? (
        <EmptyState title="You're all caught up" body="Trip confirmations, saved places and preference changes will appear here." />
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {updates.map((u) => {
            const Icon = ICON[u.kind];
            return (
              <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px]">{u.text}</div>
                  <div className="text-[12px] text-muted">{new Date(u.at).toLocaleString()}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageFrame>
  );
}
