"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bell, Briefcase, Heart, Users } from "lucide-react";
import { PageFrame, EmptyState } from "@/components/PageFrame";
import { useTravelStore, type UpdateItem } from "@/lib/store";

const ICON: Record<UpdateItem["kind"], typeof Bell> = { trip_invite: Users, trip_activity: Briefcase, guide_saved: Heart, system: Bell };

export default function UpdatesPage() {
  const { updates, markUpdatesRead } = useTravelStore();
  useEffect(() => {
    if (updates.some((u) => !u.read)) markUpdatesRead();
  }, [updates, markUpdatesRead]);
  return (
    <PageFrame title="Updates" description="Trip invites, what your travel companions added, and who saved your guides.">
      {updates.length === 0 ? (
        <EmptyState title="You're all caught up" body="You'll hear here when someone adds you to a trip, adds to a shared trip or saves one of your guides." />
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {updates.map((u) => {
            const Icon = ICON[u.kind] ?? Bell;
            const tripId = typeof u.data?.tripId === "string" ? u.data.tripId : null;
            return (
              <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px]">{u.text}</div>
                  <div className="text-[12px] text-muted">{new Date(u.at).toLocaleString()}</div>
                </div>
                {tripId ? (
                  <Link href={`/trips/${tripId}`} className="inline-flex h-8 items-center rounded-full border border-border px-3 text-[13px] font-medium hover:bg-surface">
                    Open trip
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </PageFrame>
  );
}
