"use client";

import { photoCreditTitle } from "@/components/ui/PhotoCredit";
import { useEffect, useRef } from "react";
import clsx from "clsx";
import { Star } from "lucide-react";
import type { MapPlace } from "@/lib/places/types";
import { iconSvg } from "./markerIcons";
import { shortPlaceName } from "@/lib/places/names";

const KIND_LABEL: Record<MapPlace["kind"], string> = { hotel: "Stay", restaurant: "Eat", attraction: "Do", destination: "Place" };

/**
 * Mini cards under the map, one per pin, in the map's own order: photo, name, rating,
 * category and price, everything the catalog already holds, so scanning the whole set is
 * free. The strip and the pins stay in step: a hovered or selected pin scrolls its card
 * into view, and a tap on a card selects the pin, which opens the full place sheet.
 */
export function PinStrip({
  places,
  selectedKey,
  hoveredKey,
  onSelect,
  onHover,
  className,
}: {
  places: MapPlace[];
  selectedKey: string | null;
  hoveredKey: string | null;
  onSelect: (key: string) => void;
  onHover: (key: string | null) => void;
  className?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const activeKey = selectedKey ?? hoveredKey;

  useEffect(() => {
    if (!activeKey || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-key="${CSS.escape(activeKey)}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [activeKey]);

  if (!places.length) return null;

  return (
    <ul ref={listRef} className={clsx("xp-no-scrollbar flex snap-x gap-2 overflow-x-auto px-3 py-2", className)} data-testid="pin-strip" aria-label="Pinned places">
      {places.map((p) => {
        const photo = p.photos?.[0];
        const active = p.key === selectedKey;
        const hovered = p.key === hoveredKey;
        return (
          <li key={p.key} data-key={p.key} className="shrink-0 snap-start">
            <button
              type="button"
              onClick={() => onSelect(p.key)}
              onMouseEnter={() => onHover(p.key)}
              onMouseLeave={() => onHover(null)}
              aria-label={`Open ${p.name}`}
              aria-pressed={active}
              data-testid="pin-mini-card"
              className={clsx(
                "flex w-[168px] items-center gap-2 rounded-2xl border bg-white p-1.5 text-left shadow-sm transition-colors",
                active ? "border-brand" : hovered ? "border-neutral-400" : "border-border hover:bg-surface",
              )}
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
                <img src={photo} alt="" title={photoCreditTitle(p.photoCredits?.[0])} loading="lazy" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface text-neutral-500" dangerouslySetInnerHTML={{ __html: iconSvg(p.kind, 18) }} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold leading-tight" title={p.name}>
                  {shortPlaceName(p.name)}
                </span>
                <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted">
                  <span className="rounded-full bg-surface px-1.5 font-medium text-neutral-700">{KIND_LABEL[p.kind]}</span>
                  {p.rating ? (
                    <span className="inline-flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5 fill-current text-foreground" /> {p.rating.toFixed(1)}
                    </span>
                  ) : null}
                  {p.priceLevel ? <span>{p.priceLevel}</span> : null}
                </span>
                <span className="block truncate text-[11px] text-muted">{p.category ?? p.locality ?? ""}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
