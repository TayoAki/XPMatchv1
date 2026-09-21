"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Search, SquarePlus } from "lucide-react";
import { api } from "@/lib/api";
import type { Guide } from "@/lib/types";
import { PageFrame, EmptyState } from "@/components/PageFrame";
import { TextInput } from "@/components/ui/Field";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { GuideCard } from "@/components/guides/GuideCard";
import { INSPIRATION, type InspirationItem } from "@/lib/travel/inspiration";
import { findCollection } from "@/lib/travel/collections";
import { useSendMessage } from "@/components/chat/useSendMessage";

const CURATED_ROWS: { title: string; blurb: string; tags: string[] }[] = [
  { title: "Food-first cities", blurb: "Markets, tasting menus and the best street food.", tags: ["food"] },
  { title: "Big outdoors", blurb: "Trails, lakes and skies worth the early alarm.", tags: ["outdoors", "road trip"] },
  { title: "Romantic escapes", blurb: "Cliffside villages and sunsets built for two.", tags: ["romance"] },
  { title: "Culture deep dives", blurb: "Temples, museums and neighborhoods with a story.", tags: ["culture", "art"] },
];

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function DestinationRow({ title, blurb, items, onAsk }: { title: string; blurb: string; items: InspirationItem[]; onAsk: () => void }) {
  const send = useSendMessage();
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-[18px] font-semibold tracking-tight">{title}</h3>
          <p className="text-[13px] text-muted">{blurb}</p>
        </div>
        <button type="button" onClick={onAsk} className="shrink-0 text-[13px] font-medium hover:underline">
          Ask which fits me
        </button>
      </div>
      <div className="xp-no-scrollbar mt-3 flex gap-4 overflow-x-auto pb-1">
        {items.map((item) => (
          <button key={item.slug} type="button" onClick={() => send(item.prompt)} className="shrink-0 text-left">
            <PlaceImage queries={[item.wiki ?? item.name, `${item.name}, ${item.country}`]} alt={item.name} className="h-[200px] w-[260px] rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-x-4 bottom-4 text-white">
                <div className="text-[15px] font-semibold">{item.name}</div>
                <div className="text-[12px] opacity-90">{item.tagline}</div>
              </div>
            </PlaceImage>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Community guides with search, plus the curated destination rows; `collection` (from a Discover card) narrows the curated rows to that theme. */
export function InspirationClient({ collection: collectionKey }: { collection?: string }) {
  const send = useSendMessage();
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim(), 350);
  const [result, setResult] = useState<{ q: string; guides: Guide[] } | null>(null);
  const collection = findCollection(collectionKey);

  useEffect(() => {
    let active = true;
    api<{ guides: Guide[] }>(`/api/guides${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then((data) => active && setResult({ q, guides: data.guides }))
      .catch(() => active && setResult({ q, guides: [] }));
    return () => {
      active = false;
    };
  }, [q]);

  const guides = result?.q === q ? result.guides : null;
  const askRow = (title: string, items: InspirationItem[]) => () => send(`From these ${title.toLowerCase()} ideas (${items.map((i) => i.name).join(", ")}), which fits me best and why?`);
  const collectionItems = collection ? INSPIRATION.filter((i) => i.bestFor.some((t) => collection.tags.includes(t))) : [];

  return (
    <PageFrame
      title={collection ? collection.title : "Inspiration"}
      description={collection ? collection.description : "Guides written by the XPMatch community. Save one, or plan a trip around it."}
      actions={
        <Link href="/create" className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover">
          <SquarePlus className="h-4 w-4" /> Create a guide
        </Link>
      }
    >
      {collection ? (
        <div className="mb-8 grid gap-4" data-testid="collection-rows">
          <Link href="/inspiration" className="inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All inspiration
          </Link>
          <DestinationRow title={collection.title} blurb="Destinations in this collection. Tap one and the assistant plans it around you." items={collectionItems} onAsk={askRow(collection.title, collectionItems)} />
        </div>
      ) : null}

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search guides by destination or title" className="pl-9" aria-label="Search guides" />
      </div>

      <section className="mt-6">
        {guides === null ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="xp-skeleton aspect-[16/11] rounded-3xl" />
            ))}
          </div>
        ) : guides.length === 0 ? (
          <EmptyState
            title={q ? `No guides match "${q}"` : "No community guides yet"}
            body={q ? "Try another destination, or write the guide yourself." : "Be the first: share the places you'd send a friend to."}
            action={
              <Link href="/create" className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover">
                <SquarePlus className="h-4 w-4" /> Create a guide
              </Link>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {guides.map((g) => (
              <GuideCard key={g.id} guide={g} />
            ))}
          </div>
        )}
      </section>

      {collection ? null : (
        <section className="mt-12 grid gap-8">
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight">Curated by XPMatch</h2>
            <p className="text-[14px] text-muted">Destinations to get you started. Tap one and the assistant plans it around you.</p>
          </div>
          {CURATED_ROWS.map((row) => {
            const items = INSPIRATION.filter((i) => i.bestFor.some((t) => row.tags.includes(t)));
            if (!items.length) return null;
            return <DestinationRow key={row.title} title={row.title} blurb={row.blurb} items={items} onAsk={askRow(row.title, items)} />;
          })}
        </section>
      )}
    </PageFrame>
  );
}
