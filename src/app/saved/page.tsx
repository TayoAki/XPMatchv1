"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import { PageFrame, EmptyState } from "@/components/PageFrame";
import { Button } from "@/components/ui/Button";
import { useTravelStore, type SavedKind } from "@/lib/store";
import { useSendMessage } from "@/components/chat/useSendMessage";

const ORDER: SavedKind[] = ["destination", "hotel", "flight", "restaurant", "attraction"];
const LABEL: Record<SavedKind, string> = {
  destination: "Destinations",
  hotel: "Stays",
  flight: "Flights",
  restaurant: "Restaurants",
  attraction: "Things to do",
};

export default function SavedPage() {
  const { saved, removeSaved } = useTravelStore();
  const send = useSendMessage();
  return (
    <PageFrame
      title="Saved"
      description="Everything you hearted in chat, grouped by type."
      actions={saved.length ? <Button variant="outline" onClick={() => send("Look at my saved items and suggest how to turn them into a trip.")}>Turn saved items into a trip</Button> : null}
    >
      {saved.length === 0 ? (
        <EmptyState title="Nothing saved yet" body="Tap the heart on any recommendation card to keep it here." />
      ) : (
        <div className="grid gap-6">
          {ORDER.filter((k) => saved.some((s) => s.kind === k)).map((kind) => (
            <section key={kind}>
              <h2 className="text-[17px] font-semibold tracking-tight">{LABEL[kind]}</h2>
              <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
                {saved
                  .filter((s) => s.kind === kind)
                  .map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-medium">{s.title}</div>
                        {s.subtitle ? <div className="truncate text-[12px] text-muted">{s.subtitle}</div> : null}
                      </div>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-[13px] font-medium hover:bg-surface">
                          Open <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                      <button type="button" onClick={() => removeSaved(s.id)} aria-label={`Remove ${s.title}`} className="rounded-full p-2 text-neutral-500 hover:bg-surface hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
