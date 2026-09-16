"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Bug, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { api } from "@/lib/api";
import { BUG_SEVERITIES, type BugReport, type BugStatus } from "@/lib/bugs/types";
import type { RecQuality } from "@/lib/recs/types";
import { useTravelStore } from "@/lib/store";
import { PageFrame, EmptyState } from "@/components/PageFrame";
import { Button } from "@/components/ui/Button";

type Filter = BugStatus | "all";

function Screenshot({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-[12px] font-medium underline-offset-2 hover:underline">
        {open ? "Hide screenshot" : "Show screenshot"}
      </button>
      {open ? (
        // eslint-disable-next-line @next/next/no-img-element -- stored report screenshot
        <img src={`/api/bugs/${encodeURIComponent(id)}/screenshot`} alt="Screenshot from the report" className="mt-2 max-h-[420px] rounded-xl border border-border" />
      ) : null}
    </div>
  );
}

function Rate({ up, down }: { up: number; down: number }) {
  const total = up + down;
  return (
    <span className="tabular-nums">
      {total ? `${Math.round((up / total) * 100)}%` : "—"} <span className="text-muted">({up}↑ {down}↓)</span>
    </span>
  );
}

/** Admins only: bug reports from testers and how often the match score gets it right. */
export function AdminClient() {
  const { user, hydrated } = useTravelStore();
  const [filter, setFilter] = useState<Filter>("open");
  const [reports, setReports] = useState<BugReport[] | null>(null);
  const [version, setVersion] = useState("");
  const [quality, setQuality] = useState<(RecQuality & { travelers: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const admin = !!user?.admin;

  useEffect(() => {
    if (!hydrated || !admin) return;
    let active = true;
    api<{ reports: BugReport[]; version: string }>(`/api/bugs?status=${filter}`)
      .then((data) => {
        if (!active) return;
        setReports(data.reports);
        setVersion(data.version);
      })
      .catch((err: unknown) => active && setError(err instanceof Error ? err.message : "Could not load reports"));
    return () => {
      active = false;
    };
  }, [hydrated, admin, filter]);

  useEffect(() => {
    if (!hydrated || !admin) return;
    let active = true;
    api<{ quality: RecQuality & { travelers: number } }>("/api/admin/quality")
      .then((data) => active && setQuality(data.quality))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [hydrated, admin]);

  const setStatus = async (report: BugReport, status: BugStatus) => {
    try {
      const res = await api<{ report: BugReport }>(`/api/bugs/${encodeURIComponent(report.id)}`, { method: "PATCH", json: { status } });
      setReports((list) => (list ?? []).map((r) => (r.id === report.id ? res.report : r)).filter((r) => filter === "all" || r.status === filter));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the report");
    }
  };

  if (hydrated && !admin) {
    return (
      <PageFrame title="Admin">
        <EmptyState title="Admins only" body="Add your email to ADMIN_EMAILS on the server to see bug reports and recommendation quality." />
      </PageFrame>
    );
  }

  return (
    <PageFrame title="Admin" description={`Bug reports from testers and recommendation quality.${version ? ` Build ${version}.` : ""}`}>
      <section data-testid="rec-quality">
        <h2 className="flex items-center gap-2 text-[19px] font-semibold tracking-tight">
          <Sparkles className="h-5 w-5" /> Recommendation quality
        </h2>
        {!quality ? (
          <p className="mt-2 text-[13px] text-muted">Loading…</p>
        ) : quality.total === 0 ? (
          <p className="mt-2 text-[13px] text-muted">No thumbs yet. Every card, Explore result, home pick and board stop has thumbs up / down.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border p-4">
              <div className="text-[12px] text-muted">Hit rate</div>
              <div className="mt-1 text-[28px] font-semibold tabular-nums">{quality.hitRate}%</div>
              <div className="text-[12px] text-muted">
                {quality.total} judgment{quality.total === 1 ? "" : "s"} from {quality.travelers} traveler{quality.travelers === 1 ? "" : "s"} · <ThumbsUp className="inline h-3 w-3" /> {quality.up} · <ThumbsDown className="inline h-3 w-3" /> {quality.down}
              </div>
            </div>
            <div className="rounded-2xl border border-border p-4 text-[13px]">
              <div className="text-[12px] text-muted">By kind</div>
              <ul className="mt-1 grid gap-0.5">
                {Object.entries(quality.byKind).map(([kind, c]) => (
                  <li key={kind} className="flex justify-between capitalize">
                    <span>{kind}</span>
                    <Rate up={c.up} down={c.down} />
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-[12px] text-muted">By context</div>
              <ul className="mt-1 grid gap-0.5">
                {Object.entries(quality.byContext).map(([ctx, c]) => (
                  <li key={ctx} className="flex justify-between capitalize">
                    <span>{ctx}</span>
                    <Rate up={c.up} down={c.down} />
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border p-4 text-[13px]">
              <div className="text-[12px] text-muted">Why picks miss</div>
              {quality.reasons.length ? (
                <ul className="mt-1 grid gap-0.5">
                  {quality.reasons.slice(0, 5).map((r) => (
                    <li key={r.reason} className="flex justify-between">
                      <span>{r.reason}</span>
                      <span className="tabular-nums">×{r.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-muted">No reasons given yet.</p>
              )}
              {quality.recentMisses.length ? (
                <>
                  <div className="mt-2 text-[12px] text-muted">Recent misses</div>
                  <ul className="mt-1 grid gap-0.5">
                    {quality.recentMisses.slice(0, 5).map((m, i) => (
                      <li key={`${m.name}-${i}`} className="truncate">
                        {m.name} <span className="text-muted">({m.kind}{m.score !== undefined ? `, shown ${m.score}%` : ""}{m.reason ? `, ${m.reason.toLowerCase()}` : ""})</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <section className="mt-8" data-testid="bug-reports">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[19px] font-semibold tracking-tight">
            <Bug className="h-5 w-5" /> Bug reports
          </h2>
          <div role="group" aria-label="Report status" className="inline-flex rounded-full border border-border bg-white p-0.5">
            {(["open", "resolved", "all"] as Filter[]).map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={clsx("h-8 rounded-full px-3 text-[13px] font-semibold capitalize", filter === f ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-surface")}>
                {f}
              </button>
            ))}
          </div>
        </div>
        {error ? <p className="mt-2 text-[13px] text-red-600">{error}</p> : null}
        {reports === null ? (
          <p className="mt-2 text-[13px] text-muted">Loading…</p>
        ) : reports.length === 0 ? (
          <EmptyState title={filter === "open" ? "No open reports" : "No reports"} body="Testers report bugs with the bug icon next to their name in the sidebar." />
        ) : (
          <ul className="mt-3 grid gap-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border p-4" data-testid="bug-report">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-semibold", r.severity === "broken" ? "bg-rose-50 text-rose-700" : r.severity === "looks-wrong" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800")}>
                        {BUG_SEVERITIES.find((s) => s.value === r.severity)?.label ?? r.severity}
                      </span>
                      <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-semibold", r.status === "open" ? "bg-surface text-neutral-700" : "bg-emerald-50 text-emerald-700")}>{r.status}</span>
                      <span className="text-[12px] text-muted">{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="mt-1 text-[15px] font-semibold">{r.title}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setStatus(r, r.status === "open" ? "resolved" : "open")}>
                    {r.status === "open" ? "Mark resolved" : "Reopen"}
                  </Button>
                </div>
                {r.body && r.body !== r.title ? <p className="mt-2 whitespace-pre-wrap text-[13px] text-neutral-700">{r.body}</p> : null}
                {r.expected ? (
                  <p className="mt-1 text-[13px] text-neutral-700">
                    <span className="font-medium">Expected:</span> {r.expected}
                  </p>
                ) : null}
                <dl className="mt-2 grid gap-0.5 text-[12px] text-muted">
                  <div>
                    <dt className="inline font-medium text-neutral-700">From </dt>
                    <dd className="inline">{r.reporter ? `${r.reporter.name || r.reporter.email}${r.reporter.handle ? ` (@${r.reporter.handle})` : ""} · ${r.reporter.email}` : "unknown"}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-neutral-700">Page </dt>
                    <dd className="inline break-all">{r.page || "—"}</dd>
                  </div>
                  {r.threadId ? (
                    <div>
                      <dt className="inline font-medium text-neutral-700">Chat </dt>
                      <dd className="inline break-all">{r.threadId}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="inline font-medium text-neutral-700">Browser </dt>
                    <dd className="inline break-all">{r.userAgent || "—"}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-neutral-700">Build </dt>
                    <dd className="inline">{r.appVersion || "—"}</dd>
                  </div>
                </dl>
                {r.hasScreenshot ? (
                  <div className="mt-2">
                    <Screenshot id={r.id} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageFrame>
  );
}
