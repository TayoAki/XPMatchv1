"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Luggage, Map, Sparkles, X } from "lucide-react";
import { useTravelStore, formatDateRange, type Trip } from "@/lib/store";
import { INSPIRATION } from "@/lib/travel/inspiration";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { PhotoCredit } from "@/components/ui/PhotoCredit";
import type { PhotoCredit as PhotoCreditInfo } from "@/lib/places/types";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { HomePicks, focusOptions } from "./HomePicks";

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

interface JumpItem {
  key: string;
  kind: string;
  title: string;
  subtitle?: string;
  /** Google photo of the trip's or chat's destination, when resolved, and who took it. */
  photo?: string;
  credit?: PhotoCreditInfo;
  queries: string[];
  onClick: () => void;
  href?: string;
}

/** Cover for a "Jump back in" card: the resolved place's Google photo first, the Wikipedia lookup as a fallback. */
function JumpCover({ item, compact, children }: { item: JumpItem; compact: boolean; children: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  const size = compact ? "h-[160px] w-[220px]" : "h-[208px] w-[264px]";
  if (item.photo && !failed) {
    return (
      <div className={clsx("relative shrink-0 overflow-hidden rounded-2xl bg-neutral-200", size)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- proxied Places photo */}
        <img src={item.photo} alt={item.title} onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        <PhotoCredit credit={item.credit} className="left-3 top-3" asLink={false} />
        {children}
      </div>
    );
  }
  return (
    <PlaceImage queries={item.queries} alt={item.title} className={clsx("shrink-0 rounded-2xl", size)}>
      {children}
    </PlaceImage>
  );
}

/**
 * The discovery content: the proactive card, Jump back in, the home picks and inspiration.
 * The side panel renders it on wide screens; the phone home renders it compact under the composer.
 * With `picksFirst` (phones, after the in-chat quiz) the picks arrive first, framed as the
 * assistant's opening message, and the proactive card stays out of the way.
 */
export function DiscoveryFeed({ compact = false, picksFirst = false }: { compact?: boolean; picksFirst?: boolean }) {
  const { profile, planner, trips, chats, saved, proactiveDismissedAt, dismissProactive } = useTravelStore();
  const send = useSendMessage();

  const homeCity = profile.homeCity.trim();
  const focus = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = trips
      .filter((t) => !t.endDate || t.endDate >= today)
      .sort((a, b) => (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999"))[0];
    if (upcoming) return { destination: upcoming.destination, phrase: relativeTripPhrase(upcoming) };
    if (profile.nextDestination.trim()) return { destination: profile.nextDestination.trim(), phrase: `${profile.nextDestination.trim()}${profile.nextWhen.trim() ? ` in ${profile.nextWhen.trim()}` : ""}` };
    if (planner.where.trim()) {
      const dates = formatDateRange(planner.startDate, planner.endDate);
      return { destination: planner.where.trim(), phrase: `${planner.where.trim()}${dates ? ` ${dates}` : ""}` };
    }
    return null;
  }, [trips, planner, profile.nextDestination, profile.nextWhen]);

  const showProactive = isProactiveVisible(proactiveDismissedAt);

  const jumpBackIn = useMemo(() => {
    const items: JumpItem[] = [];
    const tripPhoto = (t: Trip | undefined): string | undefined => t?.place?.photos?.[0];
    const tripCredit = (t: Trip | undefined): PhotoCreditInfo | undefined => t?.place?.photoCredits?.[0];
    for (const t of trips.slice(0, 3)) {
      items.push({
        key: `trip-${t.id}`,
        kind: "Trip",
        title: t.title,
        subtitle: [t.destination, formatDateRange(t.startDate, t.endDate)].filter(Boolean).join(" · "),
        photo: tripPhoto(t),
        credit: tripCredit(t),
        queries: [t.destination],
        onClick: () => send(`Let's keep working on my trip "${t.title}" to ${t.destination}. What should we sort out next?`),
      });
    }
    for (const c of chats.slice(0, 3)) {
      const trip = c.tripId ? trips.find((t) => t.id === c.tripId) : undefined;
      const destination = c.destination ?? trip?.destination;
      items.push({
        key: `chat-${c.id}`,
        kind: "Chat",
        title: c.title,
        subtitle: destination,
        photo: c.place?.photos?.[0] ?? tripPhoto(trip),
        credit: c.place?.photos?.[0] ? c.place.photoCredits?.[0] : tripCredit(trip),
        queries: destination ? [destination] : [],
        onClick: () => undefined,
        href: `/?thread=${encodeURIComponent(c.id)}`,
      });
    }
    for (const s of saved.filter((x) => x.kind === "destination").slice(0, 2)) {
      items.push({
        key: `saved-${s.id}`,
        kind: "Saved",
        title: s.title,
        subtitle: s.subtitle,
        photo: s.place?.photos?.[0],
        credit: s.place?.photoCredits?.[0],
        queries: [s.title],
        onClick: () => send(`Tell me more about ${s.title} and when I should go.`),
      });
    }
    return items.slice(0, 6);
  }, [trips, chats, saved, send]);

  const picks = useMemo(
    () => focusOptions({ trips, nextDestination: profile.nextDestination, nextWhen: profile.nextWhen, plannerWhere: planner.where, homeCity }),
    [trips, profile.nextDestination, profile.nextWhen, planner.where, homeCity],
  );

  const headingClass = compact ? "text-[17px] font-semibold tracking-tight" : "text-[19px] font-semibold tracking-tight";
  const picksDestination = picks.options.find((o) => o.key === picks.initialKey)?.destination ?? picks.options[0]?.destination;
  const picksBlock = <HomePicks options={picks.options} initialKey={picks.initialKey} compact={compact} />;

  return (
    <>
      {picksFirst ? (
        <section className="mt-5" data-testid="first-picks">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <p className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-surface px-4 py-3 text-[15px] leading-snug">
              Here&apos;s what I&apos;d pick for you{picksDestination ? ` in ${picksDestination}` : ""}, from what you told me. Thumb them up or down so I learn, or ask me anything above.
            </p>
          </div>
          {picksBlock}
        </section>
      ) : null}

      {showProactive && !picksFirst ? (
        <div className={clsx("relative rounded-3xl bg-surface", compact ? "mt-6 p-4" : "p-5")}>
          <button type="button" onClick={dismissProactive} aria-label="Dismiss" className="absolute right-4 top-4 rounded-full p-1 text-neutral-500 hover:bg-white">
            <X className="h-4 w-4" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className={clsx("max-w-[640px] font-semibold tracking-tight", compact ? "mt-3 pr-6 text-[15px]" : "mt-4 text-[17px]")}>
            {focus
              ? `${focus.phrase} — want help getting started with where to stay or what to do?`
              : "Planning something? Tell me where you're headed and I'll get started on where to stay and what to do."}
          </p>
          <div className={clsx("flex flex-wrap items-center gap-2", compact ? "mt-4" : "mt-8")}>
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

      <section className={compact ? "mt-6" : "mt-8"} data-testid="jump-back-in">
        <h2 className={headingClass}>Jump back in</h2>
        <div className="xp-no-scrollbar mt-3 flex gap-4 overflow-x-auto pb-1">
          {jumpBackIn.length === 0 ? (
            <div className={clsx("flex w-full items-center justify-center rounded-2xl border border-dashed border-border text-[14px] text-muted", compact ? "h-[120px]" : "h-[208px]")}>
              Your trips, chats and saved places will show up here.
            </div>
          ) : null}
          {jumpBackIn.map((item) => {
            const card = (
              <JumpCover item={item} compact={compact}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-x-4 bottom-4 text-left text-white">
                  <span className="rounded-md bg-white/25 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">{item.kind}</span>
                  <div className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug">{item.title}</div>
                  {item.subtitle ? <div className="mt-0.5 truncate text-[12px] opacity-90">{item.subtitle}</div> : null}
                </div>
              </JumpCover>
            );
            return item.href ? (
              <Link key={item.key} href={item.href} className="shrink-0" data-testid="jump-card">
                {card}
              </Link>
            ) : (
              <button key={item.key} type="button" onClick={item.onClick} className="shrink-0 text-left" data-testid="jump-card">
                {card}
              </button>
            );
          })}
        </div>
      </section>

      {picksFirst ? null : picksBlock}

      <section className={clsx(compact ? "mt-6" : "mt-8 pb-6")}>
        <div className="flex items-center justify-between">
          <h2 className={headingClass}>Get inspired</h2>
          <Link href="/inspiration" className="text-[13px] font-medium text-neutral-700 hover:underline">
            See all
          </Link>
        </div>
        <div className={clsx("mt-3 grid", compact ? "grid-cols-2 gap-3" : "grid-cols-3 gap-4")}>
          {INSPIRATION.slice(0, 6).map((item) => (
            <button key={item.slug} type="button" onClick={() => send(item.prompt)} className="text-left">
              <PlaceImage queries={[item.wiki ?? item.name, `${item.name}, ${item.country}`]} alt={item.name} className={clsx("rounded-2xl", compact ? "h-[150px]" : "h-[208px]")}>
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
    </>
  );
}

/** The side column on wide screens: the feed in a scroll container, with a Show map button when the chat has pins. */
export function DiscoveryPanel({ showMapButton = false, onShowMap }: { showMapButton?: boolean; onShowMap?: () => void }) {
  return (
    <div className="xp-scroll relative h-full overflow-y-auto px-6 py-4">
      {showMapButton ? (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={onShowMap}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-brand px-4 text-[13px] font-semibold text-white shadow hover:bg-brand-hover"
          >
            <Map className="h-4 w-4" /> Show map
          </button>
        </div>
      ) : null}
      <DiscoveryFeed />
    </div>
  );
}
