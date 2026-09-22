"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

/** Puts the panel under the anchor's left edge, or above it when there is no room below, inside the viewport. */
function position(anchor: HTMLElement, panel: HTMLElement) {
  const r = anchor.getBoundingClientRect();
  const margin = 8;
  const gap = 6;
  const w = panel.offsetWidth;
  const h = panel.offsetHeight;
  const left = Math.max(margin, Math.min(r.left, window.innerWidth - w - margin));
  const up = r.bottom + gap + h > window.innerHeight - margin && r.top - gap - h >= margin;
  const top = up ? r.top - gap - h : r.bottom + gap;
  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.round(top)}px`;
  panel.style.transformOrigin = up ? "bottom left" : "top left";
}

/**
 * A small panel that floats over everything, anchored to a trigger. It renders at the document
 * root, so a scrolling row or the chat can never clip it; it opens under the anchor's left edge
 * (above it when there is no room below, nudged in from the viewport edges), follows scrolls
 * and resizes, and closes on Escape or a press outside it and its anchor.
 */
export function Floating({
  anchor,
  open,
  onClose,
  label,
  role = "dialog",
  width = 280,
  className,
  children,
}: {
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  label: string;
  /** A dialog holds controls; a tooltip is read-only text that hover or a tap reveals. */
  role?: "dialog" | "tooltip";
  width?: number;
  className?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const a = anchor.current;
    const p = panelRef.current;
    if (a && p) position(a, p);
  }, [open, anchor]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => {
      const a = anchor.current;
      const p = panelRef.current;
      if (a && p) position(a, p);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchor.current?.contains(t)) return;
      onClose();
    };
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, onClose, anchor]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={panelRef}
      role={role}
      aria-label={label}
      style={{ width }}
      className={clsx("xp-pop fixed left-0 top-0 z-[90] max-w-[calc(100vw-16px)] rounded-2xl border border-border bg-white p-3 text-left shadow-floating", className)}
    >
      {children}
    </div>,
    document.body,
  );
}
