"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Trip } from "@/lib/types";

const COLORS = ["bg-teal-200 text-teal-900", "bg-amber-200 text-amber-900", "bg-rose-200 text-rose-900", "bg-sky-200 text-sky-900", "bg-violet-200 text-violet-900"];

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Month grid with trip date ranges highlighted. */
export function TripCalendar({ trips, initialDate }: { trips: Trip[]; initialDate?: string }) {
  const [cursor, setCursor] = useState(() => {
    if (initialDate) {
      const d = new Date(`${initialDate}T00:00:00Z`);
      if (!Number.isNaN(d.getTime())) return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    }
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  });

  const { cells, monthLabel } = useMemo(() => {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const first = new Date(Date.UTC(year, month, 1));
    const startOffset = first.getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const list: { date: Date | null; key: string }[] = [];
    for (let i = 0; i < startOffset; i++) list.push({ date: null, key: `pad-${i}` });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(year, month, d));
      list.push({ date, key: dayKey(date) });
    }
    while (list.length % 7 !== 0) list.push({ date: null, key: `tail-${list.length}` });
    return { cells: list, monthLabel: first.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }) };
  }, [cursor]);

  const dated = trips.filter((t) => t.startDate);
  const tripsOn = (key: string) =>
    dated.filter((t) => {
      const start = t.startDate as string;
      const end = t.endDate ?? start;
      return key >= start && key <= end;
    });

  return (
    <div className="rounded-3xl border border-border bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold tracking-tight">{monthLabel}</h2>
        <div className="flex gap-1">
          <button type="button" aria-label="Previous month" onClick={() => setCursor(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - 1, 1)))} className="rounded-full p-2 hover:bg-surface">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Next month" onClick={() => setCursor(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1)))} className="rounded-full p-2 hover:bg-surface">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[12px] font-medium text-muted">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const dayTrips = cell.date ? tripsOn(cell.key) : [];
          return (
            <div key={cell.key} className={`min-h-[84px] rounded-xl border border-border/60 p-1.5 ${cell.date ? "bg-white" : "bg-surface/40"}`}>
              {cell.date ? <div className="text-[12px] font-medium text-neutral-600">{cell.date.getUTCDate()}</div> : null}
              <div className="mt-1 grid gap-1">
                {dayTrips.slice(0, 3).map((t) => {
                  const color = COLORS[dated.indexOf(t) % COLORS.length];
                  const isStart = t.startDate === cell.key;
                  return (
                    <Link key={t.id} href={`/trips/${t.id}`} title={t.title} className={`block truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium ${color}`}>
                      {isStart || cell.date?.getUTCDay() === 0 ? t.title : " "}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {dated.length === 0 ? <p className="mt-4 text-center text-[13px] text-muted">Trips with dates will show up on the calendar.</p> : null}
    </div>
  );
}
