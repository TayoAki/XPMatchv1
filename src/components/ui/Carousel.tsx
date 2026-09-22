"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFlip } from "@/lib/use-flip";

/**
 * A horizontal, snap-scrolling row with arrow buttons on pointer devices and soft edge fades.
 * The arrows page by most of the visible width and disable at either end; touch screens just
 * swipe. Children set their own width and `snap-start`. `testId` lands on the scroller.
 *
 * `bleed` lets the row run into the page gutter (Discover); off, it stays inside its column
 * with the arrows tucked in (a chat message). Children carrying `data-flip-key` glide to their
 * new spot whenever `flipKey` changes (see `useFlip`).
 */
export function Carousel({
  children,
  label,
  className,
  itemGap = "gap-4",
  testId,
  bleed = true,
  flipKey = "",
}: {
  children: ReactNode;
  label: string;
  className?: string;
  itemGap?: string;
  testId?: string;
  bleed?: boolean;
  flipKey?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  useFlip(ref, flipKey);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft >= max - 2 });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro?.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure, children]);

  const page = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  };

  const arrow = "absolute top-1/2 z-[2] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white/95 text-foreground shadow-floating backdrop-blur transition-all duration-200 hover:bg-white hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-0 pointer-fine:flex";

  return (
    <div className={clsx("group/carousel relative", className)}>
      <div
        ref={ref}
        role="region"
        aria-label={label}
        data-testid={testId}
        className={clsx("xp-no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-1 pt-1", bleed ? "-mx-4 px-4 sm:-mx-1 sm:px-1" : "-mx-0.5 px-0.5", itemGap)}
        style={{ maskImage: !edges.start || !edges.end ? `linear-gradient(to right, ${edges.start ? "black" : "transparent"} 0, black 32px, black calc(100% - 32px), ${edges.end ? "black" : "transparent"} 100%)` : undefined }}
      >
        {children}
      </div>
      <button type="button" onClick={() => page(-1)} aria-label={`Scroll ${label} left`} disabled={edges.start} className={clsx(arrow, bleed ? "-left-3" : "left-1")}>
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button type="button" onClick={() => page(1)} aria-label={`Scroll ${label} right`} disabled={edges.end} className={clsx(arrow, bleed ? "-right-3" : "right-1")}>
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
