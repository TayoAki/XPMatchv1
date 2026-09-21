"use client";

import { Children, useState, type HTMLAttributes, type MouseEvent, type ReactNode } from "react";
import clsx from "clsx";
import { ExternalLink, Heart, MapPin, Plus, TriangleAlert } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import { findSaved, useTravelStore, type SavedKind } from "@/lib/store";
import type { ResolvedPlace } from "@/lib/places/types";
import { useUiState } from "@/components/providers/UiState";
import { useTripScope } from "@/components/trips/TripScope";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { PhotoCredit } from "@/components/ui/PhotoCredit";

/**
 * Cards of one recommendation set: a two-column grid from tablet width up; on phones a
 * swipeable row that snaps card by card, with the next card peeking in from the right.
 */
export function CardGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx("xp-no-scrollbar mt-2 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0", className)}
      data-testid="card-row"
    >
      {Children.map(children, (child) =>
        child === null || child === undefined || child === false ? null : (
          <div className="flex w-[300px] shrink-0 snap-start sm:w-auto sm:shrink [&>*]:w-full">{child}</div>
        ),
      )}
    </div>
  );
}

export function CardShell({
  children,
  className,
  highlighted,
  ...rest
}: { children: ReactNode; className?: string; highlighted?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "flex flex-col overflow-hidden rounded-2xl border bg-white text-[14px] leading-snug shadow-sm transition-shadow",
        highlighted ? "border-brand shadow-md" : "border-border",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Opens the place sheet on the map when the card's pin has been resolved. */
export function ViewOnMapButton({ pin }: { pin: { place?: unknown; open: () => void } }) {
  if (!pin.place) return null;
  return (
    <button
      type="button"
      onClick={pin.open}
      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-medium transition-colors hover:bg-surface-2"
    >
      <MapPin className="h-3.5 w-3.5" /> View on map
    </button>
  );
}

/**
 * Card image: the Google Places photo of the resolved pin when we have it,
 * otherwise the Wikipedia/gradient fallback while the place is still resolving.
 * With `onOpen` (the pin is known) a tap on the photo opens the place sheet;
 * the buttons laid over it keep their own clicks.
 */
export function CardPhoto({
  place,
  queries,
  alt,
  className,
  children,
  onOpen,
}: {
  place?: ResolvedPlace;
  queries: string[];
  alt: string;
  className?: string;
  children?: ReactNode;
  onOpen?: () => void;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const src = place?.photos?.[0];
  const open = (e: MouseEvent<HTMLElement>) => {
    if (!onOpen || (e.target as HTMLElement).closest("button, a")) return;
    onOpen();
  };
  const openProps = onOpen ? { role: "button" as const, tabIndex: 0, "aria-label": `Open ${alt}`, onClick: open, className: "cursor-pointer" } : {};
  if (src && failed !== src) {
    return (
      <div {...openProps} className={clsx("relative overflow-hidden bg-neutral-200", onOpen && "cursor-pointer", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- proxied Places photo */}
        <img src={src} alt={alt} onError={() => setFailed(src)} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        <PhotoCredit credit={place?.photoCredits?.[0]} />
        {children}
      </div>
    );
  }
  return (
    <div {...openProps} className={clsx("contents", onOpen && "cursor-pointer")}>
      <PlaceImage queries={queries} alt={alt} className={className}>
        {children}
      </PlaceImage>
    </div>
  );
}

/** Opens the trip picker for a resolved place (hidden until the pin is known). */
export function AddToTripButton({ place }: { place?: ResolvedPlace }) {
  const { openAddToTrip } = useUiState();
  const tripId = useTripScope();
  if (!place) return null;
  return (
    <button
      type="button"
      onClick={() => openAddToTrip({ place, tripId: tripId ?? undefined })}
      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-medium transition-colors hover:bg-surface-2"
    >
      <Plus className="h-3.5 w-3.5" /> Add to trip
    </button>
  );
}

export function SectionHeader({
  title,
  subtitle,
  status,
}: {
  title: string;
  subtitle?: string;
  status: ToolCallStatus;
}) {
  const streaming = status === ToolCallStatus.InProgress;
  return (
    <div className="mt-1 flex items-baseline justify-between gap-3">
      <div>
        <div className="text-[15px] font-semibold tracking-tight">{title}</div>
        {subtitle ? <div className="text-[13px] text-muted">{subtitle}</div> : null}
      </div>
      {streaming ? <span className="text-xs text-muted xp-skeleton rounded-full px-2 py-0.5">Finding options…</span> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  // A span (not a div) so skeletons are valid inside <p> while text streams in.
  return <span className={clsx("xp-skeleton block rounded-md", className)} aria-hidden="true" />;
}

export function Text({ value, className, lines = 1 }: { value?: string; className?: string; lines?: number }) {
  if (value === undefined || value === "") {
    return <Skeleton className={clsx("h-4 w-3/4", lines > 1 && "h-9", className)} />;
  }
  return <span className={className}>{value}</span>;
}

export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "warn" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium",
        tone === "neutral" && "bg-surface text-neutral-700",
        tone === "accent" && "bg-emerald-50 text-emerald-700",
        tone === "warn" && "bg-amber-50 text-amber-700",
      )}
    >
      {children}
    </span>
  );
}

/** Amber "Heads-up" chips: the honest downsides of a pick for this traveler. */
export function Tradeoffs({ items }: { items?: (string | undefined)[] }) {
  const list = (items ?? []).filter((t): t is string => typeof t === "string" && t.trim() !== "").slice(0, 3);
  if (list.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Heads-up" data-testid="tradeoffs">
      {list.map((t) => (
        <li key={t} className="inline-flex items-start gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[12px] font-medium text-amber-800">
          <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function ExtLink({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={clsx(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors",
        primary ? "bg-brand text-white hover:bg-brand-hover" : "border border-border bg-white hover:bg-surface",
      )}
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5 opacity-70" />
    </a>
  );
}

export function ActionButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-white px-3 text-[13px] font-medium transition-colors hover:bg-surface"
    >
      {children}
    </button>
  );
}

export function SaveButton({
  kind,
  title,
  subtitle,
  destination,
  url,
  place,
  className,
}: {
  kind: SavedKind;
  title?: string;
  subtitle?: string;
  destination?: string;
  url?: string;
  /** Resolved pin, when known, so the saved item carries coordinates and photos. */
  place?: ResolvedPlace;
  className?: string;
}) {
  const { saved, toggleSaved } = useTravelStore();
  if (!title) return null;
  const active = !!findSaved(saved, { kind, title, refId: place?.id });
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remove ${title} from saved` : `Save ${title}`}
      onClick={() => toggleSaved({ kind, title, subtitle, destination, url: url ?? place?.googleMapsUri, place, refId: place?.id })}
      className={clsx(
        "flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-colors hover:bg-white",
        className,
      )}
    >
      <Heart className={clsx("h-4 w-4", active ? "fill-red-500 text-red-500" : "text-neutral-700")} />
    </button>
  );
}

export function usd(value?: number): string {
  if (value === undefined || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function Stars({ rating }: { rating?: number }) {
  if (rating === undefined) return null;
  return (
    <span className="text-[12px] font-medium text-neutral-700" aria-label={`${rating} out of 5`}>
      ★ {rating.toFixed(1)}
    </span>
  );
}

export function Footer({ children }: { children: ReactNode }) {
  return <div className="mt-auto flex flex-wrap items-center gap-2 px-4 pb-4 pt-1">{children}</div>;
}

export function Body({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col gap-1.5 px-4 pb-2 pt-3">{children}</div>;
}
