"use client";

import clsx from "clsx";
import type { PhotoCredit as Credit } from "@/lib/places/types";

/** The tooltip text for thumbnails too small to carry a visible credit line. */
export function photoCreditTitle(credit?: Credit): string | undefined {
  return credit ? `Photo: ${credit.name}` : undefined;
}

/**
 * Google's author attribution for a Places photo, laid over the photo's corner.
 * Rendered wherever a proxied Places photo is large enough to read it; thumbnails carry
 * the same text as a tooltip through `photoCreditTitle`. `asLink` is off inside buttons,
 * where a nested anchor would be invalid.
 */
export function PhotoCredit({ credit, className, asLink = true }: { credit?: Credit; className?: string; asLink?: boolean }) {
  if (!credit) return null;
  const text = `Photo: ${credit.name}`;
  // No backdrop blur: it puts the chip on its own compositing layer, which can show through the
  // back of a flipped card (the destination card) as mirrored text.
  const base = clsx(
    "pointer-events-auto absolute z-[1] max-w-[70%] truncate rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] leading-4 text-white/95",
    className ?? "bottom-1.5 left-1.5",
  );
  if (asLink && credit.uri) {
    return (
      <a href={credit.uri} target="_blank" rel="noreferrer noopener" className={clsx(base, "hover:bg-black/60 hover:underline")} onClick={(e) => e.stopPropagation()} data-testid="photo-credit">
        {text}
      </a>
    );
  }
  return (
    <span className={base} data-testid="photo-credit">
      {text}
    </span>
  );
}
