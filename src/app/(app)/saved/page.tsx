"use client";

import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { PageFrame, EmptyState } from "@/components/PageFrame";
import { Button } from "@/components/ui/Button";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { useTravelStore, type SavedItem, type SavedKind } from "@/lib/store";
import type { PlaceKind } from "@/lib/places/types";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { useUiState } from "@/components/providers/UiState";
import { ReactionControl } from "@/components/feedback/ReactionControl";
import { ImportHistory } from "@/components/import/ImportHistory";

const RATEABLE: SavedKind[] = ["destination", "hotel", "restaurant", "attraction"];

type Tab = "places" | "guides" | "imports";

const ORDER: SavedKind[] = ["collection", "destination", "hotel", "flight", "restaurant", "attraction"];
const LABEL: Record<SavedKind, string> = {
  guide: "Guides",
  collection: "Collections",
  destination: "Destinations",
  hotel: "Stays",
  flight: "Flights",
  restaurant: "Restaurants",
  attraction: "Things to do",
};

function Thumb({ item }: { item: SavedItem }) {
  const [failed, setFailed] = useState(false);
  const photo = item.place?.photos?.[0];
  if (photo && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
    return <img src={photo} alt={item.title} onError={() => setFailed(true)} className="h-14 w-14 shrink-0 rounded-xl object-cover" loading="lazy" />;
  }
  return <PlaceImage queries={[item.title, item.destination ?? ""]} alt={item.title} className="h-14 w-14 shrink-0 rounded-xl" />;
}

export default function SavedPage() {
  const { saved, removeSaved } = useTravelStore();
  const { openAddToTrip, openImport } = useUiState();
  const send = useSendMessage();
  const [tab, setTab] = useState<Tab>("places");
  const places = saved.filter((s) => s.kind !== "guide");
  const guides = saved.filter((s) => s.kind === "guide");

  return (
    <PageFrame
      title="Saved"
      description="Places you hearted in chat, on the map or in Explore, collections and guides you saved, and links or screenshots you imported."
      actions={
        places.length ? (
          <Button variant="outline" onClick={() => send("Look at my saved items and suggest how to turn them into a trip.")}>
            Turn saved places into a trip
          </Button>
        ) : null
      }
    >
      <div className="flex gap-6 border-b border-border text-[16px]">
        {(["places", "guides", "imports"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={clsx("-mb-px border-b-2 pb-3 font-medium capitalize", tab === t ? "border-brand text-foreground" : "border-transparent text-neutral-500 hover:text-foreground")}
          >
            {t} {t !== "imports" ? <span className="text-[13px] text-muted">{t === "places" ? places.length : guides.length}</span> : null}
          </button>
        ))}
      </div>

      {tab === "imports" ? <ImportHistory onImport={openImport} /> : null}

      {tab === "places" ? (
        places.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="Nothing saved yet" body="Tap the heart on any recommendation card, place sheet or Explore result to keep it here." />
          </div>
        ) : (
          <div className="mt-6 grid gap-6">
            {ORDER.filter((k) => places.some((s) => s.kind === k)).map((kind) => (
              <section key={kind}>
                <h2 className="text-[17px] font-semibold tracking-tight">{LABEL[kind]}</h2>
                <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
                  {places
                    .filter((s) => s.kind === kind)
                    .map((s) => (
                      <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                        <Thumb item={s} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px] font-medium">{s.title}</div>
                          {s.subtitle ? <div className="truncate text-[12px] text-muted">{s.subtitle}</div> : null}
                        </div>
                        {RATEABLE.includes(s.kind) ? (
                          <ReactionControl name={s.title} kind={s.kind as PlaceKind} place={s.place} destination={s.destination} source="card" size="sm" />
                        ) : null}
                        {s.place ? (
                          <button
                            type="button"
                            onClick={() => openAddToTrip({ place: s.place! })}
                            className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-[13px] font-medium hover:bg-surface"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add to trip
                          </button>
                        ) : null}
                        {s.url && s.url.startsWith("/") ? (
                          <Link href={s.url} className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-[13px] font-medium hover:bg-surface">
                            Open
                          </Link>
                        ) : s.url ? (
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
        )
      ) : tab === "imports" ? null : guides.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No saved guides yet"
            body="Browse community guides under Inspiration and save the ones you want to come back to."
            action={
              <Link href="/inspiration" className="inline-flex h-10 items-center rounded-full bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover">
                Browse guides
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {guides.map((s) => (
            <div key={s.id} className="group relative aspect-[16/11] overflow-hidden rounded-3xl bg-neutral-200">
              <Link href={s.url ?? (s.refId ? `/guides/${s.refId}` : "/inspiration")} className="absolute inset-0 block">
                {s.place?.photos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
                  <img src={s.place.photos[0]} alt={s.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                ) : (
                  <PlaceImage queries={[s.destination ?? s.title]} alt={s.title} className="absolute inset-0" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                <div className="absolute inset-x-5 bottom-5 text-white drop-shadow">
                  <div className="text-[18px] font-semibold leading-tight">{s.title}</div>
                  {s.subtitle ? <div className="mt-1 truncate text-[13px] opacity-90">{s.subtitle}</div> : null}
                </div>
              </Link>
              <button
                type="button"
                onClick={() => removeSaved(s.id)}
                aria-label={`Remove ${s.title}`}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-sm backdrop-blur hover:bg-white hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
