"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bell, Briefcase, Heart, Sparkles, Users } from "lucide-react";
import { PageFrame, EmptyState } from "@/components/PageFrame";
import { useTravelStore, type UpdateItem } from "@/lib/store";
import { tripsToRate } from "@/lib/feedback/post-trip";
import { ratedKey } from "@/components/feedback/PostTripRating";

const ICON: Record<UpdateItem["kind"], typeof Bell> = { trip_invite: Users, trip_activity: Briefcase, guide_saved: Heart, system: Bell };

const noSubscribe = () => () => {};

/** Trips whose post-trip rating was finished or dismissed in this browser (comma-joined ids). */
function readRatedTrips(): string {
  try {
    const ids: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i) ?? "";
      if (key.startsWith("xp-rated:")) ids.push(key.slice("xp-rated:".length));
    }
    return ids.sort().join(",");
  } catch {
    return "";
  }
}

export default function UpdatesPage() {
  const { updates, trips, markUpdatesRead } = useTravelStore();
  const rated = useSyncExternalStore(noSubscribe, readRatedTrips, () => "");
  const toRate = tripsToRate(trips, new Set(rated.split(",").filter(Boolean)));
  useEffect(() => {
    if (updates.some((u) => !u.read)) markUpdatesRead();
  }, [updates, markUpdatesRead]);
  return (
    <PageFrame title="Updates" description="Trip invites, what your travel companions added, who saved your guides, and trips to rate.">
      {toRate.length ? (
        <ul className="mb-4 grid gap-2">
          {toRate.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3" data-testid="post-trip-update">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">How was {t.destination}?</div>
                <div className="text-[12px] text-neutral-700">Rate the places from {t.title} so XPMatch learns your taste.</div>
              </div>
              <Link href={`/trips/${t.id}?rate=1`} className="inline-flex h-8 items-center rounded-full bg-neutral-900 px-3 text-[13px] font-semibold text-white hover:bg-neutral-800">
                Rate places
              </Link>
              <button
                type="button"
                onClick={() => {
                  try {
                    window.localStorage.setItem(ratedKey(t.id), "dismissed");
                  } catch {
                    // ignore
                  }
                  // A storage write does not notify React; a reload is the honest refresh.
                  window.location.reload();
                }}
                className="text-[12px] text-neutral-600 underline-offset-2 hover:underline"
              >
                Not now
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {updates.length === 0 && toRate.length === 0 ? (
        <EmptyState title="You're all caught up" body="You'll hear here when someone adds you to a trip, adds to a shared trip, saves one of your guides, or when a trip is over and ready to rate." />
      ) : updates.length ? (
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {updates.map((u) => {
            const Icon = ICON[u.kind] ?? Bell;
            const tripId = typeof u.data?.tripId === "string" ? u.data.tripId : null;
            const guideId = typeof u.data?.guideId === "string" ? u.data.guideId : null;
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
                {guideId ? (
                  <Link href={`/guides/${guideId}`} className="inline-flex h-8 items-center rounded-full border border-border px-3 text-[13px] font-medium hover:bg-surface">
                    Open guide
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </PageFrame>
  );
}
