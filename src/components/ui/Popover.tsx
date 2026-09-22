"use client";

import { useEffect, useRef, type ReactNode } from "react";
import clsx from "clsx";

/**
 * A small panel anchored under its trigger (the parent must be `relative`): a labeled dialog
 * that takes focus when it opens and closes on Escape. Outside clicks are the parent's call,
 * so the trigger can toggle without fighting the panel.
 */
export function Popover({
  open,
  onClose,
  id,
  title,
  align = "left",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  id: string;
  title: string;
  align?: "left" | "right";
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const first = ref.current?.querySelector<HTMLElement>("input, select, textarea, button:not([data-popover-close])");
    first?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      id={id}
      role="dialog"
      aria-label={title}
      className={clsx("xp-pop absolute top-[calc(100%+8px)] z-40 w-[320px] rounded-2xl border border-border bg-white p-4 shadow-floating", align === "right" ? "xp-pop--right right-0" : "left-0", className)}
    >
      <div className="mb-3 text-[15px] font-semibold">{title}</div>
      {children}
    </div>
  );
}
