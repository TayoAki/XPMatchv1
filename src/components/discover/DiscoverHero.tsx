"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useTravelStore } from "@/lib/store";
import { useDestinationPlace } from "@/lib/places/destination-photo";
import { useUiState } from "@/components/providers/UiState";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { buildPlanPrompt } from "@/components/profile/TripPlannerDialog";
import { useDiscoveryFocus } from "@/components/panel/DiscoveryPanel";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { PhoneQuiz } from "@/components/chat/PhoneQuiz";
import { PromptComposer } from "./PromptComposer";
import { PlannerFields } from "./PlannerFields";
import { HeroImage } from "./HeroImage";

/**
 * The Discover hero: eyebrow, headline, serif subtitle, the prompt composer with three quiet
 * suggestion chips, the four planner fields and the CTA row on the warm panel; the destination
 * photograph beside it (below it on narrower screens). A phone that has not been onboarded gets
 * the three-question quiz in place of the copy until it is answered.
 */
export function DiscoverHero({ destination, phoneQuiz }: { destination: string | null; phoneQuiz: boolean }) {
  const router = useRouter();
  const send = useSendMessage();
  const { openPlanner } = useUiState();
  const { planner, profile } = useTravelStore();
  const focus = useDiscoveryFocus();
  const { place, loading } = useDestinationPlace(destination);
  const homeCity = profile.homeCity.trim();

  const chips = focus
    ? [
        { label: "Find hotels", prompt: `Find hotels in ${focus.destination} for my trip that fit my budget.` },
        { label: "Top things to do", prompt: `What are the top things to do in ${focus.destination} for me?` },
        { label: "Neighborhood guide", prompt: `Give me a neighborhood guide for ${focus.destination}: where to stay, eat and wander.` },
      ]
    : [
        { label: "Weekend ideas", prompt: `Suggest weekend getaway destinations for me${homeCity ? ` from ${homeCity}` : ""}.` },
        { label: "Plan a trip", prompt: "Help me plan a trip. Start by suggesting destinations that fit my profile." },
        { label: "Find cheap flights", prompt: `Where can I fly cheaply${profile.homeAirport ? ` from ${profile.homeAirport}` : ""} next month?` },
      ];

  const chatWithConcierge = () => {
    if (planner.where.trim()) void send(buildPlanPrompt(planner));
    else router.push("/chat");
  };

  return (
    // z-10 keeps the field editors above the sections that follow.
    <section className="relative z-10 bg-surface-warm lg:grid lg:grid-cols-[minmax(0,0.473fr)_minmax(0,0.527fr)]" data-testid="discover-hero">
      <div className="flex flex-col justify-center px-4 pb-8 pt-9 sm:px-8 lg:px-[60px] lg:py-10">
        <div className="mx-auto w-full max-w-[640px] lg:mx-0">
          {phoneQuiz ? (
            <div className="rounded-3xl border border-border bg-white p-4" data-testid="hero-quiz">
              <PhoneQuiz />
            </div>
          ) : (
            <>
              {/* The copy lifts in line by line on arrival. */}
              <Reveal immediate>
                <p className="text-[12px] font-semibold uppercase tracking-[0.3em] text-muted">Travel, at your pace</p>
              </Reveal>
              <Reveal immediate delay={70}>
                <h1 className="mt-3 text-[clamp(2.5rem,3.8vw,3.875rem)] font-semibold leading-[1.04] tracking-[-0.045em] text-foreground">
                  Go somewhere <br className="hidden lg:block" />
                  that stays with you.
                </h1>
              </Reveal>
              <Reveal immediate delay={140}>
                <p className="mt-3 font-serif text-[clamp(1.125rem,1.5vw,1.5rem)] leading-[1.4] text-muted">Thoughtful journeys, shaped around you.</p>
              </Reveal>
              <Reveal immediate delay={220} className="mt-5">
                <PromptComposer onSend={send} />
              </Reveal>
              {/* Phones scroll the chips sideways; wider screens wrap them. */}
              <Reveal immediate delay={290} className="xp-no-scrollbar -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
                <div className="contents" data-testid="hero-chips">
                  {chips.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => void send(chip.prompt)}
                      className="h-8 shrink-0 rounded-full border border-border bg-white px-3.5 text-[13px] font-medium text-foreground transition-all duration-200 hover:-translate-y-px hover:bg-surface active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </Reveal>
              <Reveal immediate delay={360} className="mt-3">
                <PlannerFields />
              </Reveal>
              <Reveal immediate delay={430} className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Button size="lg" onClick={() => openPlanner("where")} className="h-[52px] px-6 text-[15px] hover:-translate-y-0.5">
                  Create a trip <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                <button
                  type="button"
                  onClick={chatWithConcierge}
                  className="text-[15px] font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  or chat with your AI concierge
                </button>
              </Reveal>
            </>
          )}
        </div>
      </div>
      <HeroImage
        destination={destination ?? ""}
        place={place}
        loading={loading || !destination}
        className="mx-4 mb-6 aspect-[4/3] rounded-[12px] sm:mx-8 md:aspect-video lg:m-0 lg:aspect-auto lg:min-h-[535px] lg:rounded-none"
      />
    </section>
  );
}
