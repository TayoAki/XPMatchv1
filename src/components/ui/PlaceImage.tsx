"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { wikipediaSummaryUrl } from "@/lib/travel/links";

const cache = new Map<string, Promise<string | null>>();

async function lookupThumbnail(title: string): Promise<string | null> {
  try {
    const res = await fetch(wikipediaSummaryUrl(title), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail?: { source?: string }; originalimage?: { source?: string } };
    const src = data.thumbnail?.source ?? null;
    // Ask for a larger rendition than the default 320px thumbnail.
    return src ? src.replace(/\/\d+px-/, "/800px-") : null;
  } catch {
    return null;
  }
}

function thumbnailFor(queries: string[]): Promise<string | null> {
  const key = queries.join("|");
  const existing = cache.get(key);
  if (existing) return existing;
  const p = (async () => {
    for (const q of queries) {
      if (!q) continue;
      const hit = await lookupThumbnail(q);
      if (hit) return hit;
    }
    return null;
  })();
  cache.set(key, p);
  return p;
}

const GRADIENTS = [
  "from-amber-200 via-orange-300 to-rose-400",
  "from-sky-200 via-cyan-300 to-blue-500",
  "from-emerald-200 via-teal-300 to-sky-500",
  "from-fuchsia-200 via-purple-300 to-indigo-500",
  "from-lime-200 via-emerald-300 to-teal-500",
  "from-rose-200 via-pink-300 to-red-400",
];

function gradientFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

/**
 * Photo for a place, fetched from Wikipedia's public summary API (no key needed).
 * Falls back to a deterministic gradient when offline or when nothing matches.
 */
export function PlaceImage({
  queries,
  alt,
  className,
  children,
}: {
  queries: string[];
  alt: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const key = queries.filter(Boolean).join("|");
  const [resolved, setResolved] = useState<{ key: string; url: string | null }>({ key: "", url: null });

  useEffect(() => {
    if (!key) return;
    let active = true;
    thumbnailFor(key.split("|")).then((url) => {
      if (active) setResolved({ key, url });
    });
    return () => {
      active = false;
    };
  }, [key]);

  const src = resolved.key === key ? resolved.url : null;

  return (
    <div className={clsx("relative overflow-hidden bg-gradient-to-br", gradientFor(key || alt), className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote images from Wikipedia, no optimizer needed
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      ) : null}
      {children}
    </div>
  );
}
