"use client";

import { useState } from "react";
import clsx from "clsx";
import { OctagonAlert, TriangleAlert } from "lucide-react";

/**
 * Small charts for the admin page, in plain HTML: daily columns (stacked when there are two
 * series), an allowance meter and funnel bars. Colors are the validated two-series palette
 * (blue, orange) and the fixed status colors; text always stays in the ink colors.
 */

export const SERIES = { blue: "#2a78d6", orange: "#eb6834" } as const;
const STATUS = { warning: "#fab219", critical: "#d03b3b" } as const;
/** Unfilled meter tracks: a light step of the fill's own hue. */
const TRACK = { ok: "#cde2fb", warning: "#fdecc4", critical: "#f5d6d6" } as const;

/** Dollars for tiles: cents, or "<$0.01" for a sliver. */
export function usd(n: number): string {
  if (n > 0 && n < 0.01) return "<$0.01";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Dollars for axes, tooltips and tables, where fractions of a cent matter. */
export function usdFine(n: number): string {
  if (n === 0) return "$0";
  if (n >= 1) return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${parseFloat(n.toFixed(n < 0.01 ? 4 : 3))}`;
}

/** Counts: 1,284, then 12.9K past ten thousand. */
export function compact(n: number): string {
  return n >= 10_000 ? n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 }) : n.toLocaleString("en-US");
}

export const dayLabel = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** The smallest 1, 2, 2.5 or 5 times a power of ten at or above `n`: the top of the value axis. */
export function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(n));
  const f = n / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
}

export interface ColumnSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

const PLOT_HEIGHT = 128;

/**
 * One column per day, series stacked bottom-up with a 2px gap, rounded on top. Hovering a day
 * shows every series and the total; the same numbers are in the table under it.
 */
export function ColumnChart({ title, days, series, format, testId, empty }: { title: string; days: string[]; series: ColumnSeries[]; format: (n: number) => string; testId?: string; empty: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = days.map((_, i) => series.reduce((s, x) => s + (x.values[i] ?? 0), 0));
  const max = Math.max(0, ...totals);
  const top = niceCeil(max);
  const n = days.length;

  return (
    <figure className="rounded-2xl border border-border bg-white p-4" data-testid={testId}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold">{title}</span>
        {series.length > 1 ? (
          <span className="flex flex-wrap gap-3 text-[12px] text-neutral-700">
            {series.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-2.5 w-2.5 rounded-[2px]" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </span>
        ) : null}
      </figcaption>
      {max <= 0 ? (
        <p className="mt-3 text-[13px] text-muted">{empty}</p>
      ) : (
        <>
          <div className="relative mt-4" style={{ height: PLOT_HEIGHT }} aria-hidden>
            <div className="absolute inset-x-0 top-0 border-t border-dashed border-neutral-200" />
            <span className="absolute -top-2.5 right-0 bg-white pl-1 text-[11px] tabular-nums text-muted">{format(top)}</span>
            <div className="absolute inset-0 flex items-end">
              {days.map((day, i) => {
                const drawn = series.filter((s) => (s.values[i] ?? 0) > 0);
                return (
                  <div key={day} className={clsx("flex h-full flex-1 items-end justify-center", hover === i && "bg-neutral-100")} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover((h) => (h === i ? null : h))}>
                    <div className="mx-px flex w-full max-w-[24px] flex-col-reverse gap-[2px]">
                      {drawn.map((s, k) => (
                        <div key={s.key} className={clsx(k === drawn.length - 1 && "rounded-t-[4px]")} style={{ background: s.color, height: Math.max(1, ((s.values[i] ?? 0) / top) * PLOT_HEIGHT) }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="absolute inset-x-0 bottom-0 border-t border-neutral-300" />
            {hover !== null ? (
              // Beside the hovered day, never over it: to its right in the first half, to its left in the second.
              <div
                className="pointer-events-none absolute top-0 z-10 min-w-[150px] rounded-xl border border-border bg-white px-3 py-2 text-[12px] shadow-[var(--xp-shadow-floating)]"
                style={hover < n / 2 ? { left: `calc(${((hover + 1) / n) * 100}% + 6px)` } : { right: `calc(${((n - hover) / n) * 100}% + 6px)` }}
              >
                <div className="text-muted">{dayLabel(days[hover])}</div>
                {series.map((s) => (
                  <div key={s.key} className="mt-0.5 flex items-center gap-2">
                    <span aria-hidden className="h-0.5 w-3 rounded" style={{ background: s.color }} />
                    <span className="font-semibold tabular-nums">{format(s.values[hover] ?? 0)}</span>
                    <span className="text-muted">{s.label}</span>
                  </div>
                ))}
                {series.length > 1 ? (
                  <div className="mt-1 border-t border-border pt-1">
                    <span className="font-semibold tabular-nums">{format(totals[hover])}</span> <span className="text-muted">total</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted" aria-hidden>
            <span>{dayLabel(days[0])}</span>
            <span>{dayLabel(days[Math.floor((n - 1) / 2)])}</span>
            <span>{dayLabel(days[n - 1])}</span>
          </div>
        </>
      )}
      <details className="mt-2 text-[12px]">
        <summary className="cursor-pointer text-muted">Show as a table</summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-left">
            <thead className="text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium">Day (UTC)</th>
                {series.map((s) => (
                  <th key={s.key} className="py-1 pr-3 text-right font-medium">
                    {s.label}
                  </th>
                ))}
                {series.length > 1 ? <th className="py-1 text-right font-medium">Total</th> : null}
              </tr>
            </thead>
            <tbody>
              {days.map((day, i) => (
                <tr key={day} className="border-t border-border">
                  <td className="py-1 pr-3">{day}</td>
                  {series.map((s) => (
                    <td key={s.key} className="py-1 pr-3 text-right tabular-nums">
                      {format(s.values[i] ?? 0)}
                    </td>
                  ))}
                  {series.length > 1 ? <td className="py-1 text-right tabular-nums">{format(totals[i])}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/**
 * Calls against a monthly free allowance. The fill turns to the warning color from 80% and the
 * critical color past 100%, always with an icon and words, never color alone.
 */
export function AllowanceMeter({ used, free, label }: { used: number; free: number | null; label: string }) {
  if (free === null) return <span className="text-[12px] text-muted">No charge</span>;
  const ratio = free > 0 ? used / free : 1;
  const level = ratio > 1 ? "critical" : ratio >= 0.8 ? "warning" : "ok";
  const fill = level === "critical" ? STATUS.critical : level === "warning" ? STATUS.warning : SERIES.blue;
  return (
    <div className="min-w-[140px]">
      <div
        role="meter"
        aria-label={`${label}: ${used.toLocaleString("en-US")} of ${free.toLocaleString("en-US")} free calls`}
        aria-valuemin={0}
        aria-valuemax={free}
        aria-valuenow={Math.min(used, free)}
        className="h-2 overflow-hidden rounded-full"
        style={{ background: TRACK[level] }}
      >
        <div className="h-2 rounded-full" style={{ width: `${Math.min(100, ratio * 100)}%`, background: fill }} />
      </div>
      <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
        {level === "critical" ? (
          <>
            <OctagonAlert className="h-3 w-3 text-[#b42323]" aria-hidden /> Past the {compact(free)} free, billed
          </>
        ) : level === "warning" ? (
          <>
            <TriangleAlert className="h-3 w-3 text-[#9a6700]" aria-hidden /> Near the {compact(free)} free
          </>
        ) : (
          <span className="tabular-nums">
            {ratio < 0.01 && used > 0 ? "<1" : Math.round(ratio * 100)}% of {compact(free)} free
          </span>
        )}
      </div>
    </div>
  );
}

/** Steps from the first (100%) down, as bars on one baseline with the count and share of the first step. */
export function FunnelBars({ steps, testId }: { steps: { label: string; value: number }[]; testId?: string }) {
  const base = steps[0]?.value ?? 0;
  return (
    <ol className="grid gap-2" data-testid={testId}>
      {steps.map((s) => {
        const pct = base > 0 ? Math.round((s.value / base) * 100) : 0;
        return (
          <li key={s.label} className="grid grid-cols-[minmax(7rem,11rem)_1fr_auto] items-center gap-3 text-[13px]">
            <span className="text-neutral-700">{s.label}</span>
            <div className="border-l border-neutral-300">
              <div className="h-3 rounded-r-[4px]" style={{ width: `${Math.max(pct, s.value > 0 ? 1 : 0)}%`, background: SERIES.blue }} />
            </div>
            <span className="whitespace-nowrap tabular-nums">
              {s.value.toLocaleString("en-US")} <span className="text-muted">({pct}%)</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
