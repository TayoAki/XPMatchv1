"use client";

import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { ExternalLink, Heart, MapPin } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import { useTravelStore, type SavedKind } from "@/lib/store";

export function CardGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("mt-2 grid gap-3 sm:grid-cols-2", className)}>{children}</div>;
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
        highlighted ? "border-neutral-900 shadow-md" : "border-border",
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
  return <div className={clsx("xp-skeleton rounded-md", className)} aria-hidden="true" />;
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

export function ExtLink({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={clsx(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors",
        primary ? "bg-neutral-900 text-white hover:bg-neutral-800" : "border border-border bg-white hover:bg-surface",
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
  className,
}: {
  kind: SavedKind;
  title?: string;
  subtitle?: string;
  destination?: string;
  url?: string;
  className?: string;
}) {
  const { saved, toggleSaved } = useTravelStore();
  if (!title) return null;
  const active = saved.some((s) => s.kind === kind && s.title.toLowerCase() === title.toLowerCase());
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remove ${title} from saved` : `Save ${title}`}
      onClick={() => toggleSaved({ kind, title, subtitle, destination, url })}
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
