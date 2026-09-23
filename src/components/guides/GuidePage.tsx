"use client";

import { PhotoCredit } from "@/components/ui/PhotoCredit";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowLeft, Heart, MapPin, Pencil, Plus, Sparkles, Star, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { GuideDetail, GuideItem } from "@/lib/types";
import { findSaved, useTravelStore } from "@/lib/store";
import { useMediaQuery } from "@/lib/use-media-query";
import { shortPlaceName } from "@/lib/places/names";
import { EmptyState } from "@/components/PageFrame";
import { Button } from "@/components/ui/Button";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { PlacesMap } from "@/components/map/PlacesMap";
import type { MapPin as Pin } from "@/components/map/GoogleMap";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { useUiState } from "@/components/providers/UiState";

const itemKey = (id: string) => `guide-item:${id}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Photo({ src, alt, className, queries }: { src?: string; alt: string; className: string; queries: string[] }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
    return <img src={src} alt={alt} onError={() => setFailed(true)} className={clsx(className, "object-cover")} loading="lazy" />;
  }
  return <PlaceImage queries={queries} alt={alt} className={className} />;
}

function PlaceRow({ item, index, destination, onShow }: { item: GuideItem; index: number; destination: string; onShow: () => void }) {
  const { saved, toggleSaved } = useTravelStore();
  const { openAddToTrip } = useUiState();
  const place = item.place;
  const isSaved = !!findSaved(saved, { kind: place.kind, title: place.name, refId: place.id });
  const meta = [place.category, place.locality].filter(Boolean).join(" · ");
  return (
    <li className="flex gap-4 rounded-3xl border border-border bg-white p-4">
      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-white">{index + 1}</span>
      <div className="relative shrink-0">
        <Photo src={place.photos?.[0]} alt={place.name} queries={[place.name, destination]} className="h-[96px] w-[128px] rounded-2xl" />
        {place.photos?.[0] ? <PhotoCredit credit={place.photoCredits?.[0]} className="bottom-1 left-1" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[17px] font-semibold" title={place.name}>
              {shortPlaceName(place.name)}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
              {place.rating ? (
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Star className="h-3.5 w-3.5 fill-current" /> {place.rating.toFixed(1)}
                </span>
              ) : null}
              {meta ? <span>{meta}</span> : null}
              {place.priceLevel ? <span>· {place.priceLevel}</span> : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              aria-pressed={isSaved}
              aria-label={isSaved ? `Remove ${place.name} from saved` : `Save ${place.name}`}
              onClick={() => toggleSaved({ kind: place.kind, title: place.name, subtitle: place.locality, destination, url: place.googleMapsUri, place, refId: place.id })}
              className="rounded-full p-2 text-neutral-500 hover:bg-surface hover:text-foreground"
            >
              <Heart className={clsx("h-4 w-4", isSaved && "fill-red-500 text-red-500")} />
            </button>
            <button type="button" aria-label={`Add ${place.name} to a trip`} onClick={() => openAddToTrip({ place })} className="rounded-full p-2 text-neutral-500 hover:bg-surface hover:text-foreground">
              <Plus className="h-4 w-4" />
            </button>
            <button type="button" aria-label={`Show ${place.name} on the map`} onClick={onShow} className="rounded-full p-2 text-neutral-500 hover:bg-surface hover:text-foreground">
              <MapPin className="h-4 w-4" />
            </button>
          </div>
        </div>
        {item.note ? <p className="mt-2 text-[14px] leading-relaxed text-neutral-700">{item.note}</p> : null}
      </div>
    </li>
  );
}

/** A community guide: cover, author, description, ordered places and their map. */
export function GuidePage({ guideId }: { guideId: string }) {
  const router = useRouter();
  const send = useSendMessage();
  const { user, saved, toggleGuideSaved } = useTravelStore();
  const [state, setState] = useState<{ id: string; guide: GuideDetail | null; error: string | null } | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const wide = useMediaQuery("(min-width: 1280px)");

  useEffect(() => {
    let active = true;
    const id = guideId;
    api<GuideDetail>(`/api/guides/${encodeURIComponent(id)}`)
      .then((guide) => active && setState({ id, guide, error: null }))
      .catch((err: unknown) =>
        active && setState({ id, guide: null, error: err instanceof ApiError && err.status === 404 ? "This guide doesn't exist or isn't published." : "Could not load this guide." }),
      );
    return () => {
      active = false;
    };
  }, [guideId]);

  const current = state?.id === guideId ? state : null;
  const guide = current?.guide ?? null;
  const pins = useMemo<Pin[]>(() => (guide?.items ?? []).map((i) => ({ ...i.place, key: itemKey(i.id) })), [guide?.items]);

  if (current?.error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <EmptyState
          title="Guide not found"
          body={current.error}
          action={
            <Link href="/inspiration" className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover">
              <ArrowLeft className="h-4 w-4" /> Browse guides
            </Link>
          }
        />
      </div>
    );
  }
  if (!guide) {
    return (
      <div className="mx-auto max-w-[760px] px-8 py-8" aria-busy="true">
        <div className="xp-skeleton h-[280px] rounded-3xl" />
        <div className="xp-skeleton mt-6 h-6 w-1/2 rounded" />
        <div className="xp-skeleton mt-3 h-20 rounded-2xl" />
      </div>
    );
  }

  const mine = user?.id === guide.authorId;
  const isSaved = saved.some((s) => s.kind === "guide" && s.refId === guide.id);
  const cover = guide.coverUrl ?? guide.place?.photos?.[0];

  const planTrip = () =>
    send(
      `Plan a trip to ${guide.destination} built around the community guide "${guide.title}" (${guide.items.map((i) => i.place.name).join(", ")}). Suggest how many days it needs, group the places by day, and offer to create the trip with these places as ideas.`,
    );

  const destroy = async () => {
    if (!window.confirm(`Delete "${guide.title}"? People who saved it will lose it.`)) return;
    setDeleting(true);
    try {
      await api(`/api/guides/${encodeURIComponent(guide.id)}`, { method: "DELETE" });
      router.push("/inspiration");
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  const map = <PlacesMap focus={guide.place ?? null} focusLabel={guide.destination} pins={pins} selectedKey={selectedKey} onSelect={setSelectedKey} testId="guide-map" className={wide ? "relative h-full w-full" : "relative h-[360px] overflow-hidden rounded-3xl"} />;

  return (
    <div className="flex h-full min-h-0">
      <section className="xp-scroll min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[800px] px-8 py-6">
          <Link href="/inspiration" className="inline-flex items-center gap-1 text-[13px] font-medium text-neutral-600 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Inspiration
          </Link>

          <div className="relative mt-4 h-[300px] overflow-hidden rounded-3xl bg-neutral-200">
            <Photo src={cover} alt={guide.title} queries={[guide.destination]} className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
            {!guide.coverUrl && guide.place?.photos?.[0] ? <PhotoCredit credit={guide.place.photoCredits?.[0]} className="right-5 top-5" /> : null}
            {!guide.published ? <span className="absolute left-5 top-5 rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-semibold text-amber-900">Draft · only you can see this</span> : null}
            <div className="absolute inset-x-6 bottom-6 text-white drop-shadow">
              <div className="text-[36px] font-semibold leading-tight tracking-tight">{guide.title}</div>
              <div className="mt-1 flex items-center gap-1 text-[15px]">
                <MapPin className="h-4 w-4" /> {guide.destination}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-[14px] text-neutral-700">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-white">{guide.authorName.charAt(0).toUpperCase()}</span>
            <span>
              by <span className="font-semibold text-foreground">{guide.authorName}</span> <span className="text-muted">@{guide.authorHandle}</span>
            </span>
            <span className="text-muted">·</span>
            <span>{plural(guide.items.length, "place")}</span>
            <span className="text-muted">·</span>
            <span>{plural(guide.saveCount, "save")}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {!mine ? (
              <Button variant={isSaved ? "primary" : "outline"} onClick={() => toggleGuideSaved(guide)} aria-pressed={isSaved}>
                <Heart className={clsx("h-4 w-4", isSaved && "fill-current")} /> {isSaved ? "Saved" : "Save guide"}
              </Button>
            ) : null}
            <Button onClick={planTrip} variant={mine ? "primary" : "outline"}>
              <Sparkles className="h-4 w-4" /> Plan a trip from this guide
            </Button>
            {mine ? (
              <>
                <Link href={`/create?guide=${guide.id}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-medium hover:bg-surface">
                  <Pencil className="h-4 w-4" /> Edit
                </Link>
                <Button variant="ghost" onClick={destroy} disabled={deleting} className="text-red-600">
                  <Trash2 className="h-4 w-4" /> {deleting ? "Deleting…" : "Delete"}
                </Button>
              </>
            ) : null}
          </div>

          {guide.description ? <p className="mt-5 whitespace-pre-line text-[16px] leading-relaxed text-neutral-800">{guide.description}</p> : null}
          {guide.tags.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {guide.tags.map((t) => (
                <span key={t} className="rounded-full bg-surface px-3 py-1 text-[13px] font-medium text-neutral-700">
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          <h2 className="mt-8 text-[20px] font-semibold tracking-tight">The places</h2>
          {guide.items.length === 0 ? (
            <p className="mt-2 text-[14px] text-muted">No places yet.</p>
          ) : (
            <ol className="mt-3 grid gap-3">
              {guide.items.map((item, index) => (
                <PlaceRow key={item.id} item={item} index={index} destination={guide.destination} onShow={() => setSelectedKey(itemKey(item.id))} />
              ))}
            </ol>
          )}

          {!wide ? <div className="mt-8">{map}</div> : null}
        </div>
      </section>
      {wide ? <aside className="flex w-[44%] min-w-[420px] max-w-[900px] shrink-0 border-l border-border/60 bg-white">{map}</aside> : null}
    </div>
  );
}
