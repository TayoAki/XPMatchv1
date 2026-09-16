"use client";

import { useEffect, useState } from "react";
import { Camera, ExternalLink, Link2, Sparkles, Trash2 } from "lucide-react";
import type { ImportRecord } from "@/lib/import/types";
import { api } from "@/lib/api";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { EmptyState } from "@/components/PageFrame";
import { Button } from "@/components/ui/Button";
import { importPrompt } from "./ImportedPlacesCards";

/** Saved › Imports: everything the traveler imported, newest first, with a way back into the chat. */
export function ImportHistory({ onImport }: { onImport?: () => void }) {
  const send = useSendMessage();
  const [state, setState] = useState<{ imports: ImportRecord[]; error: string | null } | null>(null);

  useEffect(() => {
    let active = true;
    api<{ imports: ImportRecord[] }>("/api/import")
      .then((res) => active && setState({ imports: res.imports, error: null }))
      .catch((err: unknown) => active && setState({ imports: [], error: err instanceof Error ? err.message : "Could not load your imports" }));
    return () => {
      active = false;
    };
  }, []);

  const remove = (id: string) => {
    setState((s) => (s ? { ...s, imports: s.imports.filter((i) => i.id !== id) } : s));
    api(`/api/import/${encodeURIComponent(id)}`, { method: "DELETE" }).catch((err) => console.error("XPMatch: removing an import failed", err));
  };

  if (!state) return <div className="xp-skeleton mt-6 h-32 rounded-3xl" aria-busy="true" />;
  if (state.error) return <p className="mt-6 text-[14px] text-red-600">{state.error}</p>;
  if (state.imports.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          title="Nothing imported yet"
          body="Paste a link in chat, or use Import inspiration from the composer's + menu or the Create page, and the places it names land here."
          action={
            onImport ? (
              <Button onClick={onImport}>
                <Sparkles className="h-4 w-4" /> Import a link or screenshot
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }
  return (
    <ul className="mt-6 grid gap-3" data-testid="import-history">
      {state.imports.map((rec) => {
        const Icon = rec.site === "screenshot" ? Camera : Link2;
        const names = rec.places.map((p) => p.place.name);
        return (
          <li key={rec.id} className="flex gap-3 rounded-2xl border border-border p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[15px] font-semibold">{rec.sourceTitle || rec.site}</span>
                <span className="text-[12px] text-muted">
                  {rec.site === "screenshot" ? "screenshot" : rec.site} · {new Date(rec.createdAt).toLocaleDateString()} · {rec.places.length} place{rec.places.length === 1 ? "" : "s"}
                  {rec.unverified.length ? ` · ${rec.unverified.length} unverified` : ""}
                  {rec.destination ? ` · ${rec.destination}` : ""}
                </span>
              </div>
              <p className="mt-1 truncate text-[13px] text-neutral-700">{names.slice(0, 6).join(" · ")}{names.length > 6 ? ` · +${names.length - 6} more` : ""}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => send(importPrompt(rec))}>
                  <Sparkles className="h-4 w-4" /> Open in chat
                </Button>
                {rec.sourceUrl ? (
                  <a href={rec.sourceUrl} target="_blank" rel="noreferrer noopener" className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-[13px] font-medium hover:bg-surface">
                    Source <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            </div>
            <button type="button" onClick={() => remove(rec.id)} aria-label={`Remove import ${rec.sourceTitle || rec.site}`} className="h-9 w-9 shrink-0 rounded-full p-2 text-neutral-500 hover:bg-surface hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
