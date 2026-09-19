"use client";

import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import clsx from "clsx";
import { X } from "lucide-react";

export type SheetSnap = "peek" | "half" | "full";

/** Sheet height as a share of the viewport per snap point (the peek shows the header only). */
const SNAP_HEIGHT: Record<SheetSnap, string> = { peek: "120px", half: "56dvh", full: "calc(100dvh - 12px)" };
const SNAP_ORDER: SheetSnap[] = ["peek", "half", "full"];

/**
 * Phone bottom sheet: slides up over the page, snaps to peek / half / full, drags by its
 * handle, closes with the backdrop, Escape or the close button. Stacked sheets (a place over
 * the map) sit one z-layer higher and dim the one below.
 */
export function BottomSheet({
  open,
  onClose,
  snap: controlledSnap,
  onSnapChange,
  initialSnap = "half",
  title,
  header,
  stacked = false,
  testId,
  label,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  snap?: SheetSnap;
  onSnapChange?: (snap: SheetSnap) => void;
  initialSnap?: SheetSnap;
  title?: ReactNode;
  /** Replaces the default title row (the handle and close button stay). */
  header?: ReactNode;
  stacked?: boolean;
  testId?: string;
  /** Accessible name when the title is not plain text. */
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  const [ownSnap, setOwnSnap] = useState<SheetSnap>(initialSnap);
  const snap = controlledSnap ?? ownSnap;
  const setSnap = (next: SheetSnap) => {
    if (controlledSnap === undefined) setOwnSnap(next);
    onSnapChange?.(next);
  };
  // A drag starts only after the pointer travels a few pixels, so taps on the handle, the title row
  // and the close button stay ordinary clicks (pointer capture would otherwise swallow them).
  const dragRef = useRef<{ startY: number; dy: number; captured: boolean } | null>(null);
  const [drag, setDrag] = useState<{ offset: number } | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { startY: e.clientY, dy: 0, captured: false };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    d.dy = e.clientY - d.startY;
    if (!d.captured && Math.abs(d.dy) > 6) {
      d.captured = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (d.captured) setDrag({ offset: Math.max(0, d.dy) });
  };
  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d?.captured) return;
    setDrag(null);
    // A short flick steps one snap; a long pull past the peek closes.
    const index = SNAP_ORDER.indexOf(snap);
    if (d.dy > 40) {
      if (snap === "peek" || d.dy > 260) onClose();
      else setSnap(SNAP_ORDER[index - 1]);
    } else if (d.dy < -40 && index < SNAP_ORDER.length - 1) {
      setSnap(SNAP_ORDER[index + 1]);
    }
  };
  const cycle = () => setSnap(snap === "full" ? "half" : snap === "half" ? "full" : "half");

  const offset = drag?.offset ?? 0;
  return (
    // The frame lets pointer events through so a peeking sheet leaves the page usable underneath.
    <div className={clsx("pointer-events-none fixed inset-0 flex flex-col justify-end", stacked ? "z-[60]" : "z-50")} data-testid={testId ? `${testId}-root` : undefined}>
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className={clsx("absolute inset-0 bg-black/30 transition-opacity", snap === "peek" && !stacked ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100")}
      />
      <div
        role="dialog"
        aria-modal={snap !== "peek"}
        aria-label={label}
        aria-labelledby={label ? undefined : typeof title === "string" ? titleId : undefined}
        data-testid={testId}
        data-snap={snap}
        style={{ height: SNAP_HEIGHT[snap], transform: offset ? `translateY(${offset}px)` : undefined, transition: drag ? "none" : "height 220ms ease, transform 220ms ease" }}
        className={clsx("pointer-events-auto relative flex max-h-[100dvh] w-full flex-col rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.18)] pb-[env(safe-area-inset-bottom)]", className)}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            dragRef.current = null;
            setDrag(null);
          }}
          className="flex shrink-0 cursor-grab touch-none select-none flex-col active:cursor-grabbing"
        >
          <button type="button" onClick={cycle} aria-label={snap === "full" ? "Shrink" : "Expand"} className="mx-auto mt-2 h-6 w-16 shrink-0 rounded-full">
            <span className="mx-auto block h-1.5 w-10 rounded-full bg-neutral-300" />
          </button>
          <div className="flex min-h-[40px] items-center gap-2 px-4 pb-2">
            {header ?? (
              <div id={titleId} className="min-w-0 flex-1 truncate text-[16px] font-semibold">
                {title}
              </div>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-neutral-700 hover:bg-surface-2">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className={clsx("min-h-0 flex-1", snap === "peek" && "overflow-hidden")}>{children}</div>
      </div>
    </div>
  );
}
