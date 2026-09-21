"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import type { Guide } from "@/lib/types";
import { GuideCard } from "@/components/guides/GuideCard";

/** The three newest published community guides; the section disappears while there are none. */
export function CommunityGuides() {
  const [guides, setGuides] = useState<Guide[] | null>(null);

  useEffect(() => {
    let active = true;
    api<{ guides: Guide[] }>("/api/guides")
      .then((data) => active && setGuides(data.guides.filter((g) => g.published).slice(0, 3)))
      .catch(() => active && setGuides([]));
    return () => {
      active = false;
    };
  }, []);

  if (guides && guides.length === 0) return null;

  return (
    <section className="mt-14" data-testid="community-guides">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.035em] md:text-[34px]">From the community</h2>
        <Link href="/inspiration" className="inline-flex items-center gap-1 text-[15px] font-medium text-foreground underline-offset-4 hover:underline">
          All guides <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      {guides === null ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="xp-skeleton aspect-[16/11] rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {guides.map((g) => (
            <GuideCard key={g.id} guide={g} />
          ))}
        </div>
      )}
    </section>
  );
}
