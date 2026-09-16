"use client";

import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from "lucide-react";
import type { PlaceKind, ResolvedPlace } from "@/lib/places/types";
import type { GuideDetail } from "@/lib/types";
import { api } from "@/lib/api";
import { newId } from "@/lib/store";
import { resolvePlaces } from "@/lib/places/client";
import { Button } from "@/components/ui/Button";
import { Chip, Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { PlaceImage } from "@/components/ui/PlaceImage";

const GUIDE_TAGS = ["Food & drink", "Culture", "Outdoors", "Nightlife", "Family", "Romantic", "Budget", "Luxury", "Weekend", "Road trip", "Beach", "Art & design"];

const KINDS: { value: PlaceKind; label: string }[] = [
  { value: "attraction", label: "Thing to do" },
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Stay" },
];

interface EditorItem {
  key: string;
  place: ResolvedPlace;
  note: string;
}

function Photo({ src, alt, className }: { src?: string; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
    return <img src={src} alt={alt} onError={() => setFailed(true)} className={`${className} object-cover`} loading="lazy" />;
  }
  return <PlaceImage queries={[alt]} alt={alt} className={className} />;
}

/**
 * Create or edit a community guide: basics, tags and an ordered list of places
 * (resolved through Places so every entry has a photo, rating and coordinates).
 */
export function GuideEditor({ initial, onSaved }: { initial?: GuideDetail; onSaved: (guide: GuideDetail) => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [customTag, setCustomTag] = useState("");
  const [items, setItems] = useState<EditorItem[]>(() => (initial?.items ?? []).map((i) => ({ key: i.id, place: i.place, note: i.note })));
  const [destPlace, setDestPlace] = useState<{ query: string; place: ResolvedPlace | null } | null>(
    initial?.place ? { query: initial.destination, place: initial.place } : null,
  );
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<PlaceKind>("attraction");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cover = (destPlace?.query === destination.trim() ? destPlace.place?.photos?.[0] : undefined) ?? items.find((i) => i.place.photos?.[0])?.place.photos[0];

  const resolveDestination = async () => {
    const q = destination.trim();
    if (!q || destPlace?.query === q) return;
    const res = await resolvePlaces({ items: [{ key: "dest", query: q, kind: "destination" }] });
    setDestPlace({ query: q, place: res?.items[0]?.place ?? null });
  };

  const addPlace = async (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    try {
      const res = await resolvePlaces({ destination: destination.trim() || undefined, items: [{ key: "add", query: q, kind }] });
      const place = res?.items[0]?.place;
      if (!place) {
        setError(`Couldn't find "${q}". Try adding the city or a more specific name.`);
        return;
      }
      if (items.some((i) => i.place.id === place.id)) {
        setError(`${place.name} is already in this guide.`);
        return;
      }
      setItems([...items, { key: newId(), place, note: "" }]);
      setQuery("");
    } finally {
      setSearching(false);
    }
  };

  const move = (index: number, delta: number) => {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };

  const toggleTag = (tag: string) => setTags(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag].slice(0, 10));

  const addCustomTag = () => {
    const t = customTag.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags([...tags, t].slice(0, 10));
    setCustomTag("");
  };

  const save = async (published: boolean) => {
    setError(null);
    if (!title.trim()) return setError("Give the guide a title.");
    if (!destination.trim()) return setError("Say where this guide is about.");
    if (published && items.length === 0) return setError("Add at least one place before publishing.");
    setSaving(published ? "publish" : "draft");
    try {
      const body = {
        title: title.trim(),
        destination: destination.trim(),
        description: description.trim(),
        tags,
        published,
        items: items.map((i) => ({ place: i.place, note: i.note.trim() })),
      };
      const guide = initial
        ? await api<GuideDetail>(`/api/guides/${encodeURIComponent(initial.id)}`, { method: "PATCH", json: body })
        : await api<GuideDetail>("/api/guides", { method: "POST", json: body });
      onSaved(guide);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the guide");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="relative h-[200px] overflow-hidden rounded-3xl bg-neutral-200">
        {cover ? (
          <Photo src={cover} alt={destination || "Guide cover"} className="absolute inset-0 h-full w-full" />
        ) : (
          <PlaceImage queries={[destination.trim()]} alt={destination || "Guide cover"} className="absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-6 bottom-5 text-white drop-shadow">
          <div className="text-[11px] font-semibold uppercase tracking-wide opacity-90">{initial ? "Editing guide" : "New guide"}</div>
          <div className="text-[26px] font-semibold leading-tight">{title.trim() || "Your guide title"}</div>
          {destination.trim() ? <div className="text-[14px] opacity-90">{destination.trim()}</div> : null}
        </div>
      </div>

      <section className="grid gap-4 rounded-3xl border border-border bg-white p-5">
        <h2 className="text-[17px] font-semibold tracking-tight">Basics</h2>
        <Field label="Title">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A perfect food weekend in Lisbon" maxLength={120} />
        </Field>
        <Field label="Destination" hint="City or region; sets the cover photo and centers the map.">
          <TextInput value={destination} onChange={(e) => setDestination(e.target.value)} onBlur={() => void resolveDestination()} placeholder="Lisbon, Portugal" maxLength={120} />
        </Field>
        <Field label="Description">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Who is this for, how many days, what makes it special…" className="min-h-[110px]" maxLength={4000} />
        </Field>
        <div>
          <div className="mb-1.5 text-[13px] font-medium">Tags</div>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set([...GUIDE_TAGS, ...tags])).map((tag) => (
              <Chip key={tag} active={tags.includes(tag)} onClick={() => toggleTag(tag)}>
                {tag}
              </Chip>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <TextInput
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomTag();
                }
              }}
              placeholder="Add your own tag"
              className="max-w-xs"
              maxLength={30}
            />
            <Button variant="outline" onClick={addCustomTag} disabled={!customTag.trim()}>
              <Plus className="h-4 w-4" /> Add tag
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl border border-border bg-white p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-semibold tracking-tight">Places</h2>
          <span className="text-[13px] text-muted">{items.length} of 40</span>
        </div>
        <form onSubmit={addPlace} className="flex gap-2">
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={destination.trim() ? `Add a place in ${destination.trim()}…` : "Add a place (set the destination first for better matches)"}
            aria-label="Place to add"
          />
          <Select value={kind} onChange={(e) => setKind(e.target.value as PlaceKind)} className="w-36" aria-label="Kind of place">
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </Select>
          <Button type="submit" disabled={searching || !query.trim() || items.length >= 40}>
            {searching ? "Finding…" : "Add"}
          </Button>
        </form>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-[14px] text-muted">
            Search for the restaurants, sights and stays that make this guide worth following.
          </p>
        ) : (
          <ol className="grid gap-3">
            {items.map((item, index) => (
              <li key={item.key} className="flex gap-3 rounded-2xl border border-border p-3">
                <div className="flex flex-col items-center gap-1 pt-1 text-[12px] font-semibold text-muted">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-foreground">{index + 1}</span>
                  <button type="button" onClick={() => move(index, -1)} aria-label={`Move ${item.place.name} up`} disabled={index === 0} className="rounded-full p-1 hover:bg-surface disabled:opacity-30">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => move(index, 1)} aria-label={`Move ${item.place.name} down`} disabled={index === items.length - 1} className="rounded-full p-1 hover:bg-surface disabled:opacity-30">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Photo src={item.place.photos?.[0]} alt={item.place.name} className="h-[76px] w-[76px] shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold">{item.place.name}</div>
                      <div className="truncate text-[13px] text-muted">
                        {[item.place.category, item.place.locality, item.place.rating ? `★ ${item.place.rating.toFixed(1)}` : ""].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <button type="button" onClick={() => setItems(items.filter((i) => i.key !== item.key))} aria-label={`Remove ${item.place.name}`} className="rounded-full p-2 text-neutral-500 hover:bg-surface hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <TextInput
                    value={item.note}
                    onChange={(e) => setItems(items.map((i) => (i.key === item.key ? { ...i, note: e.target.value } : i)))}
                    placeholder="Why it's worth it, what to order, when to go…"
                    aria-label={`Note for ${item.place.name}`}
                    className="mt-2"
                    maxLength={500}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => save(false)} disabled={saving !== null}>
          {saving === "draft" ? "Saving…" : "Save draft"}
        </Button>
        <Button onClick={() => save(true)} disabled={saving !== null}>
          <Upload className="h-4 w-4" /> {saving === "publish" ? "Publishing…" : initial?.published ? "Update guide" : "Publish to the community"}
        </Button>
        {error ? <span className="text-[13px] text-red-600">{error}</span> : null}
      </div>
    </div>
  );
}
