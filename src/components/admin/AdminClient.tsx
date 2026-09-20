"use client";

import { useEffect, useState, type FormEvent } from "react";
import clsx from "clsx";
import { Bug, Database, Sparkles, ThumbsDown, ThumbsUp, Users } from "lucide-react";
import { api } from "@/lib/api";
import { QUIZ_FIELD_LABELS, type AdminUser, type BetaStats, type CatalogStats, type QuizAnswers, type QuizStatus } from "@/lib/admin/types";
import { BUG_SEVERITIES, type BugReport, type BugStatus } from "@/lib/bugs/types";
import type { RecQuality } from "@/lib/recs/types";
import { useTravelStore } from "@/lib/store";
import { PageFrame, EmptyState } from "@/components/PageFrame";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";

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

function Stat({ label, value, note, testId }: { label: string; value: number; note?: string; testId?: string }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-1 text-[28px] font-semibold tabular-nums" data-testid={testId}>
        {value}
      </div>
      {note ? <div className="text-[12px] text-muted">{note}</div> : null}
    </div>
  );
}

const QUIZ_BADGE: Record<QuizStatus, { label: string; className: string }> = {
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700" },
  skipped: { label: "Skipped", className: "bg-amber-50 text-amber-800" },
  "not-started": { label: "Not started", className: "bg-surface text-neutral-600" },
};

function whenLabel(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

type ResetState = "busy" | { url: string; expiresAt: string } | { error: string };

/** "Reset link" for one member: the admin creates a single-use link and sends it by hand. */
function ResetCell({ user, state, copied, onIssue, onCopy }: { user: AdminUser; state: ResetState | undefined; copied: boolean; onIssue: () => void; onCopy: (url: string) => void }) {
  if (state === "busy") return <span className="text-[12px] text-muted">Creating…</span>;
  if (state && "error" in state) {
    return (
      <div className="grid gap-1">
        <span className="text-[12px] text-red-600">{state.error}</span>
        <Button size="sm" variant="outline" onClick={onIssue} aria-label={`Reset link for ${user.email}`}>
          Try again
        </Button>
      </div>
    );
  }
  if (state) {
    return (
      <div className="grid max-w-[320px] gap-1">
        <code className="break-all rounded-lg bg-surface px-2 py-1 text-[11px]" data-testid="reset-link">
          {state.url}
        </code>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
          <Button size="sm" variant="outline" onClick={() => onCopy(state.url)} aria-label={`Copy reset link for ${user.email}`}>
            {copied ? "Copied" : "Copy"}
          </Button>
          <span>Works once · expires {new Date(state.expiresAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
          <button type="button" onClick={onIssue} className="underline-offset-2 hover:underline">
            New link
          </button>
        </div>
      </div>
    );
  }
  return (
    <Button size="sm" variant="outline" onClick={onIssue} aria-label={`Reset link for ${user.email}`}>
      Reset link
    </Button>
  );
}

function Members({ users }: { users: AdminUser[] | null }) {
  const completed = users?.filter((u) => u.quiz === "completed").length ?? 0;
  const [resets, setResets] = useState<Record<string, ResetState>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const issue = async (u: AdminUser) => {
    setResets((m) => ({ ...m, [u.id]: "busy" }));
    setCopiedId(null);
    try {
      const res = await api<{ url: string; expiresAt: string }>(`/api/admin/users/${encodeURIComponent(u.id)}/reset`, { method: "POST" });
      setResets((m) => ({ ...m, [u.id]: { url: res.url, expiresAt: res.expiresAt } }));
    } catch (err) {
      setResets((m) => ({ ...m, [u.id]: { error: err instanceof Error ? err.message : "Could not create the link" } }));
    }
  };

  const copy = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
    } catch {
      // No clipboard access (http, permissions): the link text is selectable.
    }
  };

  return (
    <section className="mt-8" data-testid="members">
      <h2 className="flex items-center gap-2 text-[19px] font-semibold tracking-tight">
        <Users className="h-5 w-5" /> Members
        {users ? <span className="text-[13px] font-normal text-muted">· {users.length} signed up · {completed} finished the quiz</span> : null}
      </h2>
      {!users ? (
        <p className="mt-2 text-[13px] text-muted">Loading…</p>
      ) : users.length === 0 ? (
        <p className="mt-2 text-[13px] text-muted">No sign-ups yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead className="bg-surface text-[12px] text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Traveler</th>
                <th className="px-3 py-2 font-medium">Signed up</th>
                <th className="px-3 py-2 font-medium">Quiz</th>
                <th className="px-3 py-2 font-medium">Home city</th>
                <th className="px-3 py-2 text-right font-medium">Trips</th>
                <th className="px-3 py-2 text-right font-medium">Chats</th>
                <th className="px-3 py-2 text-right font-medium">Saved</th>
                <th className="px-3 py-2 font-medium">Last active</th>
                <th className="px-3 py-2 font-medium">Access</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const badge = QUIZ_BADGE[u.quiz];
                return (
                  <tr key={u.id} className="border-t border-border align-top" data-testid="member-row">
                    <td className="px-3 py-2">
                      <div className="font-medium">{u.name || u.handle}</div>
                      <div className="text-[12px] text-muted">{u.email}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-700">{whenLabel(u.signedUpAt)}</td>
                    <td className="px-3 py-2">
                      <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-semibold", badge.className)}>{badge.label}</span>
                    </td>
                    <td className="px-3 py-2 text-neutral-700">{u.homeCity || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{u.trips}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{u.chats}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{u.saved}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-700">{whenLabel(u.lastActiveAt)}</td>
                    <td className="px-3 py-2">
                      <ResetCell user={u} state={resets[u.id]} copied={copiedId === u.id} onIssue={() => void issue(u)} onCopy={(url) => void copy(u.id, url)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

interface SeedResponse {
  destination: { id: string; name: string; locality: string | null };
  queries: number;
  places: number;
  byKind: { hotel: number; restaurant: number; attraction: number };
}

/** The place catalog: what is stored, how often lookups came from it, and a way to fill a city ahead of testers. */
function Catalog({ catalog, onChanged }: { catalog: CatalogStats | null; onChanged: () => void }) {
  const [destination, setDestination] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const seed = async (e: FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await api<SeedResponse>("/api/admin/seed", { method: "POST", json: { destination: destination.trim() } });
      setResult(
        `${res.destination.name}: ${res.places} places from ${res.queries} searches (${res.byKind.hotel} stays, ${res.byKind.restaurant} restaurants, ${res.byKind.attraction} things to do).`,
      );
      setDestination("");
      onChanged();
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Seeding failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8" data-testid="place-catalog">
      <h2 className="flex items-center gap-2 text-[19px] font-semibold tracking-tight">
        <Database className="h-5 w-5" /> Place catalog
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        Every place Google has returned to us, stored once and served to everyone. Seeding a city runs 19 list searches so the first
        traveler there already finds it in our database.
      </p>
      {catalog ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Stat label="Places" value={catalog.places} testId="stat-places" note={`${catalog.destinations} destinations`} />
          <Stat label="Remembered lookups" value={catalog.aliases} note="queries that resolve without Google" />
          <Stat label="Served from the catalog" value={catalog.aliasHits} note="lookups answered by a remembered query" />
        </div>
      ) : (
        <p className="mt-2 text-[13px] text-muted">Loading…</p>
      )}
      <form onSubmit={seed} className="mt-3 flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs">
          <TextInput value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Lisbon, Portugal" aria-label="City to seed" maxLength={120} />
        </div>
        <Button type="submit" size="sm" disabled={busy || !destination.trim()} data-testid="seed-city">
          {busy ? "Seeding…" : "Seed city"}
        </Button>
      </form>
      {result ? (
        <p className="mt-2 text-[13px] text-neutral-700" data-testid="seed-result">
          {result}
        </p>
      ) : null}
    </section>
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
  const [stats, setStats] = useState<BetaStats | null>(null);
  const [quiz, setQuiz] = useState<QuizAnswers | null>(null);
  const [catalog, setCatalog] = useState<CatalogStats | null>(null);
  const [statsVersion, setStatsVersion] = useState(0);
  const [members, setMembers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const admin = !!user?.admin;

  useEffect(() => {
    if (!hydrated || !admin) return;
    let active = true;
    api<{ stats: BetaStats; quiz: QuizAnswers; catalog: CatalogStats }>("/api/admin/stats")
      .then((data) => {
        if (!active) return;
        setStats(data.stats);
        setQuiz(data.quiz);
        setCatalog(data.catalog);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [hydrated, admin, statsVersion]);

  useEffect(() => {
    if (!hydrated || !admin) return;
    let active = true;
    api<{ users: AdminUser[] }>("/api/admin/users")
      .then((data) => active && setMembers(data.users))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [hydrated, admin]);

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
        <EmptyState title="Admins only" body="Add your email to ADMIN_EMAILS on the server to see sign-ups, bug reports and recommendation quality." />
      </PageFrame>
    );
  }

  return (
    <PageFrame title="Admin" description={`Sign-ups, bug reports from testers and recommendation quality.${version ? ` Build ${version}.` : ""}`}>
      <section data-testid="beta-stats">
        <h2 className="flex items-center gap-2 text-[19px] font-semibold tracking-tight">
          <Users className="h-5 w-5" /> Beta numbers
        </h2>
        {!stats ? (
          <p className="mt-2 text-[13px] text-muted">Loading…</p>
        ) : (
          <>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Users" value={stats.users} testId="stat-users" note={`+${stats.usersLast7Days} in the last 7 days`} />
              <Stat label="Trips" value={stats.trips} />
              <Stat label="Chats" value={stats.chats} />
              <Stat label="Saved places" value={stats.savedItems} />
              <Stat label="Guides" value={stats.guides} />
              <Stat label="Open bugs" value={stats.bugReportsOpen} />
            </div>
            <p className="mt-2 text-[12px] text-muted">
              {stats.lastSignupAt ? `Last sign-up ${new Date(stats.lastSignupAt).toLocaleString()}.` : "No sign-ups yet."}
              {stats.signupsByDay.length ? ` Sign-ups by day (UTC): ${stats.signupsByDay.map((d) => `${d.day} ×${d.count}`).join(", ")}.` : ""}
            </p>
          </>
        )}
      </section>

      <Members users={members} />

      <Catalog catalog={catalog} onChanged={() => setStatsVersion((v) => v + 1)} />

      <section className="mt-8" data-testid="quiz-answers">
        <h2 className="text-[19px] font-semibold tracking-tight">What people answered</h2>
        <p className="mt-1 text-[13px] text-muted">Every onboarded profile, counted per answer. Empty fields are left out.</p>
        {!quiz ? (
          <p className="mt-2 text-[13px] text-muted">Loading…</p>
        ) : QUIZ_FIELD_LABELS.every((f) => !quiz[f.key]?.length) ? (
          <p className="mt-2 text-[13px] text-muted">No quiz answers yet.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUIZ_FIELD_LABELS.filter((f) => quiz[f.key]?.length).map((f) => (
              <div key={f.key} className="rounded-2xl border border-border p-4 text-[13px]" data-testid={`quiz-${f.key}`}>
                <div className="text-[12px] text-muted">{f.label}</div>
                <ul className="mt-1 grid gap-0.5">
                  {quiz[f.key].slice(0, 6).map((a) => (
                    <li key={a.label} className="flex justify-between gap-2">
                      <span className="truncate capitalize">{a.label}</span>
                      <span className="tabular-nums text-muted">×{a.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8" data-testid="rec-quality">
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
