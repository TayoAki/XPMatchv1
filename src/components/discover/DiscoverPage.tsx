"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { useTravelStore } from "@/lib/store";
import { useMediaQuery } from "@/lib/use-media-query";
import { COLLECTIONS, DEFAULT_HERO_DESTINATION } from "@/lib/travel/collections";
import { HomePicks, focusOptions } from "@/components/panel/HomePicks";
import { JumpBackIn } from "@/components/panel/DiscoveryPanel";
import { DiscoverHero } from "./DiscoverHero";
import { CollectionCard } from "./CollectionCard";
import { CommunityGuides } from "./CommunityGuides";

/**
 * Home: the hero (prompt, planner fields, the destination photo), three themed collections,
 * the personalized picks for the destination in focus, Jump back in and the newest community
 * guides, all in one scroll container under the header.
 */
export function DiscoverPage() {
  const { profile, planner, trips, hydrated } = useTravelStore();
  const md = useMediaQuery("(min-width: 768px)");
  const phone = !useMediaQuery("(min-width: 640px)");
  const homeCity = profile.homeCity.trim();

  const picks = useMemo(
    () => focusOptions({ trips, nextDestination: profile.nextDestination, nextWhen: profile.nextWhen, plannerWhere: planner.where, homeCity }),
    [trips, profile.nextDestination, profile.nextWhen, planner.where, homeCity],
  );
  // The hero follows the traveler (next trip, dream destination, planner, home) and waits for the
  // profile so the default destination is not looked up for nothing.
  const heroDestination = hydrated ? picks.options[0]?.destination ?? DEFAULT_HERO_DESTINATION : null;

  return (
    <div className="xp-scroll h-full overflow-y-auto" data-testid="discover-page">
      <DiscoverHero destination={heroDestination} phoneQuiz={phone && hydrated && !profile.onboarded} />

      <div className="mx-auto max-w-[1720px] px-4 pb-28 sm:px-6 lg:px-9">
        <section className="mt-10 md:mt-12" data-testid="collections">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.035em] md:text-[34px]">Find your kind of extraordinary</h2>
            <Link href="/explore" className="inline-flex items-center gap-1 text-[15px] font-medium text-foreground underline-offset-4 hover:underline">
              View all destinations <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-5 grid gap-[15px] md:grid-cols-2 xl:grid-cols-3">
            {COLLECTIONS.map((c) => (
              <CollectionCard key={c.key} collection={c} />
            ))}
          </div>
        </section>

        <div className="mt-6 md:mt-8">
          <HomePicks options={picks.options} initialKey={picks.initialKey} compact={!md} />
        </div>

        <JumpBackIn compact={!md} />

        <CommunityGuides />
      </div>
    </div>
  );
}
