"use client";

import { photoCreditTitle } from "@/components/ui/PhotoCredit";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BookMarked, ExternalLink, Layers, MapPin, Sparkles, Star } from "lucide-react";
import type { ImportRecord } from "@/lib/import/types";
import type { GuideDetail } from "@/lib/types";
import { api } from "@/lib/api";
import { mapActions } from "@/lib/map-store";
import { shortPlaceName } from "@/lib/places/names";
import { useCardThreadId } from "@/components/map/useRegisterPlaces";
import { useUiState } from "@/components/providers/UiState";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { Button } from "@/components/ui/Button";
import { AddToTripButton, CardGrid, CardShell, Footer, SaveButton } from "@/components/chat/cards/shared";
import { ReactionControl } from "@/components/feedback/ReactionControl";

export const importPinKey = (importId: string, index: number) => `import:${importId}:${index}`;

function Photo({ src, alt, fallback, credit }: { src?: string; alt: string; fallback: string[]; credit?: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
    return <img src={src} alt={alt} title={credit} onError={() => setFailed(true)} className="h-24 w-24 shrink-0 rounded-xl object-cover" loading="lazy" />;
  }
  return <PlaceImage queries={fallback} alt={alt} className="h-24 w-24 shrink-0 rounded-xl" />;
}

/** Prompt that carries an import into the chat: the link re-imports from the cache, a screenshot lists its places. */
export function importPrompt(record: ImportRecord): string {
  if (record.sourceUrl) return `Import this link and help me plan around it: ${record.sourceUrl}`;
  return `I imported these places from a screenshot (${record.destination ?? "trip ideas"}): ${record.places.map((p) => p.place.name).join(", ")}. Help me plan around them.`;
}

/**
 * "Imported from <site>": one card per verified place (pinned on the map when
 * shown in a chat), the mentions that could not be verified, and the three
 * ways forward: add all to a trip, plan a trip, keep as a private collection.
 */
export function ImportedPlacesCards({ record, pinOnMap = true }: { record: ImportRecord; pinOnMap?: boolean }) {
  const threadId = useCardThreadId();
  const { openAddToTrip } = useUiState();
  const send = useSendMessage();
  const [collection, setCollection] = useState<{ id: string; title: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pinOnMap || !threadId || record.places.length === 0) return;
    const registerKey = `import:${record.id}`;
    if (mapActions.hasRegistered(threadId, registerKey)) return;
    mapActions.markRegistered(threadId, registerKey);
    const current = mapActions.getState().threads[threadId];
    if (record.place && !current?.focus) mapActions.setFocus(threadId, record.place);
    mapActions.addPlaces(
      threadId,
      record.places.map((p, i) => ({ ...p.place, key: importPinKey(record.id, i), toolCallId: registerKey })),
    );
  }, [pinOnMap, threadId, record]);

  const names = record.places.map((p) => p.place.name);
  const sourceLabel = record.site === "screenshot" ? "a screenshot" : record.site;

  const saveCollection = async () => {
    setBusy(true);
    setError(null);
    try {
      const guide = await api<GuideDetail>("/api/guides", {
        method: "POST",
        json: {
          title: (record.sourceTitle || `Places from ${sourceLabel}`).slice(0, 120),
          destination: record.destination ?? record.places[0]?.place.locality ?? record.places[0]?.place.name ?? "Somewhere",
          description: record.sourceUrl ? `Imported from ${record.sourceUrl}` : "Imported from a screenshot",
          tags: ["imported"],
          published: false,
          items: record.places.map((p) => ({ place: p.place, note: p.why })),
        },
      });
      setCollection({ id: guide.id, title: guide.title });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the collection");
    } finally {
      setBusy(false);
    }
  };

  const planTrip = () =>
    send(
      `Plan a trip around these places I imported from ${sourceLabel}${record.destination ? ` (${record.destination})` : ""}: ${names.join(", ")}. Propose a day-by-day plan and create the trip when I confirm.`,
    );

  return (
    <div data-testid="imported-places">
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight">
            <Sparkles className="h-4 w-4" /> Imported from {sourceLabel}
            {record.cached ? <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">from your history</span> : null}
          </div>
          <div className="text-[13px] text-muted">
            {record.sourceTitle && record.sourceTitle !== record.site ? `${record.sourceTitle} · ` : ""}
            {record.places.length} place{record.places.length === 1 ? "" : "s"} verified through Google Places
            {record.destination ? ` · ${record.destination}` : ""}
          </div>
        </div>
        {record.sourceUrl ? (
          <a href={record.sourceUrl} target="_blank" rel="noreferrer noopener" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-neutral-700 hover:underline">
            Source <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>

      <CardGrid>
        {record.places.map((p, i) => {
          const key = importPinKey(record.id, i);
          const meta = [p.place.category, p.place.locality].filter(Boolean).join(" · ");
          return (
            <CardShell key={key} data-testid="imported-place" onMouseEnter={() => mapActions.setHovered(key)} onMouseLeave={() => mapActions.setHovered(null)}>
              <div className="flex gap-3 p-3">
                <Photo src={p.place.photos[0]} alt={p.place.name} fallback={[p.place.name, record.destination ?? ""]} credit={photoCreditTitle(p.place.photoCredits?.[0])} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[15px] font-semibold" title={p.place.name}>
                      {shortPlaceName(p.place.name)}
                    </div>
                    <SaveButton place={p.place} kind={p.kind} title={p.place.name} subtitle={p.place.locality} destination={record.destination} url={p.place.googleMapsUri} className="bg-surface shadow-none" />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
                    {p.place.rating ? (
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <Star className="h-3.5 w-3.5 fill-current" /> {p.place.rating.toFixed(1)}
                      </span>
                    ) : null}
                    {meta ? <span>{meta}</span> : null}
                  </div>
                  {p.why ? (
                    <p className="mt-1 text-[13px] text-neutral-700">
                      <span className="font-medium">Mentioned as: </span>
                      {p.why}
                    </p>
                  ) : null}
                </div>
              </div>
              <Footer>
                {threadId && pinOnMap ? (
                  <button
                    type="button"
                    onClick={() => mapActions.selectPlace(threadId, key)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-medium transition-colors hover:bg-surface-2"
                  >
                    <MapPin className="h-3.5 w-3.5" /> View on map
                  </button>
                ) : null}
                <AddToTripButton place={p.place} />
                <ReactionControl name={p.place.name} kind={p.kind} place={p.place} destination={record.destination} source="card" size="sm" />
              </Footer>
            </CardShell>
          );
        })}
      </CardGrid>

      {record.unverified.length ? (
        <p className="mt-2 text-[13px] text-muted" data-testid="unverified-places">
          <span className="font-medium text-neutral-700">Couldn&apos;t verify: </span>
          {record.unverified.map((u) => u.name).join(", ")}. Mentioned in the source but not found on Google Places, so they are listed here rather than shown as cards.
        </p>
      ) : null}

      {record.places.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => openAddToTrip({ place: record.places[0].place, places: record.places.map((p) => p.place), note: `From ${sourceLabel}` })}>
            <Layers className="h-4 w-4" /> Add all to a trip
          </Button>
          <Button size="sm" variant="outline" onClick={planTrip}>
            <Sparkles className="h-4 w-4" /> Plan a trip from these
          </Button>
          {collection ? (
            <Link href={`/guides/${collection.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-[13px] font-medium text-emerald-700">
              <BookMarked className="h-4 w-4" /> Saved as “{collection.title}”
            </Link>
          ) : (
            <Button size="sm" variant="outline" onClick={saveCollection} disabled={busy}>
              <BookMarked className="h-4 w-4" /> {busy ? "Saving…" : "Save as a collection"}
            </Button>
          )}
          {error ? <span className="text-[13px] text-red-600">{error}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
