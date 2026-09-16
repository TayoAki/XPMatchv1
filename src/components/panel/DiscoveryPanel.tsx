"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronDown, Luggage, Map, Sparkles, X } from "lucide-react";
import { useTravelStore, formatDateRange, type Trip } from "@/lib/store";
import { INSPIRATION } from "@/lib/travel/inspiration";
import { googleMapsSearchUrl } from "@/lib/travel/links";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { useUiState } from "@/components/providers/UiState";

/** The proactive card comes back six hours after being dismissed. */
function isProactiveVisible(dismissedAt: string | null): boolean {
  if (!dismissedAt) return true;
  return Date.now() - new Date(dismissedAt).getTime() > 6 * 3600_000;
}

function relativeTripPhrase(trip: Trip): string {
  if (!trip.startDate) return trip.destination;
  const start = new Date(`${trip.startDate}T00:00:00`);
  const days = Math.round((start.getTime() - Date.now()) / 86400000);
  if (days <= 0) return `${trip.destination} right now`;
  if (days <= 3) return `${trip.destination} in a few days`;
  if (days <= 9) return `${trip.destination} next week`;
  if (days <= 21) return `${trip.destination} in ${Math.round(days / 7)} weeks`;
  return `${trip.destination} in ${start.toLocaleDateString("en-US", { month: "long" })}`;
}

export function DiscoveryPanel({ showMapButton = false, onShowMap }: { showMapButton?: boolean; onShowMap?: () => void }) {
  const { profile, planner, trips, chats, saved, proactiveDismissedAt, dismissProactive } = useTravelStore();
  const { openAssistant } = useUiState();
  const send = useSendMessage();

  const homeCity = profile.homeCity.trim();
  const focus = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = trips
      .filter((t) => !t.endDate || t.endDate >= today)
      .sort((a, b) => (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999"))[0];
    if (upcoming) return { destination: upcoming.destination, phrase: relativeTripPhrase(upcoming) };
    if (planner.where.trim()) {
      const dates = formatDateRange(planner.startDate, planner.endDate);
      return { destination: planner.where.trim(), phrase: `${planner.where.trim()}${dates ? ` ${dates}` : ""}` };
    }
    return null;
  }, [trips, planner]);

  const showProactive = isProactiveVisible(proactiveDismissedAt);

  const jumpBackIn = useMemo(() => {
    const items: { key: string; kind: string; title: string; subtitle?: string; queries: string[]; onClick: () => void; href?: string }[] = [];
    for (const t of trips.slice(0, 3)) {
      items.push({
        key: `trip-${t.id}`,
        kind: "Trip",
        title: t.title,
        subtitle: [t.destination, formatDateRange(t.startDate, t.endDate)].filter(Boolean).join(" · "),
        queries: [t.destination],
        onClick: () => send(`Let's keep working on my trip "${t.title}" to ${t.destination}. What should we sort out next?`),
      });
    }
    for (const c of chats.slice(0, 3)) {
      items.push({ key: `chat-${c.id}`, kind: "Chat", title: c.title, queries: [], onClick: () => undefined, href: `/?thread=${encodeURIComponent(c.id)}` });
    }
    for (const s of saved.filter((x) => x.kind === "destination").slice(0, 2)) {
      items.push({
        key: `saved-${s.id}`,
        kind: "Saved",
        title: s.title,
        subtitle: s.subtitle,
        queries: [s.title],
        onClick: () => send(`Tell me more about ${s.title} and when I should go.`),
      });
    }
    return items.slice(0, 6);
  }, [trips, chats, saved, send]);

  const forYou = useMemo(() => {
    const place = homeCity || "my area";
    const style = (profile.travelStyles[0] ?? "food & drink").toLowerCase();
    return [
      { title: `Weekend escapes from ${place}`, gradient: "from-sky-200 via-cyan-200 to-blue-400", prompt: `Suggest 3 weekend getaways within a short drive or flight of ${place} that fit my profile.` },
      { title: `Best ${style} spots near ${place}`, gradient: "from-amber-200 via-orange-200 to-rose-400", prompt: `What are the best ${style} spots near ${place} right now? Show them as cards.` },
      { title: `A perfect day in ${place}`, gradient: "from-emerald-200 via-teal-200 to-cyan-400", prompt: `Plan a perfect day in ${place} for me this weekend.` },
    ];
  }, [homeCity, profile.travelStyles]);

  return (
    <div className="xp-scroll relative h-full overflow-y-auto px-6 py-4">
      {showMapButton ? (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={onShowMap}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-neutral-900 px-4 text-[13px] font-semibold text-white shadow hover:bg-neutral-800"
          >
            <Map className="h-4 w-4" /> Show map
          </button>
        </div>
      ) : null}
      {showProactive ? (
        <div className="relative rounded-3xl bg-surface p-5">
          <button type="button" onClick={dismissProactive} aria-label="Dismiss" className="absolute right-4 top-4 rounded-full p-1 text-neutral-500 hover:bg-white">
            <X className="h-4 w-4" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="mt-4 max-w-[640px] text-[17px] font-semibold tracking-tight">
            {focus
              ? `${focus.phrase} — want help getting started with where to stay or what to do?`
              : "Planning something? Tell me where you're headed and I'll get started on where to stay and what to do."}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-700">
              <Luggage className="h-4 w-4" />
            </span>
            {(focus
              ? [
                  { label: "Find hotels", prompt: `Find hotels in ${focus.destination} for my trip that fit my budget.` },
                  { label: "Top things to do", prompt: `What are the top things to do in ${focus.destination} for me?` },
                  { label: "Neighborhood guide", prompt: `Give me a neighborhood guide for ${focus.destination}: where to stay, eat and wander.` },
                ]
              : [
                  { label: "Weekend ideas", prompt: `Suggest weekend getaway destinations for me${homeCity ? ` from ${homeCity}` : ""}.` },
                  { label: "Plan a trip", prompt: "Help me plan a trip. Start by suggesting destinations that fit my profile." },
                  { label: "Find cheap flights", prompt: `Where can I fly cheaply${profile.homeAirport ? ` from ${profile.homeAirport}` : ""} next month?` },
                ]
            ).map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => send(chip.prompt)}
                className="h-8 rounded-full border border-border bg-white px-3.5 text-[13px] font-medium hover:bg-neutral-50"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="text-[19px] font-semibold tracking-tight">Jump back in</h2>
        <div className="xp-no-scrollbar mt-3 flex gap-4 overflow-x-auto pb-1">
          {jumpBackIn.length === 0 ? (
            <div className="flex h-[208px] w-full items-center justify-center rounded-2xl border border-dashed border-border text-[14px] text-muted">
              Your trips, chats and saved places will show up here.
            </div>
          ) : null}
          {jumpBackIn.map((item) => {
            const card = (
              <PlaceImage queries={item.queries} alt={item.title} className="h-[208px] w-[264px] shrink-0 rounded-2xl">
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-x-4 bottom-4 text-left text-white">
                  <span className="rounded-md bg-white/25 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">{item.kind}</span>
                  <div className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug">{item.title}</div>
                  {item.subtitle ? <div className="mt-0.5 truncate text-[12px] opacity-90">{item.subtitle}</div> : null}
                </div>
              </PlaceImage>
            );
            return item.href ? (
              <Link key={item.key} href={item.href} className="shrink-0">
                {card}
              </Link>
            ) : (
              <button key={item.key} type="button" onClick={item.onClick} className="shrink-0 text-left">
                {card}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[19px] font-semibold tracking-tight">For you in</h2>
            <button type="button" onClick={openAssistant} className="flex items-center gap-1 text-[19px] font-semibold tracking-tight hover:underline">
              <span aria-hidden="true">📍</span>
              {homeCity || "your city"}
              <ChevronDown className="h-4 w-4" />
            </button>
            {homeCity ? (
              <a
                href={googleMapsSearchUrl(homeCity)}
                target="_blank"
                rel="noreferrer noopener"
                className="ml-2 inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-medium hover:bg-surface"
              >
                <Map className="h-4 w-4" /> Map
              </a>
            ) : null}
          </div>
          <Link href="/explore" className="text-[13px] font-medium text-neutral-700 hover:underline">
            Explore
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-4">
          {forYou.map((idea) => (
            <button
              key={idea.title}
              type="button"
              onClick={() => send(idea.prompt)}
              className={`flex h-[208px] flex-col justify-end rounded-2xl bg-gradient-to-br ${idea.gradient} p-4 text-left transition-transform hover:scale-[1.01]`}
            >
              <div className="text-[15px] font-semibold leading-snug text-neutral-900">{idea.title}</div>
              <div className="mt-1 text-[12px] text-neutral-800/80">Ask XPMatch →</div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8 pb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[19px] font-semibold tracking-tight">Get inspired</h2>
          <Link href="/inspiration" className="text-[13px] font-medium text-neutral-700 hover:underline">
            See all
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-4">
          {INSPIRATION.slice(0, 6).map((item) => (
            <button key={item.slug} type="button" onClick={() => send(item.prompt)} className="text-left">
              <PlaceImage queries={[item.name, `${item.name}, ${item.country}`]} alt={item.name} className="h-[208px] rounded-2xl">
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
    </div>
  );
}
