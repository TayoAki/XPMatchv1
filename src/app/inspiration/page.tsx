"use client";

import { PageFrame } from "@/components/PageFrame";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { INSPIRATION } from "@/lib/travel/inspiration";
import { useSendMessage } from "@/components/chat/useSendMessage";

const COLLECTIONS: { title: string; blurb: string; tags: string[] }[] = [
  { title: "Food-first cities", blurb: "Markets, tasting menus and the best street food.", tags: ["food"] },
  { title: "Big outdoors", blurb: "Trails, lakes and skies worth the early alarm.", tags: ["outdoors", "road trip"] },
  { title: "Romantic escapes", blurb: "Cliffside villages and sunsets built for two.", tags: ["romance"] },
  { title: "Culture deep dives", blurb: "Temples, museums and neighborhoods with a story.", tags: ["culture", "art"] },
  { title: "Beach & sun", blurb: "Warm water and slow afternoons.", tags: ["beach"] },
  { title: "Music & nightlife", blurb: "Cities that stay up late.", tags: ["music", "nightlife"] },
];

export default function InspirationPage() {
  const send = useSendMessage();
  return (
    <PageFrame title="Inspiration" description="Curated collections. Tap a place and XPMatch plans it around you.">
      <div className="grid gap-8">
        {COLLECTIONS.map((c) => {
          const items = INSPIRATION.filter((i) => i.bestFor.some((t) => c.tags.includes(t)));
          if (!items.length) return null;
          return (
            <section key={c.title}>
              <div className="flex items-baseline justify-between">
                <div>
                  <h2 className="text-[19px] font-semibold tracking-tight">{c.title}</h2>
                  <p className="text-[13px] text-muted">{c.blurb}</p>
                </div>
                <button type="button" onClick={() => send(`From these ${c.title.toLowerCase()} ideas (${items.map((i) => i.name).join(", ")}), which fits me best and why?`)} className="text-[13px] font-medium hover:underline">
                  Ask which fits me
                </button>
              </div>
              <div className="xp-no-scrollbar mt-3 flex gap-4 overflow-x-auto pb-1">
                {items.map((item) => (
                  <button key={item.slug} type="button" onClick={() => send(item.prompt)} className="shrink-0 text-left">
                    <PlaceImage queries={[item.name, `${item.name}, ${item.country}`]} alt={item.name} className="h-[200px] w-[260px] rounded-2xl">
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
        })}
      </div>
    </PageFrame>
  );
}
