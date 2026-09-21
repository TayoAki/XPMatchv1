"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { PageFrame, EmptyState } from "@/components/PageFrame";
import { Button } from "@/components/ui/Button";
import { TripCard } from "@/components/trips/TripCard";
import { TripCalendar } from "@/components/trips/TripCalendar";
import { useTravelStore } from "@/lib/store";
import { useUiState } from "@/components/providers/UiState";

type Tab = "trips" | "calendar";
type Filter = "all" | "upcoming" | "past";

export default function TripsPage() {
  const { trips, hydrated } = useTravelStore();
  const { openPlanner } = useUiState();
  const [tab, setTab] = useState<Tab>("trips");
  const [filter, setFilter] = useState<Filter>("all");

  const today = new Date().toISOString().slice(0, 10);
  const { upcoming, past } = useMemo(() => {
    const upcoming = trips.filter((t) => !t.endDate || t.endDate >= today);
    const past = trips.filter((t) => t.endDate && t.endDate < today);
    return { upcoming, past };
  }, [trips, today]);

  return (
    <PageFrame
      title="Your trips"
      actions={
        <Button onClick={() => openPlanner("where")}>
          <Plus className="h-4 w-4" /> New trip
        </Button>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
        <div className="flex gap-6 text-[16px]">
          {(["trips", "calendar"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={clsx("-mb-px border-b-2 pb-3 font-medium capitalize", tab === t ? "border-brand text-foreground" : "border-transparent text-neutral-500 hover:text-foreground")}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "trips" ? (
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="mb-2 rounded-full border border-border bg-white px-3 py-1.5 text-[13px] font-medium">
            <option value="all">All</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
        ) : null}
      </div>

      {tab === "calendar" ? (
        <div className="mt-6">
          <TripCalendar trips={trips} />
        </div>
      ) : !hydrated ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="xp-skeleton aspect-[16/11] rounded-3xl" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No trips yet"
            body="Create a trip from the planner, or ask the assistant to plan one and confirm the proposal."
            action={<Button onClick={() => openPlanner("where")}>Create a trip</Button>}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-10">
          {(filter !== "past" && upcoming.length) ? (
            <section>
              <h2 className="text-[18px] font-semibold tracking-tight">Upcoming</h2>
              <div className="mt-3 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {upcoming.map((t) => (
                  <TripCard key={t.id} trip={t} />
                ))}
              </div>
            </section>
          ) : null}
          {(filter !== "upcoming" && past.length) ? (
            <section>
              <h2 className="text-[18px] font-semibold tracking-tight">Past</h2>
              <div className="mt-3 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {past.map((t) => (
                  <TripCard key={t.id} trip={t} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </PageFrame>
  );
}
