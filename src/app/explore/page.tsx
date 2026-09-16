"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageFrame } from "@/components/PageFrame";
import { Chip, TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { INSPIRATION } from "@/lib/travel/inspiration";
import { useSendMessage } from "@/components/chat/useSendMessage";

export default function ExplorePage() {
  const send = useSendMessage();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(() => Array.from(new Set(INSPIRATION.flatMap((i) => i.bestFor))).sort(), []);
  const items = useMemo(
    () =>
      INSPIRATION.filter((i) => (!tag || i.bestFor.includes(tag)) && (!query || `${i.name} ${i.country} ${i.tagline}`.toLowerCase().includes(query.toLowerCase()))),
    [tag, query],
  );

  return (
    <PageFrame title="Explore" description="Browse destinations, then ask XPMatch to tailor any of them to you.">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) void send(`Tell me about traveling to ${query.trim()} and whether it fits my profile.`);
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a city, country or vibe" className="pl-9" />
        </div>
        <Button type="submit" disabled={!query.trim()}>
          Ask XPMatch
        </Button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        <Chip active={tag === null} onClick={() => setTag(null)}>
          All
        </Chip>
        {tags.map((t) => (
          <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
            {t}
          </Chip>
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <article key={item.slug} className="overflow-hidden rounded-2xl border border-border bg-white">
            <PlaceImage queries={[item.name, `${item.name}, ${item.country}`]} alt={item.name} className="aspect-[16/10]" />
            <div className="p-4">
              <div className="text-[16px] font-semibold">
                {item.name} <span className="text-muted">· {item.country}</span>
              </div>
              <p className="mt-0.5 text-[13px] text-neutral-700">{item.tagline}</p>
              <div className="mt-2 text-[12px] text-muted">Best: {item.bestMonths}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => send(item.prompt)}>
                  Plan it with XPMatch
                </Button>
                <Button size="sm" variant="outline" onClick={() => send(`Is ${item.name} a good fit for me? Compare it with one alternative.`)}>
                  Is it for me?
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </PageFrame>
  );
}
