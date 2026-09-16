"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { ArrowRight, Luggage } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { GuideDetail } from "@/lib/types";
import { useTravelStore, type BudgetTier, type TripPlanner } from "@/lib/store";
import { PageFrame } from "@/components/PageFrame";
import { Button } from "@/components/ui/Button";
import { Chip, Field, TextInput } from "@/components/ui/Field";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { buildPlanPrompt } from "@/components/profile/TripPlannerDialog";
import { GuideEditor } from "./GuideEditor";
import { ImportForm } from "@/components/import/ImportDialog";

type Tab = "guide" | "trip" | "import";
const TAB_LABEL: Record<Tab, string> = { guide: "Guide", trip: "Trip", import: "Import" };
const BUDGETS: BudgetTier[] = ["budget", "mid-range", "premium", "luxury"];

function TripCreateForm() {
  const { planner, updatePlanner, addTrip } = useTravelStore();
  const send = useSendMessage();
  const router = useRouter();
  const [draft, setDraft] = useState<TripPlanner>(planner);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof TripPlanner>(key: K, value: TripPlanner[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const where = draft.where.trim();

  const createTrip = async () => {
    if (!where) return;
    setBusy(true);
    setError(null);
    try {
      updatePlanner(draft);
      const trip = await addTrip({
        title: `Trip to ${where}`,
        destination: where,
        startDate: draft.startDate || undefined,
        endDate: draft.endDate || undefined,
        travelers: draft.travelers,
        budgetTier: draft.budgetTier || undefined,
      });
      router.push(`/trips/${trip.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the trip");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="max-w-xl rounded-3xl border border-border bg-white p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!where) return;
        updatePlanner(draft);
        void send(buildPlanPrompt(draft));
      }}
    >
      <div className="grid gap-4">
        <Field label="Where to?">
          <TextInput value={draft.where} onChange={(e) => set("where", e.target.value)} placeholder="Dallas, Lisbon, somewhere warm…" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="From">
            <TextInput type="date" value={draft.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </Field>
          <Field label="To">
            <TextInput type="date" value={draft.endDate} min={draft.startDate || undefined} onChange={(e) => set("endDate", e.target.value)} />
          </Field>
        </div>
        <Field label="Travelers">
          <TextInput type="number" min={1} max={16} value={draft.travelers} onChange={(e) => set("travelers", Math.max(1, Number(e.target.value) || 1))} className="w-28" />
        </Field>
        <div>
          <div className="mb-1.5 text-[13px] font-medium">Budget</div>
          <div className="flex flex-wrap gap-2">
            {BUDGETS.map((b) => (
              <Chip key={b} active={draft.budgetTier === b} onClick={() => set("budgetTier", draft.budgetTier === b ? "" : b)}>
                {b}
              </Chip>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto text-[13px] text-red-600">{error}</span>
        <Button type="button" variant="outline" onClick={createTrip} disabled={!where || busy}>
          <Luggage className="h-4 w-4" /> {busy ? "Creating…" : "Create trip"}
        </Button>
        <Button type="submit" disabled={!where || busy}>
          Start planning <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

/** Create page: a community guide editor (default) or the quick trip form. `guideId` opens an existing guide for editing. */
export function CreateClient({ guideId }: { guideId?: string }) {
  const router = useRouter();
  const { user } = useTravelStore();
  const [tab, setTab] = useState<Tab>("guide");
  const [loaded, setLoaded] = useState<{ id: string; guide: GuideDetail | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!guideId) return;
    let active = true;
    const id = guideId;
    api<GuideDetail>(`/api/guides/${encodeURIComponent(id)}`)
      .then((guide) => active && setLoaded({ id, guide, error: null }))
      .catch((err: unknown) => active && setLoaded({ id, guide: null, error: err instanceof ApiError && err.status === 404 ? "This guide doesn't exist." : "Could not load this guide." }));
    return () => {
      active = false;
    };
  }, [guideId]);

  const editing = guideId ? (loaded?.id === guideId ? loaded : null) : null;
  const notAuthor = editing?.guide && user && editing.guide.authorId !== user.id;

  return (
    <PageFrame
      title={guideId ? "Edit guide" : "Create"}
      description={guideId ? "Update your guide; changes are visible to the community right away." : "Share a guide with the community, set up a trip, or import inspiration from a link or screenshot."}
    >
      {!guideId ? (
        <div className="mb-6 flex gap-6 border-b border-border text-[16px]">
          {(["guide", "trip", "import"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={clsx("-mb-px border-b-2 pb-3 font-medium", tab === t ? "border-neutral-900 text-foreground" : "border-transparent text-neutral-500 hover:text-foreground")}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
      ) : null}

      {tab === "trip" && !guideId ? <TripCreateForm /> : null}

      {tab === "import" && !guideId ? (
        <div className="max-w-3xl">
          <p className="mb-4 text-[14px] text-neutral-700">Paste a blog post, Reddit thread, YouTube page or article, or upload a screenshot of a post or a saved list. The places it names come back verified, ready to save, add to a trip or keep as a collection.</p>
          <div className="rounded-3xl border border-border p-5">
            <ImportForm />
          </div>
        </div>
      ) : null}

      {tab === "guide" || guideId ? (
        guideId && !editing ? (
          <div className="xp-skeleton h-[200px] rounded-3xl" aria-busy="true" />
        ) : editing?.error || notAuthor ? (
          <div className="rounded-3xl border border-dashed border-border px-6 py-14 text-center">
            <div className="text-[17px] font-semibold">{notAuthor ? "Only the author can edit this guide" : "Guide not found"}</div>
            <p className="mt-1 text-[14px] text-muted">{editing?.error ?? "You can save it or plan a trip from it instead."}</p>
            <Link href={guideId ? `/guides/${guideId}` : "/inspiration"} className="mt-4 inline-flex h-10 items-center rounded-full bg-foreground px-4 text-sm font-medium text-white hover:bg-neutral-800">
              {notAuthor ? "View the guide" : "Browse guides"}
            </Link>
          </div>
        ) : (
          <div className="max-w-3xl">
            <GuideEditor key={editing?.guide?.id ?? "new"} initial={editing?.guide ?? undefined} onSaved={(g) => router.push(`/guides/${g.id}`)} />
          </div>
        )
      ) : null}
    </PageFrame>
  );
}
