"use client";

import { Activity, Receipt } from "lucide-react";
import type { ActivityReport, CostReport } from "@/lib/admin/types";
import { AllowanceMeter, ColumnChart, FunnelBars, SERIES, compact, dayLabel, usd, usdFine } from "./charts";
import { Stat } from "./Stat";

const BILLS = [
  { label: "Google Cloud", href: "https://console.cloud.google.com/google/maps-apis/metrics" },
  { label: "OpenRouter", href: "https://openrouter.ai/activity" },
  { label: "Railway", href: "https://railway.com/workspace/usage" },
  { label: "Resend", href: "https://resend.com/emails" },
];

/** Seconds of audio as "12 min" (or "40 s" under a minute). */
const minutes = (seconds: number) => (seconds >= 60 ? `${Math.round(seconds / 60)} min` : `${Math.round(seconds)} s`);

const share = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—");

function SavingsTile({ label, cached, bought, testId }: { label: string; cached: number; bought: number; testId?: string }) {
  return (
    <div className="rounded-2xl border border-border p-4 text-[13px]" data-testid={testId}>
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-1 text-[22px] font-semibold">{share(cached, cached + bought)}</div>
      <div className="text-[12px] text-muted">
        {compact(cached)} answered by us · {compact(bought)} from Google
      </div>
    </div>
  );
}

/** What the app costs: this month, the pace, each Google SKU against its free allowance, the model, and what the caches saved. */
export function CostsSection({ costs, activeTravelers }: { costs: CostReport | null; activeTravelers: number | null }) {
  const modelMonth = costs ? (costs.openrouter ? costs.openrouter.month : costs.modelCost) : 0;
  const lookups = costs?.savings.lookups;
  return (
    <section className="mt-8" data-testid="costs">
      <h2 className="flex items-center gap-2 text-[19px] font-semibold tracking-tight">
        <Receipt className="h-5 w-5" /> Costs
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        Estimated from every call the app pays for, at list price after each provider&apos;s free monthly allowance (UTC month).
        {costs?.since ? ` Metered since ${dayLabel(costs.since)}.` : " Nothing metered yet."} The bills themselves:{" "}
        {BILLS.map((b, i) => (
          <span key={b.label}>
            {i ? " · " : ""}
            <a href={b.href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
              {b.label}
            </a>
          </span>
        ))}
        .
      </p>
      {!costs ? (
        <p className="mt-2 text-[13px] text-muted">Loading…</p>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="This month so far"
              value={usd(costs.monthToDate)}
              testId="cost-month"
              note={`Google ${usd(costs.googleCost)} · AI ${usd(modelMonth)} · hosting ${usd(costs.hosting.monthly)}`}
            />
            <Stat
              label="Monthly pace"
              value={usd(costs.monthlyPace)}
              testId="cost-pace"
              note={
                costs.paceDays
                  ? `from ${costs.paceDays} day${costs.paceDays === 1 ? "" : "s"} of metering${activeTravelers ? ` · ${usd(costs.monthlyPace / activeTravelers)} per active traveler` : ""}`
                  : "hosting only until calls are metered"
              }
            />
            <Stat
              label="AI model, all time"
              value={usd(costs.openrouter ? costs.openrouter.total : costs.modelCost)}
              testId="cost-model"
              note={
                costs.openrouter
                  ? `OpenRouter's figure · ${usd(costs.openrouter.month)} this month · ${usd(costs.openrouter.week)} this week${costs.openrouter.limit === null ? " · no spending limit set" : ""}`
                  : "metered tokens; OpenRouter's own figure is unavailable"
              }
            />
            <Stat label="Google at list price" value={usd(costs.googleListCost)} testId="cost-google" note={`${usd(costs.googleCost)} after the free allowances this month`} />
          </div>

          <div className="mt-3">
            <ColumnChart
              title="Daily spend at list price, last 30 days"
              days={costs.daily.map((d) => d.day)}
              series={[
                { key: "google", label: "Google", color: SERIES.blue, values: costs.daily.map((d) => d.google) },
                { key: "model", label: "AI model", color: SERIES.orange, values: costs.daily.map((d) => d.model) },
              ]}
              format={usdFine}
              testId="cost-daily"
              empty="No metered calls in the last 30 days."
            />
          </div>

          <h3 className="mt-5 text-[15px] font-semibold">Google this month</h3>
          {costs.google.length === 0 ? (
            <p className="mt-1 text-[13px] text-muted">No Google calls metered this month.</p>
          ) : (
            <div className="mt-2 overflow-x-auto rounded-2xl border border-border">
              {/* On phones the allowance sits under the name and the list price is left out, so Cost stays in view. */}
              <table className="w-full text-left text-[13px] sm:min-w-[640px]" data-testid="cost-skus">
                <thead className="bg-surface text-[12px] text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">What</th>
                    <th className="px-3 py-2 text-right font-medium">Calls</th>
                    <th className="hidden px-3 py-2 font-medium sm:table-cell">Free allowance</th>
                    <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">List price</th>
                    <th className="px-3 py-2 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {costs.google.map((g) => (
                    <tr key={g.sku} className="border-t border-border align-top" data-testid="cost-sku">
                      <td className="px-3 py-2">
                        {g.label}
                        <div className="mt-1.5 sm:hidden">
                          <AllowanceMeter used={g.calls} free={g.freePerMonth} label={g.label} />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{g.calls.toLocaleString("en-US")}</td>
                      <td className="hidden px-3 py-2 sm:table-cell">
                        <AllowanceMeter used={g.calls} free={g.freePerMonth} label={g.label} />
                      </td>
                      <td className="hidden px-3 py-2 text-right tabular-nums text-neutral-700 sm:table-cell">{usdFine(g.listCost)}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{usdFine(g.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {costs.models.length ? (
            <>
              <h3 className="mt-5 text-[15px] font-semibold">AI model this month</h3>
              <div className="mt-2 overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-left text-[13px] sm:min-w-[560px]" data-testid="cost-models">
                  <thead className="bg-surface text-[12px] text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Model</th>
                      <th className="px-3 py-2 text-right font-medium">Calls</th>
                      <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Tokens in</th>
                      <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Tokens out</th>
                      <th className="px-3 py-2 text-right font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costs.models.map((m) => (
                      <tr key={m.model} className="border-t border-border">
                        <td className="break-all px-3 py-2">{m.model}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{m.calls.toLocaleString("en-US")}</td>
                        <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">{m.unit === "seconds" ? `${minutes(m.inputTokens)} listening` : compact(m.inputTokens)}</td>
                        <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">{m.unit === "seconds" ? `${minutes(m.outputTokens)} speaking` : compact(m.outputTokens)}</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">{usdFine(m.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          <h3 className="mt-5 text-[15px] font-semibold">Answered without paying Google this month</h3>
          <p className="mt-1 text-[13px] text-muted">
            From our catalog and caches instead of a new Google call; worth {usdFine(costs.savings.avoided)} at list price.
            {lookups && lookups.fallback ? ` ${compact(lookups.fallback)} lookups had no Google answer and used an estimate.` : ""}
          </p>
          {lookups ? (
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SavingsTile label="Place lookups" cached={lookups.memory + lookups.catalog + lookups.known} bought={lookups.bought} testId="saved-lookups" />
              <SavingsTile label="Photos" cached={costs.savings.photos.cached} bought={costs.savings.photos.bought} />
              <SavingsTile label="List searches" cached={costs.savings.lists.cached} bought={costs.savings.lists.bought} />
              <SavingsTile label="Place sheets" cached={costs.savings.sheets.cached} bought={costs.savings.sheets.bought} />
            </div>
          ) : null}

          <ul className="mt-4 grid gap-1 text-[13px] text-neutral-700">
            <li>
              <span className="font-medium">Hosting:</span> {costs.hosting.label}, {usd(costs.hosting.monthly)} a month (the plan includes that much usage).
            </li>
            <li>
              <span className="font-medium">Email:</span> {costs.emails.sent.toLocaleString("en-US")} sent this month of {costs.emails.freePerMonth.toLocaleString("en-US")} free.
            </li>
            <li>
              <span className="font-medium">Weather:</span> {costs.weatherCalls.toLocaleString("en-US")} Open-Meteo calls this month; its free API is for non-commercial use (docs/TERMS_RESEARCH.md).
            </li>
          </ul>
        </>
      )}
    </section>
  );
}

/** Who uses the app: active travelers, each day of the last 30, the path from sign-up to a trip, and how much the assistant answers. */
export function ActivitySection({ activity }: { activity: ActivityReport | null }) {
  return (
    <section className="mt-8" data-testid="activity">
      <h2 className="flex items-center gap-2 text-[19px] font-semibold tracking-tight">
        <Activity className="h-5 w-5" /> Activity
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        Travelers who used the app signed in, by UTC day.
        {activity?.recordedSince
          ? ` Every visit counts from ${dayLabel(activity.recordedSince)}; days before that come from sign-ups, sign-ins, chats, trips and saves, so they undercount.`
          : ""}
      </p>
      {!activity ? (
        <p className="mt-2 text-[13px] text-muted">Loading…</p>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Active today" value={activity.today} testId="active-today" />
            <Stat label="Active in 7 days" value={activity.last7Days} testId="active-7" />
            <Stat label="Active in 30 days" value={activity.last30Days} testId="active-30" />
            <Stat label="Came back" value={activity.returning30Days} testId="active-returning" note="active on 2 or more days of the last 30" />
          </div>

          <div className="mt-3">
            <ColumnChart
              title="Active travelers per day, last 30 days"
              days={activity.daily.map((d) => d.day)}
              series={[{ key: "active", label: "Active travelers", color: SERIES.blue, values: activity.daily.map((d) => d.active) }]}
              format={(n) => n.toLocaleString("en-US")}
              testId="activity-daily"
              empty="Nobody was active in the last 30 days."
            />
          </div>

          <h3 className="mt-5 text-[15px] font-semibold">From sign-up to a trip</h3>
          <div className="mt-2 rounded-2xl border border-border bg-white p-4">
            <FunnelBars
              testId="activity-funnel"
              steps={[
                { label: "Signed up", value: activity.funnel.signedUp },
                { label: "Finished the quiz", value: activity.funnel.finishedQuiz },
                { label: "Started a chat", value: activity.funnel.chatted },
                { label: "Made a trip", value: activity.funnel.madeTrip },
                { label: "Came back another day", value: activity.funnel.cameBack },
              ]}
            />
          </div>

          <p className="mt-3 text-[13px] text-neutral-700" data-testid="activity-answers">
            <span className="font-medium">Assistant answers:</span> {activity.answers.today.toLocaleString("en-US")} today · {activity.answers.last7Days.toLocaleString("en-US")} in 7 days ·{" "}
            {activity.answers.last30Days.toLocaleString("en-US")} in 30 days
            {activity.recordedSince ? ` (counted from ${dayLabel(activity.recordedSince)})` : ""}. <span className="font-medium">Messages travelers wrote:</span>{" "}
            {activity.messages.toLocaleString("en-US")} across saved chats.
          </p>
        </>
      )}
    </section>
  );
}
