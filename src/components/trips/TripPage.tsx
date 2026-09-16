"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUp, Calendar, Luggage, MapPin, MessageCircle, MoreHorizontal, Sparkles, Users, Wallet } from "lucide-react";
import { formatDateRange, useTravelStore } from "@/lib/store";
import type { TripDetail } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/PageFrame";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { useMediaQuery } from "@/lib/use-media-query";
import { TripScopeProvider } from "./TripScope";
import { useTripDetail } from "./useTripDetail";
import { TripSections, type TripSection } from "./TripSections";
import { TripMap } from "./TripMap";
import { TripDetailsDialog } from "./TripDetailsDialog";

const BUDGET_LABEL: Record<string, string> = { budget: "Budget", "mid-range": "Mid-range", premium: "Premium", luxury: "Luxury" };

/** "Rome next week", "Rome in October", "Rome right now". */
function relativePhrase(trip: TripDetail): string {
  if (!trip.startDate) return trip.destination;
  const start = new Date(`${trip.startDate}T00:00:00`);
  const days = Math.round((start.getTime() - Date.now()) / 86400000);
  if (trip.endDate && new Date(`${trip.endDate}T23:59:59`).getTime() < Date.now()) return `Your ${trip.destination} trip`;
  if (days <= 0) return `${trip.destination} right now`;
  if (days <= 3) return `${trip.destination} in a few days`;
  if (days <= 9) return `${trip.destination} next week`;
  if (days <= 21) return `${trip.destination} in ${Math.round(days / 7)} weeks`;
  return `${trip.destination} in ${start.toLocaleDateString("en-US", { month: "long" })}`;
}

export function TripPage({ tripId }: { tripId: string }) {
  return (
    <TripScopeProvider tripId={tripId}>
      <TripPageInner tripId={tripId} />
    </TripScopeProvider>
  );
}

function TripPageInner({ tripId }: { tripId: string }) {
  const { trip, error, setTrip } = useTripDetail(tripId);
  const { removeTrip } = useTravelStore();
  const router = useRouter();
  const send = useSendMessage();
  const [section, setSection] = useState<TripSection | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  // Sections and map live in a side column on wide screens and under the chats otherwise (rendered once).
  const wide = useMediaQuery("(min-width: 1280px)");

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <EmptyState
          title="Trip not found"
          body={error}
          action={
            <Link href="/trips" className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-white hover:bg-neutral-800">
              <ArrowLeft className="h-4 w-4" /> Back to your trips
            </Link>
          }
        />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="mx-auto max-w-[760px] px-8 py-8" aria-busy="true">
        <div className="xp-skeleton h-4 w-24 rounded" />
        <div className="xp-skeleton mt-6 h-10 w-2/3 rounded-xl" />
        <div className="mt-4 flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="xp-skeleton h-8 w-28 rounded-full" />
          ))}
        </div>
        <div className="xp-skeleton mt-8 h-40 rounded-3xl" />
      </div>
    );
  }

  const canEdit = trip.role !== "viewer";
  const isOwner = trip.role === "owner";
  const dates = formatDateRange(trip.startDate, trip.endDate);
  const ideaCount = trip.items.filter((i) => i.kind === "idea").length;

  const ask = (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setQuestion("");
    void send(q);
  };

  const starters = [
    { label: "Find hotels", prompt: `Find hotels in ${trip.destination} for this trip that fit my budget${dates ? ` (${dates})` : ""}.` },
    {
      label: "Top things to do",
      prompt: `What are the top things to do in ${trip.destination} for this trip? Add the best ones to my trip ideas.`,
    },
    { label: "Build the itinerary", prompt: "Build a day-by-day itinerary for this trip from my ideas and preferences, then save it to the trip." },
    { label: "Neighborhood guide", prompt: `Give me a neighborhood guide for ${trip.destination}: where to stay, eat and wander.` },
  ];

  const destroy = () => {
    setMenuOpen(false);
    const message = isOwner ? `Delete "${trip.title}" for everyone on it? This cannot be undone.` : `Leave "${trip.title}"?`;
    if (!window.confirm(message)) return;
    removeTrip(trip.id);
    router.push("/trips");
  };

  const sections = (
    <TripSections
      trip={trip}
      canEdit={canEdit}
      isOwner={isOwner}
      section={section}
      onSection={setSection}
      onTrip={setTrip}
      onSelectPlace={setSelectedKey}
    />
  );

  return (
    <div className="flex h-full min-h-0">
      <section className="xp-scroll min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[760px] px-8 py-6">
          <Link href="/trips" className="inline-flex items-center gap-1 text-[13px] font-medium text-neutral-600 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Your trips
          </Link>

          <div className="mt-4 flex items-start justify-between gap-4">
            <h1 className="text-[34px] font-semibold leading-tight tracking-tight">{trip.title}</h1>
            <div className="relative flex shrink-0 items-center gap-2" ref={menuRef}>
              {canEdit ? (
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  Edit details
                </Button>
              ) : null}
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Trip menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="rounded-full border border-border p-2 hover:bg-surface"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen ? (
                <div role="menu" className="absolute right-0 top-10 z-20 w-48 rounded-xl border border-border bg-white p-1 shadow-lg">
                  <button type="button" role="menuitem" onClick={destroy} className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-surface">
                    {isOwner ? "Delete trip" : "Leave trip"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[13px] font-medium">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3">
              <MapPin className="h-3.5 w-3.5" /> {trip.destination}
            </span>
            <button type="button" onClick={() => setSection("calendar")} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 hover:bg-surface-2">
              <Calendar className="h-3.5 w-3.5" /> {dates || "Add dates"}
            </button>
            <button type="button" onClick={() => setSection("calendar")} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 hover:bg-surface-2">
              <Users className="h-3.5 w-3.5" /> {trip.travelers ? `${trip.travelers} traveler${trip.travelers === 1 ? "" : "s"}` : "Who's going?"}
            </button>
            <button type="button" onClick={() => setSection("calendar")} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 hover:bg-surface-2">
              <Wallet className="h-3.5 w-3.5" /> {trip.budgetTier ? BUDGET_LABEL[trip.budgetTier] ?? trip.budgetTier : "Budget"}
            </button>
            <button type="button" onClick={() => setSection("members")} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 hover:bg-surface">
              <span className="flex -space-x-1.5">
                {trip.members.slice(0, 3).map((m) => (
                  <span key={m.userId} className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white ring-2 ring-white" title={m.name}>
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                ))}
              </span>
              {trip.members.length === 1 ? "Invite friends" : `${trip.members.length} members`}
            </button>
          </div>

          {trip.summary ? <p className="mt-4 text-[15px] leading-relaxed text-neutral-700">{trip.summary}</p> : null}

          <div className="mt-6 rounded-3xl bg-surface p-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="mt-4 text-[17px] font-semibold tracking-tight">
              {relativePhrase(trip)} — want help getting started with where to stay or what to do?
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-700">
                <Luggage className="h-4 w-4" />
              </span>
              {starters.map((chip) => (
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

          <form onSubmit={ask} className="mt-4 flex items-center gap-2 rounded-full border border-border bg-white py-1.5 pl-5 pr-1.5 shadow-sm focus-within:border-neutral-900">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Ask anything else about ${trip.destination}`}
              aria-label="Ask about this trip"
              className="h-9 flex-1 bg-transparent text-[15px] outline-none placeholder:text-neutral-400"
            />
            <button
              type="submit"
              disabled={!question.trim()}
              aria-label="Send"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>

          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-[19px] font-semibold tracking-tight">Chats</h2>
              <span className="text-[13px] text-muted">{ideaCount ? `${ideaCount} idea${ideaCount === 1 ? "" : "s"} so far` : ""}</span>
            </div>
            {trip.chats.length === 0 ? (
              <p className="mt-2 rounded-2xl border border-dashed border-border px-4 py-6 text-center text-[14px] text-muted">
                Conversations about this trip will show up here. Ask something above to start one.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
                {trip.chats.map((c) => (
                  <li key={c.id}>
                    <Link href={`/?thread=${encodeURIComponent(c.id)}&trip=${encodeURIComponent(trip.id)}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface">
                        <MessageCircle className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium">{c.title}</span>
                        <span className="block text-[12px] text-muted">Updated {new Date(c.updatedAt).toLocaleString()}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!wide ? (
            <div className="mt-8 grid gap-6">
              {sections}
              <TripMap trip={trip} selectedKey={selectedKey} onSelect={setSelectedKey} className="relative h-[360px] overflow-hidden rounded-3xl" />
            </div>
          ) : null}
        </div>
      </section>

      {wide ? (
        <aside className="flex w-[46%] min-w-[440px] max-w-[900px] shrink-0 flex-col border-l border-border/60 bg-white">
          <div className="xp-scroll min-h-0 flex-1 overflow-y-auto p-5">{sections}</div>
          <div className="h-[44%] min-h-[300px] shrink-0 border-t border-border/60">
            <TripMap trip={trip} selectedKey={selectedKey} onSelect={setSelectedKey} />
          </div>
        </aside>
      ) : null}

      {editOpen ? <TripDetailsDialog trip={trip} onClose={() => setEditOpen(false)} onSaved={setTrip} /> : null}
    </div>
  );
}
