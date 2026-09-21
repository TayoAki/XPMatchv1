"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import clsx from "clsx";
import { ArrowLeft, ArrowUp, Calendar, KanbanSquare, LayoutGrid, Luggage, Map as MapIcon, MapPin, MessageCircle, MoreHorizontal, Sparkles, Users, Wallet } from "lucide-react";
import { formatDateRange, useTravelStore } from "@/lib/store";
import type { TripDetail } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/PageFrame";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { useMediaQuery } from "@/lib/use-media-query";
import { TripScopeProvider } from "./TripScope";
import { useTripDetail } from "./useTripDetail";
import { TripSections, type TripSection } from "./TripSections";
import { TripMap, tripPinCount } from "./TripMap";
import { TripDetailsDialog } from "./TripDetailsDialog";
import { TripBoard } from "./board/TripBoard";
import { PostTripRating } from "@/components/feedback/PostTripRating";
import { ratingCandidates, tripEnded } from "@/lib/feedback/post-trip";

const BUDGET_LABEL: Record<string, string> = { budget: "Budget", "mid-range": "Mid-range", premium: "Premium", luxury: "Luxury" };

type TripView = "tiles" | "board";
/** Phones show the page as tabs: the overview (title, chips, prompt, chats), the board and the tiles. */
type MobileTab = "overview" | "board" | "tiles";
/** Wide screens keep the board on the left; the right column shows the tiles, with the map over them on demand. */
type RightView = "tiles" | "map";

const noSubscribe = () => () => {};

/** Whether the URL asked for a specific view (`?view=board` from chat links). */
function readViewParam(): TripView | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("view");
    return fromUrl === "board" || fromUrl === "tiles" ? fromUrl : null;
  } catch {
    return null;
  }
}

/** `?rate=1` (the link from Updates) opens the post-trip rating as soon as the trip loads. */
function readRateParam(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("rate") === "1";
  } catch {
    return false;
  }
}

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

/** Tiles or the map in the right column; the map button carries the pin count so it reads like a summary. */
function RightToggle({ view, pinCount, onChange }: { view: RightView; pinCount: number; onChange: (view: RightView) => void }) {
  const options: { key: RightView; label: string; icon: typeof LayoutGrid }[] = [
    { key: "tiles", label: "Tiles", icon: LayoutGrid },
    { key: "map", label: pinCount ? `Map · ${pinCount} pinned` : "Map", icon: MapIcon },
  ];
  return (
    <div role="group" aria-label="Right panel" className="inline-flex rounded-full border border-border bg-white p-0.5">
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={view === o.key}
            onClick={() => onChange(o.key)}
            className={clsx("inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold", view === o.key ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-surface")}
          >
            <Icon className="h-4 w-4" /> {o.label}
          </button>
        );
      })}
    </div>
  );
}

function MobileTabs({ tab, onChange }: { tab: MobileTab; onChange: (tab: MobileTab) => void }) {
  const options: { key: MobileTab; label: string; icon: typeof LayoutGrid }[] = [
    { key: "overview", label: "Overview", icon: MessageCircle },
    { key: "board", label: "Board", icon: KanbanSquare },
    { key: "tiles", label: "Tiles", icon: LayoutGrid },
  ];
  return (
    <div role="tablist" aria-label="Trip sections" data-testid="trip-tabs" className="flex shrink-0 gap-1 border-b border-border bg-white px-2 pt-1">
      {options.map((o) => {
        const Icon = o.icon;
        const active = tab === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={clsx(
              "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 border-b-2 text-[14px] font-semibold",
              active ? "border-neutral-900 text-foreground" : "border-transparent text-neutral-500",
            )}
          >
            <Icon className="h-4 w-4" /> {o.label}
          </button>
        );
      })}
    </div>
  );
}

function TripPageInner({ tripId }: { tripId: string }) {
  const { trip, error, setTrip } = useTripDetail(tripId);
  const { removeTrip, feedback } = useTravelStore();
  const router = useRouter();
  const send = useSendMessage();
  const [section, setSection] = useState<TripSection | null>(null);
  const viewParam = useSyncExternalStore(noSubscribe, readViewParam, () => null);
  const [chosenTab, setChosenTab] = useState<MobileTab | null>(null);
  const [mapShown, setMapShown] = useState(true);
  // "Open the board" links from chat show the map over the tiles right away; otherwise the tiles come first.
  const [chosenRight, setChosenRight] = useState<RightView | null>(null);
  const rightView: RightView = chosenRight ?? (viewParam === "board" ? "map" : "tiles");
  const rateFromUrl = useSyncExternalStore(noSubscribe, readRateParam, () => false);
  const [ratingState, setRatingState] = useState<"auto" | "open" | "closed">("auto");
  const ratingOpen = ratingState === "open" || (ratingState === "auto" && rateFromUrl);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  // Sections and map live in a side column on wide screens and under the chats otherwise (rendered once).
  const wide = useMediaQuery("(min-width: 1280px)");

  /** Picking a place anywhere brings the map over the tiles so the pin is in view. */
  const selectPlace = (key: string | null) => {
    setSelectedKey(key);
    if (key) setChosenRight("map");
  };
  /** Opening a tile section takes the tiles back over the map. */
  const openSection = (next: TripSection | null) => {
    setSection(next);
    if (next) setChosenRight("tiles");
  };

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
  const toRate = tripEnded(trip) ? ratingCandidates(trip, feedback) : [];

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

  const boardPanel = <TripBoard trip={trip} canEdit={canEdit} onTrip={setTrip} onSelectPlace={selectPlace} hoveredKey={hoveredKey} onHover={setHoveredKey} />;
  const tilesPanel = <TripSections trip={trip} canEdit={canEdit} isOwner={isOwner} section={section} onSection={openSection} onTrip={setTrip} onSelectPlace={selectPlace} />;
  const pinCount = tripPinCount(trip);

  const map = (className?: string) => (
    <TripMap trip={trip} selectedKey={selectedKey} onSelect={setSelectedKey} hoveredKey={hoveredKey} onHover={setHoveredKey} className={className} />
  );

  // Phones open on the board when the trip already has stops or a chat link asked for it.
  const hasStops = trip.itinerary.some((day) => day.stops.length > 0);
  const tab: MobileTab = chosenTab ?? (viewParam === "board" || (viewParam === null && hasStops) ? "board" : viewParam === "tiles" ? "tiles" : "overview");

  const overview = (
    <div className={clsx("mx-auto max-w-[760px]", wide ? "px-8 py-6" : "px-4 py-5")}>
          <Link href="/trips" className="inline-flex items-center gap-1 text-[13px] font-medium text-neutral-600 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Your trips
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <h1 className="min-w-0 flex-1 basis-[200px] text-[26px] font-semibold leading-tight tracking-tight sm:text-[34px]">{trip.title}</h1>
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

          {toRate.length ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3" data-testid="post-trip-banner">
              <div>
                <div className="text-[15px] font-semibold">How was {trip.destination}?</div>
                <div className="text-[13px] text-neutral-700">
                  Rate {toRate.length} place{toRate.length === 1 ? "" : "s"} from this trip so XPMatch learns what you love.
                </div>
              </div>
              <Button size="sm" onClick={() => setRatingState("open")}>
                Rate {toRate.length} place{toRate.length === 1 ? "" : "s"}
              </Button>
            </div>
          ) : null}

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
    </div>
  );

  const dialogs = (
    <>
      {editOpen ? <TripDetailsDialog trip={trip} onClose={() => setEditOpen(false)} onSaved={setTrip} /> : null}
      {ratingOpen ? <PostTripRating trip={trip} onClose={() => setRatingState("closed")} /> : null}
    </>
  );

  if (!wide) {
    // Tabs instead of one long scroll: the itinerary is one tap away instead of buried under the header.
    const mobilePanel =
      tab === "board" ? (
        <TripBoard trip={trip} canEdit={canEdit} onTrip={setTrip} onSelectPlace={setSelectedKey} hoveredKey={hoveredKey} onHover={setHoveredKey} />
      ) : (
        <TripSections
          trip={trip}
          canEdit={canEdit}
          isOwner={isOwner}
          section={section}
          onSection={setSection}
          onTrip={setTrip}
          onSelectPlace={setSelectedKey}
          onOpenBoard={() => setChosenTab("board")}
        />
      );
    return (
      <div className="flex h-full min-h-0 flex-col">
        <MobileTabs tab={tab} onChange={setChosenTab} />
        <section className="xp-scroll min-h-0 flex-1 overflow-y-auto" data-testid="trip-tab-panel">
          {tab === "overview" ? (
            overview
          ) : (
            <div className="px-4 py-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0 truncate text-[15px] font-semibold">{trip.title}</div>
                <button type="button" onClick={() => setMapShown((v) => !v)} aria-pressed={mapShown} className="shrink-0 rounded-full border border-border px-3 py-1 text-[12px] font-medium hover:bg-surface">
                  {mapShown ? "Hide map" : "Show map"}
                </button>
              </div>
              {mapShown ? <div className="mb-4">{map("relative h-[220px] overflow-hidden rounded-3xl")}</div> : null}
              {mobilePanel}
            </div>
          )}
        </section>
        {dialogs}
      </div>
    );
  }

  // Wide screens: the board is the workspace on the left, the tiles sit on the right with the map
  // over them on demand, and the assistant is one box along the bottom, so nothing competes.
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="trip-desktop">
      <header className="shrink-0 border-b border-border/60 bg-white px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <Link href="/trips" className="inline-flex items-center gap-1 text-[12px] font-medium text-neutral-600 hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Your trips
            </Link>
            <h1 className="truncate text-[24px] font-semibold leading-tight tracking-tight">{trip.title}</h1>
          </div>
          <div className="relative flex shrink-0 items-center gap-2" ref={menuRef}>
            {canEdit ? (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                Edit details
              </Button>
            ) : null}
            <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="Trip menu" aria-haspopup="menu" aria-expanded={menuOpen} className="rounded-full border border-border p-2 hover:bg-surface">
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
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] font-medium">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3">
            <MapPin className="h-3.5 w-3.5" /> {trip.destination}
          </span>
          <button type="button" onClick={() => openSection("calendar")} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 hover:bg-surface-2">
            <Calendar className="h-3.5 w-3.5" /> {dates || "Add dates"}
          </button>
          <button type="button" onClick={() => openSection("calendar")} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 hover:bg-surface-2">
            <Users className="h-3.5 w-3.5" /> {trip.travelers ? `${trip.travelers} traveler${trip.travelers === 1 ? "" : "s"}` : "Who's going?"}
          </button>
          <button type="button" onClick={() => openSection("calendar")} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 hover:bg-surface-2">
            <Wallet className="h-3.5 w-3.5" /> {trip.budgetTier ? BUDGET_LABEL[trip.budgetTier] ?? trip.budgetTier : "Budget"}
          </button>
          <button type="button" onClick={() => openSection("members")} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 hover:bg-surface">
            <span className="flex -space-x-1.5">
              {trip.members.slice(0, 3).map((m) => (
                <span key={m.userId} className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white ring-2 ring-white" title={m.name}>
                  {m.name.charAt(0).toUpperCase()}
                </span>
              ))}
            </span>
            {trip.members.length === 1 ? "Invite friends" : `${trip.members.length} members`}
          </button>
          {trip.summary ? <span className="min-w-0 flex-1 basis-[240px] truncate text-[13px] font-normal text-neutral-600" title={trip.summary}>{trip.summary}</span> : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="xp-scroll min-w-0 flex-1 overflow-y-auto px-5 py-4" data-testid="trip-board-column">
          {toRate.length ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3" data-testid="post-trip-banner">
              <div>
                <div className="text-[15px] font-semibold">How was {trip.destination}?</div>
                <div className="text-[13px] text-neutral-700">
                  Rate {toRate.length} place{toRate.length === 1 ? "" : "s"} from this trip so XPMatch learns what you love.
                </div>
              </div>
              <Button size="sm" onClick={() => setRatingState("open")}>
                Rate {toRate.length} place{toRate.length === 1 ? "" : "s"}
              </Button>
            </div>
          ) : null}
          {boardPanel}
        </section>

        <aside className="flex w-[40%] min-w-[400px] max-w-[720px] shrink-0 flex-col border-l border-border/60 bg-white" data-testid="trip-side">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2">
            <RightToggle view={rightView} pinCount={pinCount} onChange={setChosenRight} />
            <span className="truncate text-[12px] text-muted">{rightView === "map" ? "Hover a stop on the board to find it" : "Everything else about the trip"}</span>
          </div>
          <div className="relative min-h-0 flex-1">
            <div className="xp-scroll h-full overflow-y-auto p-4" aria-hidden={rightView === "map"}>
              {tilesPanel}
            </div>
            {rightView === "map" ? (
              <div className="absolute inset-0 bg-white" data-testid="trip-map-over">
                {map("h-full")}
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <footer className="shrink-0 border-t border-border/60 bg-white px-6 py-3" data-testid="trip-chat-box">
        <div className="mx-auto max-w-[960px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            {starters.map((chip) => (
              <button key={chip.label} type="button" onClick={() => send(chip.prompt)} className="h-8 rounded-full border border-border bg-white px-3 text-[13px] font-medium hover:bg-neutral-50">
                {chip.label}
              </button>
            ))}
            {trip.chats.length ? (
              <span className="ml-auto flex min-w-0 flex-wrap items-center gap-1.5 text-[12px]" data-testid="trip-recent-chats">
                <MessageCircle className="h-3.5 w-3.5 text-neutral-500" />
                {trip.chats.slice(0, 3).map((c) => (
                  <Link key={c.id} href={`/?thread=${encodeURIComponent(c.id)}&trip=${encodeURIComponent(trip.id)}`} className="max-w-[220px] truncate rounded-full bg-surface px-2.5 py-1 font-medium hover:bg-surface-2">
                    {c.title}
                  </Link>
                ))}
                {trip.chats.length > 3 ? <span className="text-muted">+{trip.chats.length - 3} more</span> : null}
              </span>
            ) : null}
          </div>
          <form onSubmit={ask} className="mt-2 flex items-center gap-2 rounded-full border border-border bg-white py-1 pl-5 pr-1 shadow-sm focus-within:border-neutral-900">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Ask anything about ${trip.destination}: hotels, what to do, a day-by-day plan…`}
              aria-label="Ask about this trip"
              className="h-9 flex-1 bg-transparent text-[15px] outline-none placeholder:text-neutral-400"
            />
            <button type="submit" disabled={!question.trim()} aria-label="Send" className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white disabled:opacity-30">
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>
        </div>
      </footer>

      {dialogs}
    </div>
  );
}
