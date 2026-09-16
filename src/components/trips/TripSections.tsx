"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  Lightbulb,
  ListOrdered,
  LogOut,
  MapPin,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Star,
  Ticket,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { formatDateRange, useTravelStore, type BudgetTier } from "@/lib/store";
import type { ItineraryDay, TripDetail, TripItem, TripItemKind, TripMember } from "@/lib/types";
import type { PlaceKind } from "@/lib/places/types";
import { resolvePlaces } from "@/lib/places/client";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextArea, TextInput, Chip } from "@/components/ui/Field";
import { EmptyState } from "@/components/PageFrame";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { TripCalendar } from "./TripCalendar";
import { tripItemKey } from "./TripMap";

export type TripSection = "ideas" | "itinerary" | "bookings" | "media" | "preferences" | "calendar" | "members";

interface Tile {
  key: TripSection;
  label: string;
  icon: typeof Lightbulb;
  summary: (trip: TripDetail) => string;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const TILES: Tile[] = [
  {
    key: "ideas",
    label: "Ideas",
    icon: Lightbulb,
    summary: (t) => {
      const n = t.items.filter((i) => i.kind === "idea").length;
      return n ? plural(n, "place") : "Places to consider";
    },
  },
  {
    key: "itinerary",
    label: "Itinerary",
    icon: ListOrdered,
    summary: (t) => (t.itinerary.length ? `${plural(t.itinerary.length, "day")} planned` : "Not started"),
  },
  {
    key: "bookings",
    label: "Bookings",
    icon: Ticket,
    summary: (t) => {
      const n = t.items.filter((i) => i.kind === "booking").length;
      return n ? plural(n, "booking") : "Flights, stays, tickets";
    },
  },
  {
    key: "media",
    label: "Media",
    icon: ImageIcon,
    summary: (t) => {
      const n = t.items.filter((i) => i.kind === "media").length;
      return n ? plural(n, "item") : "Photos & links";
    },
  },
  {
    key: "preferences",
    label: "Trip preferences",
    icon: SlidersHorizontal,
    summary: (t) => (t.preferences.trim() ? (t.preferences.length > 42 ? `${t.preferences.slice(0, 42)}…` : t.preferences) : "Notes for the assistant"),
  },
  { key: "calendar", label: "Calendar", icon: Calendar, summary: (t) => formatDateRange(t.startDate, t.endDate) || "Add dates" },
  { key: "members", label: "Members", icon: Users, summary: (t) => plural(t.members.length, "traveler") },
];

interface SectionProps {
  trip: TripDetail;
  canEdit: boolean;
  isOwner: boolean;
  onTrip: (trip: TripDetail) => void;
  onSelectPlace: (key: string | null) => void;
}

/** Tile grid (overview) or one opened section of a trip. */
export function TripSections({
  section,
  onSection,
  ...props
}: SectionProps & { section: TripSection | null; onSection: (section: TripSection | null) => void }) {
  if (!section) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.key}
              type="button"
              onClick={() => onSection(tile.key)}
              className="flex min-h-[120px] flex-col justify-between rounded-3xl border border-border bg-white p-4 text-left transition-colors hover:bg-surface"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface">
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-[15px] font-semibold">{tile.label}</span>
                <span className="block truncate text-[13px] text-muted">{tile.summary(props.trip)}</span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }
  const tile = TILES.find((t) => t.key === section);
  return (
    <div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onSection(null)} aria-label="Back to overview" className="rounded-full p-2 hover:bg-surface">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-[20px] font-semibold tracking-tight">{tile?.label}</h2>
      </div>
      <div className="mt-4">
        {section === "ideas" ? <IdeasSection {...props} /> : null}
        {section === "itinerary" ? <ItinerarySection {...props} /> : null}
        {section === "bookings" ? <LinkItemsSection kind="booking" {...props} /> : null}
        {section === "media" ? <LinkItemsSection kind="media" {...props} /> : null}
        {section === "preferences" ? <PreferencesSection {...props} /> : null}
        {section === "calendar" ? <CalendarSection {...props} /> : null}
        {section === "members" ? <MembersSection {...props} /> : null}
      </div>
    </div>
  );
}

/* ------------------------------ shared ------------------------------ */

function ErrorText({ children }: { children: ReactNode }) {
  return children ? <p className="text-[13px] text-red-600">{children}</p> : null;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function Thumb({ item, destination }: { item: TripItem; destination: string }) {
  const [failed, setFailed] = useState(false);
  const photo = item.place?.photos?.[0];
  if (photo && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
    return <img src={photo} alt={item.title} onError={() => setFailed(true)} className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover" loading="lazy" />;
  }
  return <PlaceImage queries={[item.title, destination]} alt={item.title} className="h-[72px] w-[72px] shrink-0 rounded-xl" />;
}

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx("rounded-full p-2 text-neutral-500 hover:bg-surface", danger ? "hover:text-red-600" : "hover:text-foreground")}
    >
      {children}
    </button>
  );
}

/* ------------------------------- ideas ------------------------------- */

const ADD_KINDS: { value: PlaceKind; label: string }[] = [
  { value: "attraction", label: "Thing to do" },
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Stay" },
];

function PlaceAdder({ trip, onAdded }: { trip: TripDetail; onAdded: (trip: TripDetail) => void }) {
  const { addTripItem } = useTravelStore();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<PlaceKind>("attraction");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    setError(null);
    try {
      const res = await resolvePlaces({ destination: trip.destination, items: [{ key: "add", query: q, kind }] });
      const place = res?.items[0]?.place ?? undefined;
      const detail = await addTripItem(trip.id, {
        kind: "idea",
        title: place?.name ?? q,
        note: note.trim(),
        url: place?.googleMapsUri,
        place,
      });
      onAdded(detail);
      setQuery("");
      setNote("");
    } catch (err) {
      setError(errorMessage(err, "Could not add this place"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border p-3">
      <div className="flex gap-2">
        <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Add a place in ${trip.destination}…`} aria-label="Place to add" />
        <Select value={kind} onChange={(e) => setKind(e.target.value as PlaceKind)} className="w-36" aria-label="Kind of place">
          {ADD_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </Select>
        <Button type="submit" disabled={busy || !query.trim()}>
          {busy ? "Adding…" : "Add"}
        </Button>
      </div>
      <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" aria-label="Note" className="mt-2" />
      <div className="mt-1">
        <ErrorText>{error}</ErrorText>
      </div>
    </form>
  );
}

function IdeaRow({
  item,
  trip,
  canEdit,
  onTrip,
  onSelectPlace,
}: {
  item: TripItem;
  trip: TripDetail;
  canEdit: boolean;
  onTrip: (trip: TripDetail) => void;
  onSelectPlace: (key: string | null) => void;
}) {
  const { saved, toggleSaved, removeTripItem } = useTravelStore();
  const place = item.place;
  const kind = place?.kind ?? "attraction";
  const isSaved = saved.some((s) => s.kind === kind && s.title.toLowerCase() === item.title.toLowerCase());
  const addedBy = trip.members.find((m) => m.userId === item.addedBy)?.name;
  const meta = [place?.category, place?.locality].filter(Boolean).join(" · ");
  return (
    <li className="flex gap-3 rounded-2xl border border-border p-3">
      <Thumb item={item} destination={trip.destination} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold">{item.title}</div>
            <div className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
              {place?.rating ? (
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Star className="h-3.5 w-3.5 fill-current" /> {place.rating.toFixed(1)}
                </span>
              ) : null}
              {meta ? <span>{meta}</span> : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            <IconButton
              label={isSaved ? `Remove ${item.title} from saved` : `Save ${item.title}`}
              onClick={() => toggleSaved({ kind, title: item.title, subtitle: place?.locality, destination: trip.destination, url: item.url, place })}
            >
              <Heart className={clsx("h-4 w-4", isSaved && "fill-red-500 text-red-500")} />
            </IconButton>
            {place ? (
              <IconButton label={`Show ${item.title} on the map`} onClick={() => onSelectPlace(tripItemKey(item.id))}>
                <MapPin className="h-4 w-4" />
              </IconButton>
            ) : null}
            {canEdit ? (
              <IconButton label={`Remove ${item.title}`} danger onClick={() => removeTripItem(trip.id, item.id).then(onTrip).catch((err) => console.error(err))}>
                <Trash2 className="h-4 w-4" />
              </IconButton>
            ) : null}
          </div>
        </div>
        {item.note ? <p className="mt-1 text-[13px] text-neutral-700">{item.note}</p> : null}
        <div className="mt-1 text-[12px] text-muted">{addedBy ? `Added by ${addedBy}` : ""}</div>
      </div>
    </li>
  );
}

function IdeasSection(props: SectionProps) {
  const { trip, canEdit, onTrip } = props;
  const send = useSendMessage();
  const ideas = trip.items.filter((i) => i.kind === "idea");
  return (
    <div className="grid gap-4">
      {canEdit ? <PlaceAdder trip={trip} onAdded={onTrip} /> : null}
      {ideas.length === 0 ? (
        <EmptyState
          title="No ideas yet"
          body="Places you add from chat, the map or Explore land here and on the trip map."
          action={
            <Button variant="outline" onClick={() => send(`Suggest things to do and places to eat in ${trip.destination} for this trip and add the best ones to my trip ideas.`)}>
              <Sparkles className="h-4 w-4" /> Ask the assistant for ideas
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3">
          {ideas.map((item) => (
            <IdeaRow key={item.id} item={item} {...props} />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------- itinerary ----------------------------- */

function ItinerarySection({ trip, canEdit, onTrip }: SectionProps) {
  const { patchTrip } = useTravelStore();
  const send = useSendMessage();
  const [draft, setDraft] = useState<ItineraryDay[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => setDraft(trip.itinerary.length ? trip.itinerary : [{ day: 1, title: "", items: [] }]);

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const itinerary = draft.map((d, i) => ({
        day: i + 1,
        title: d.title.trim() || `Day ${i + 1}`,
        items: d.items.map((s) => s.trim()).filter(Boolean),
      }));
      onTrip(await patchTrip(trip.id, { itinerary }));
      setDraft(null);
    } catch (err) {
      setError(errorMessage(err, "Could not save the itinerary"));
    } finally {
      setBusy(false);
    }
  };

  if (draft) {
    const update = (index: number, patch: Partial<ItineraryDay>) => setDraft(draft.map((d, i) => (i === index ? { ...d, ...patch } : d)));
    return (
      <div className="grid gap-4">
        {draft.map((d, i) => (
          <div key={i} className="rounded-2xl border border-border p-3">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold">Day {i + 1}</span>
              <TextInput value={d.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Theme of the day" aria-label={`Day ${i + 1} title`} />
              <IconButton label={`Remove day ${i + 1}`} danger onClick={() => setDraft(draft.filter((_, j) => j !== i))}>
                <X className="h-4 w-4" />
              </IconButton>
            </div>
            <TextArea
              value={d.items.join("\n")}
              onChange={(e) => update(i, { items: e.target.value.split("\n") })}
              placeholder="One stop per line"
              aria-label={`Day ${i + 1} stops`}
              className="mt-2"
            />
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setDraft([...draft, { day: draft.length + 1, title: "", items: [] }])}>
            <Plus className="h-4 w-4" /> Add day
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => setDraft(null)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save itinerary"}
          </Button>
        </div>
        <ErrorText>{error}</ErrorText>
      </div>
    );
  }

  if (trip.itinerary.length === 0) {
    return (
      <EmptyState
        title="No itinerary yet"
        body="Let the assistant draft a day-by-day plan from your ideas and preferences, or write it yourself."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => send("Build a day-by-day itinerary for this trip from my ideas and preferences, then save it to the trip.")}>
              <Sparkles className="h-4 w-4" /> Build it with the assistant
            </Button>
            {canEdit ? (
              <Button variant="outline" onClick={startEditing}>
                Write it myself
              </Button>
            ) : null}
          </div>
        }
      />
    );
  }

  return (
    <div className="grid gap-4">
      <ol className="grid gap-3">
        {trip.itinerary.map((d) => (
          <li key={d.day} className="rounded-2xl bg-surface/70 p-4">
            <div className="text-[14px] font-semibold">
              Day {d.day}
              {d.title ? <span className="text-neutral-600"> · {d.title}</span> : null}
            </div>
            <ul className="mt-1 list-disc pl-5 text-[14px] text-neutral-700">
              {d.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {canEdit ? (
          <Button variant="outline" onClick={startEditing}>
            Edit
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => send("Refine the itinerary for this trip: keep what works, fix the pacing and fill any gaps, then save it to the trip.")}>
          <Sparkles className="h-4 w-4" /> Refine with the assistant
        </Button>
      </div>
    </div>
  );
}

/* ------------------------- bookings and media ------------------------- */

const isImageUrl = (url?: string) => !!url && /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(url);

function normalizeUrl(value: string): string | undefined {
  const t = value.trim();
  if (!t) return undefined;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

const LINK_COPY: Record<"booking" | "media", { title: string; body: string; placeholder: string }> = {
  booking: { title: "No bookings yet", body: "Keep flight, stay and ticket confirmations here so everyone on the trip can find them.", placeholder: "Flight ATL → FCO, Hotel de Russie…" },
  media: { title: "No media yet", body: "Add photo links, videos or articles you want to keep with this trip.", placeholder: "Sunset at the Pantheon" },
};

function LinkItemsSection({ kind, trip, canEdit, onTrip }: SectionProps & { kind: "booking" | "media" }) {
  const { addTripItem, removeTripItem } = useTravelStore();
  const items = trip.items.filter((i) => i.kind === kind);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = LINK_COPY[kind];
  const Icon = kind === "booking" ? Ticket : ImageIcon;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      onTrip(await addTripItem(trip.id, { kind: kind as TripItemKind, title: title.trim(), url: normalizeUrl(url), note: note.trim() }));
      setTitle("");
      setUrl("");
      setNote("");
    } catch (err) {
      setError(errorMessage(err, "Could not add this item"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      {canEdit ? (
        <form onSubmit={submit} className="grid gap-2 rounded-2xl border border-border p-3">
          <div className="flex gap-2">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder={copy.placeholder} aria-label="Title" />
            <Button type="submit" disabled={busy || !title.trim()}>
              {busy ? "Adding…" : "Add"}
            </Button>
          </div>
          <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link (optional)" aria-label="Link" />
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === "booking" ? "Confirmation number, dates…" : "Caption (optional)"} aria-label="Note" />
          <ErrorText>{error}</ErrorText>
        </form>
      ) : null}
      {items.length === 0 ? (
        <EmptyState title={copy.title} body={copy.body} />
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 rounded-2xl border border-border p-3">
              {kind === "media" && isImageUrl(item.url) ? (
                // eslint-disable-next-line @next/next/no-img-element -- user-provided media link
                <img src={item.url} alt={item.title} className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover" loading="lazy" />
              ) : (
                <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-surface">
                  <Icon className="h-5 w-5 text-neutral-600" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noreferrer noopener" className="inline-flex max-w-full items-center gap-1 truncate text-[15px] font-semibold hover:underline">
                        {item.title} <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      </a>
                    ) : (
                      <div className="truncate text-[15px] font-semibold">{item.title}</div>
                    )}
                    {item.note ? <p className="mt-0.5 text-[13px] text-neutral-700">{item.note}</p> : null}
                  </div>
                  {canEdit ? (
                    <IconButton label={`Remove ${item.title}`} danger onClick={() => removeTripItem(trip.id, item.id).then(onTrip).catch((err) => console.error(err))}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  ) : null}
                </div>
                <div className="mt-1 text-[12px] text-muted">{new Date(item.createdAt).toLocaleDateString()}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------- preferences ---------------------------- */

function PreferencesSection({ trip, canEdit, onTrip }: SectionProps) {
  const { patchTrip } = useTravelStore();
  const [value, setValue] = useState(trip.preferences);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      onTrip(await patchTrip(trip.id, { preferences: value.trim() }));
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err, "Could not save preferences"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      <p className="text-[14px] text-neutral-700">
        The assistant reads these whenever it plans this trip: pace, must-dos, dietary needs, accessibility, who is coming and what they enjoy.
      </p>
      <TextArea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        readOnly={!canEdit}
        placeholder="e.g. Slow mornings, one big sight per day, vegetarian dinners, my partner loves markets and rooftop views."
        className="min-h-[160px]"
        aria-label="Trip preferences"
      />
      {canEdit ? (
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={busy || value.trim() === trip.preferences.trim()}>
            {busy ? "Saving…" : "Save preferences"}
          </Button>
          {saved ? <span className="text-[13px] text-emerald-700">Saved</span> : null}
          <ErrorText>{error}</ErrorText>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ calendar ------------------------------ */

const BUDGETS: { value: BudgetTier; label: string }[] = [
  { value: "budget", label: "Budget" },
  { value: "mid-range", label: "Mid-range" },
  { value: "premium", label: "Premium" },
  { value: "luxury", label: "Luxury" },
];

function CalendarSection({ trip, canEdit, onTrip }: SectionProps) {
  const { patchTrip } = useTravelStore();
  const [startDate, setStartDate] = useState(trip.startDate ?? "");
  const [endDate, setEndDate] = useState(trip.endDate ?? "");
  const [travelers, setTravelers] = useState(trip.travelers ?? 2);
  const [budgetTier, setBudgetTier] = useState(trip.budgetTier ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    startDate !== (trip.startDate ?? "") || endDate !== (trip.endDate ?? "") || travelers !== (trip.travelers ?? 2) || budgetTier !== (trip.budgetTier ?? "");

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      onTrip(await patchTrip(trip.id, { startDate: startDate || null, endDate: endDate || null, travelers, budgetTier: budgetTier || null }));
    } catch (err) {
      setError(errorMessage(err, "Could not save the dates"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      {canEdit ? (
        <div className="grid gap-3 rounded-2xl border border-border p-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="To">
              <TextInput type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Travelers">
              <TextInput type="number" min={1} max={50} value={travelers} onChange={(e) => setTravelers(Math.max(1, Number(e.target.value) || 1))} className="w-24" />
            </Field>
            <div>
              <div className="mb-1.5 text-[13px] font-medium">Budget</div>
              <div className="flex flex-wrap gap-2">
                {BUDGETS.map((b) => (
                  <Chip key={b.value} active={budgetTier === b.value} onClick={() => setBudgetTier(budgetTier === b.value ? "" : b.value)}>
                    {b.label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={busy || !dirty}>
              {busy ? "Saving…" : "Save"}
            </Button>
            <ErrorText>{error}</ErrorText>
          </div>
        </div>
      ) : null}
      <TripCalendar trips={[trip]} initialDate={trip.startDate} />
    </div>
  );
}

/* ------------------------------- members ------------------------------- */

function MemberRow({ member, trip, isOwner, onTrip }: { member: TripMember; trip: TripDetail; isOwner: boolean; onTrip: (trip: TripDetail) => void }) {
  const { user, removeTripMember } = useTravelStore();
  const router = useRouter();
  const isMe = member.userId === user?.id;
  const canRemove = member.role !== "owner" && (isOwner || isMe);

  const remove = async () => {
    const question = isMe ? `Leave "${trip.title}"? You'll lose access until someone adds you again.` : `Remove ${member.name} from "${trip.title}"?`;
    if (!window.confirm(question)) return;
    try {
      const detail = await removeTripMember(trip.id, member.userId);
      if (!detail) router.push("/trips");
      else onTrip(detail);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">{member.name.charAt(0).toUpperCase()}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium">
          {member.name}
          {isMe ? <span className="text-muted"> (you)</span> : null}
        </div>
        <div className="truncate text-[12px] text-muted">@{member.handle}</div>
      </div>
      <span className="rounded-full bg-surface px-2.5 py-0.5 text-[12px] font-medium capitalize text-neutral-700">{member.role}</span>
      {canRemove ? (
        <IconButton label={isMe ? "Leave trip" : `Remove ${member.name}`} danger onClick={remove}>
          {isMe ? <LogOut className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
        </IconButton>
      ) : null}
    </li>
  );
}

function MembersSection({ trip, canEdit, isOwner, onTrip }: SectionProps) {
  const { addTripMember } = useTravelStore();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      onTrip(await addTripMember(trip.id, value, role));
      setNotice(`Added ${value}. They'll see the trip under Trips and get a note in Updates.`);
      setEmail("");
    } catch (err) {
      setError(errorMessage(err, "Could not add this member"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      {canEdit ? (
        <form onSubmit={submit} className="grid gap-2 rounded-2xl border border-border p-3">
          <div className="flex gap-2">
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="friend@example.com" aria-label="Member email" />
            <Select value={role} onChange={(e) => setRole(e.target.value as "editor" | "viewer")} className="w-32" aria-label="Role">
              <option value="editor">Can edit</option>
              <option value="viewer">Can view</option>
            </Select>
            <Button type="submit" disabled={busy || !email.trim()}>
              {busy ? "Adding…" : "Add"}
            </Button>
          </div>
          <p className="text-[12px] text-muted">Members need an XPMatch account with this email. They are notified in Updates.</p>
          {notice ? <p className="text-[13px] text-emerald-700">{notice}</p> : null}
          <ErrorText>{error}</ErrorText>
        </form>
      ) : null}
      <ul className="divide-y divide-border rounded-2xl border border-border">
        {trip.members.map((m) => (
          <MemberRow key={m.userId} member={m} trip={trip} isOwner={isOwner} onTrip={onTrip} />
        ))}
      </ul>
    </div>
  );
}
