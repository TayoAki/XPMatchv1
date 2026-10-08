"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Pause, Play } from "lucide-react";
import { Chip, Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { CityInput } from "@/components/onboarding/CityInput";
import { PlaceList } from "@/components/onboarding/PlaceList";
import { useSamples } from "@/components/onboarding/useSamples";
import { useAppConfig } from "@/lib/app-config";
import { useMediaQuery } from "@/lib/use-media-query";
import { TRAVEL_STYLE_OPTIONS } from "@/lib/travel/inspiration";
import { DEALBREAKER_OPTIONS, type TravelerProfile } from "@/lib/store";
import {
  BUDGET_OPTIONS,
  CUISINES,
  DAY_RHYTHM_OPTIONS,
  DIETARY_TAGS,
  FLIGHT_OPTIONS,
  FOOD_ADVENTURE_OPTIONS,
  INTERESTS,
  LOYALTY_PROGRAMS,
  PERSONALITY_OPTIONS,
  SPLURGE_OPTIONS,
  STAY_MUST_HAVES,
  STAY_TYPES,
  TRANSPORT_OPTIONS,
  VOICE_OPTIONS,
  WALKING_OPTIONS,
  offered,
} from "@/lib/profile/options";

/**
 * The sections of "Update my assistant": everything onboarding asked (and a few things only
 * asked here, like the home airport and dealbreakers), stacked. Every section edits the same
 * draft profile through `set`.
 */

export type SectionKey = "about" | "voice" | "style" | "stays" | "food" | "places" | "logistics" | "dealbreakers";

export const SECTIONS: { key: SectionKey; title: string; blurb: string }[] = [
  { key: "about", title: "About you", blurb: "Where you start from and who comes along." },
  { key: "voice", title: "Voice & tone", blurb: "How your assistant sounds and how it talks to you." },
  { key: "style", title: "Style & interests", blurb: "Budget, what you splurge on and what you love doing." },
  { key: "stays", title: "Where you stay", blurb: "The kind of place you sleep well in, and the points you collect." },
  { key: "food", title: "How you eat", blurb: "Restaurants you like, needs and how adventurous you are." },
  { key: "places", title: "Places & next trip", blurb: "Where you’ve loved, where you want to go, and what’s next." },
  { key: "logistics", title: "Getting around", blurb: "Your rhythm, how far you walk, how you get around and fly." },
  { key: "dealbreakers", title: "Dealbreakers & notes", blurb: "What ruins a trip, and anything else to remember." },
];

export interface SectionProps {
  draft: TravelerProfile;
  set: <K extends keyof TravelerProfile>(key: K, value: TravelerProfile[K]) => void;
  dealbreakers: string[];
  toggleDealbreaker: (statement: string) => void;
}

const toggleIn = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

/** The chips offered, plus anything picked that is no longer offered (an earlier answer, their own words), so it can be removed. */
const withPicked = (options: readonly string[], picked: string[]) => [...options, ...picked.filter((v) => !options.includes(v))];

/** Phones show this many chips before a "Show all" fold; chosen ones always stay visible. */
const FOLD_AT = 8;

function ChipGroup({ label, hint, options, value, onToggle, testId }: { label: string; hint?: string; options: readonly string[]; value: string[]; onToggle: (v: string) => void; testId?: string }) {
  const phone = !useMediaQuery("(min-width: 640px)");
  const [expanded, setExpanded] = useState(false);
  const folded = phone && !expanded && options.length > FOLD_AT;
  const shown = folded ? options.filter((o, i) => i < FOLD_AT || value.includes(o)) : options;
  const hidden = options.length - shown.length;
  return (
    <div>
      <div className="mb-1 text-[13px] font-medium">{label}</div>
      {hint ? <p className="mb-2 text-[12px] text-muted">{hint}</p> : null}
      <div className="flex flex-wrap gap-2" data-testid={testId} role="group" aria-label={label}>
        {shown.map((o) => (
          <Chip key={o} active={value.includes(o)} onClick={() => onToggle(o)}>
            {o}
          </Chip>
        ))}
        {folded && hidden > 0 ? (
          <Chip onClick={() => setExpanded(true)} className="border-dashed text-neutral-600">
            Show all (+{hidden})
          </Chip>
        ) : null}
      </div>
    </div>
  );
}

function OptionCards<T extends string>({ label, options, value, onChange, columns = 3 }: { label: string; options: { value: T; label: string; hint: string }[]; value: T; onChange: (v: T) => void; columns?: 1 | 3 }) {
  return (
    <div>
      <div className="mb-2 text-[13px] font-medium">{label}</div>
      <div className={clsx("grid gap-2", columns === 3 && "sm:grid-cols-3")} role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={clsx("rounded-2xl border px-3 py-2.5 text-left transition-colors", value === o.value ? "border-brand bg-brand text-white" : "border-border bg-white hover:bg-surface")}
          >
            <span className="block text-[13px] font-semibold">{o.label}</span>
            <span className={clsx("block text-[12px]", value === o.value ? "text-white/80" : "text-muted")}>{o.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Stack({ children }: { children: ReactNode }) {
  return <div className="grid gap-5">{children}</div>;
}

export function AboutSection({ draft, set }: SectionProps) {
  return (
    <Stack>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name">
          <TextInput value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Tayo" />
        </Field>
        <div>
          <label htmlFor="settings-home" className="mb-1.5 block text-[13px] font-medium text-foreground">
            Home city
          </label>
          <CityInput id="settings-home" compact scope="home" label="Home city" placeholder="Austell, GA" value={draft.homeCity} onChange={(v) => set("homeCity", v)} />
        </div>
        <Field label="Home airport" hint="IATA code, used as the default flight origin">
          <TextInput value={draft.homeAirport} onChange={(e) => set("homeAirport", e.target.value.toUpperCase())} placeholder="ATL" maxLength={4} />
        </Field>
        <Field label="Usually travel with">
          <Select value={draft.companions} onChange={(e) => set("companions", e.target.value as TravelerProfile["companions"])}>
            <option value="solo">Solo</option>
            <option value="partner">Couple</option>
            <option value="family">Family</option>
            <option value="friends">Friends</option>
            <option value="mixed">It varies</option>
          </Select>
        </Field>
      </div>
    </Stack>
  );
}

export function VoiceSection({ draft, set }: SectionProps) {
  const config = useAppConfig();
  const samples = useSamples();
  return (
    <Stack>
      {config?.voice ? (
        <div>
          <div className="mb-2 text-[13px] font-medium">Voice</div>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Voice">
            {VOICE_OPTIONS.map((o) => {
              const selected = draft.voice === o.name;
              const playing = samples.playing === o.name;
              return (
                <div key={o.name} className="relative">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => set("voice", o.name)}
                    className={clsx("flex h-11 w-full items-center gap-2 rounded-2xl border pl-3.5 pr-12 text-left transition-colors", selected ? "border-brand bg-brand text-white" : "border-border bg-white hover:bg-surface")}
                  >
                    <span className="text-[13px] font-semibold">{o.name}</span>
                    <span className={clsx("text-[12px]", selected ? "text-white/80" : "text-muted")}>{o.hint}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => samples.toggle(o.name)}
                    aria-label={playing ? `Stop the ${o.name} sample` : `Play a sample of ${o.name}`}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-foreground hover:bg-surface"
                  >
                    {playing ? <Pause className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" aria-hidden="true" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      <OptionCards label="Personality" options={PERSONALITY_OPTIONS} value={draft.personality} onChange={(v) => set("personality", v)} />
    </Stack>
  );
}

export function StyleSection({ draft, set }: SectionProps) {
  return (
    <Stack>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Typical budget">
          <Select value={draft.budgetTier} onChange={(e) => set("budgetTier", e.target.value as TravelerProfile["budgetTier"])}>
            {BUDGET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.sign} {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Pace">
          <Select value={draft.pace} onChange={(e) => set("pace", e.target.value as TravelerProfile["pace"])}>
            <option value="relaxed">Relaxed — a couple of things a day</option>
            <option value="balanced">Balanced</option>
            <option value="packed">Packed — see it all</option>
          </Select>
        </Field>
      </div>
      <ChipGroup label="Sometimes splurge on" options={withPicked(SPLURGE_OPTIONS, draft.splurges)} value={draft.splurges} onToggle={(v) => set("splurges", toggleIn(draft.splurges, v))} testId="splurge-chips" />
      <ChipGroup label="Travel style" options={withPicked(TRAVEL_STYLE_OPTIONS, draft.travelStyles)} value={draft.travelStyles} onToggle={(v) => set("travelStyles", toggleIn(draft.travelStyles, v))} testId="style-chips" />
      <ChipGroup
        label="How you like to have fun"
        hint="Pick as many as fit. These drive the things-to-do picks and every itinerary."
        options={withPicked(offered(INTERESTS), draft.interests)}
        value={draft.interests}
        onToggle={(v) => set("interests", toggleIn(draft.interests, v))}
        testId="interest-chips"
      />
    </Stack>
  );
}

export function StaysSection({ draft, set }: SectionProps) {
  return (
    <Stack>
      <ChipGroup label="Accommodation style" hint="Where you sleep well." options={withPicked(offered(STAY_TYPES), draft.stayTypes)} value={draft.stayTypes} onToggle={(v) => set("stayTypes", toggleIn(draft.stayTypes, v))} testId="stay-type-chips" />
      <ChipGroup
        label="Hotel loyalty programs"
        hint="Hotels that earn your points get a boost in the match score."
        options={withPicked(offered(LOYALTY_PROGRAMS), draft.loyaltyPrograms)}
        value={draft.loyaltyPrograms}
        onToggle={(v) => set("loyaltyPrograms", toggleIn(draft.loyaltyPrograms, v))}
        testId="loyalty-chips"
      />
      <ChipGroup label="Must-haves" options={withPicked(offered(STAY_MUST_HAVES), draft.stayMustHaves)} value={draft.stayMustHaves} onToggle={(v) => set("stayMustHaves", toggleIn(draft.stayMustHaves, v))} testId="must-have-chips" />
      <Field label="Anything else about stays" hint="Free text the assistant reads word for word">
        <TextInput value={draft.accommodation} onChange={(e) => set("accommodation", e.target.value)} placeholder="Boutique hotels, walkable areas" />
      </Field>
    </Stack>
  );
}

export function FoodSection({ draft, set }: SectionProps) {
  return (
    <Stack>
      <ChipGroup label="Restaurants you like" options={withPicked(offered(CUISINES), draft.cuisines)} value={draft.cuisines} onToggle={(v) => set("cuisines", toggleIn(draft.cuisines, v))} testId="cuisine-chips" />
      <ChipGroup label="Dietary needs" options={withPicked(offered(DIETARY_TAGS), draft.dietaryTags)} value={draft.dietaryTags} onToggle={(v) => set("dietaryTags", toggleIn(draft.dietaryTags, v))} testId="dietary-chips" />
      <Field label="More on food" hint="Allergies, dislikes, anything specific">
        <TextInput value={draft.dietary} onChange={(e) => set("dietary", e.target.value)} placeholder="Vegetarian, no shellfish…" />
      </Field>
      <OptionCards label="How adventurous?" options={FOOD_ADVENTURE_OPTIONS} value={draft.foodAdventure} onChange={(v) => set("foodAdventure", v)} />
    </Stack>
  );
}

export function PlacesSection({ draft, set }: SectionProps) {
  const trip = draft.tripInMind === "yes";
  return (
    <Stack>
      <PlaceList compact title="Favorite places you’ve been" values={draft.placesBeen} onChange={(v) => set("placesBeen", v)} testId="settings-places-been" />
      <PlaceList compact title="Places you want to go" values={draft.placesWant} onChange={(v) => set("placesWant", v)} testId="settings-places-want" />
      <div>
        <div className="mb-2 text-[13px] font-medium">A trip in mind right now?</div>
        <div className="flex gap-2" role="radiogroup" aria-label="A trip in mind right now?">
          <Chip active={trip} onClick={() => set("tripInMind", "yes")}>
            Yes
          </Chip>
          <Chip active={draft.tripInMind === "no"} onClick={() => set("tripInMind", "no")}>
            Not right now
          </Chip>
        </div>
      </div>
      {trip ? (
        <>
          <Field label="About the trip">
            <TextArea value={draft.nextNotes} maxLength={2000} onChange={(e) => set("nextNotes", e.target.value)} placeholder="Somewhere warm in March, a long weekend with friends…" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-trip-where" className="mb-1.5 block text-[13px] font-medium text-foreground">
                Where
              </label>
              <CityInput id="settings-trip-where" compact scope="any" label="Where" placeholder="City, region or country" value={draft.nextDestination} onChange={(v) => set("nextDestination", v)} />
            </div>
            <Field label="People going">
              <Select value={String(draft.nextTravelers)} onChange={(e) => set("nextTravelers", Number(e.target.value))}>
                <option value="0">Not sure yet</option>
                {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="From">
              <TextInput type="date" value={draft.nextStartDate} onChange={(e) => set("nextStartDate", e.target.value)} />
            </Field>
            <Field label="To">
              <TextInput type="date" value={draft.nextEndDate} min={draft.nextStartDate || undefined} onChange={(e) => set("nextEndDate", e.target.value)} />
            </Field>
          </div>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Where are you dreaming of going next?" hint="Your home page lines up picks for it">
            <TextInput value={draft.nextDestination} onChange={(e) => set("nextDestination", e.target.value)} placeholder="Rome, Italy" />
          </Field>
          <Field label="Roughly when?">
            <TextInput value={draft.nextWhen} onChange={(e) => set("nextWhen", e.target.value)} placeholder="October" />
          </Field>
        </div>
      )}
    </Stack>
  );
}

export function LogisticsSection({ draft, set }: SectionProps) {
  return (
    <Stack>
      <OptionCards label="Your rhythm" options={DAY_RHYTHM_OPTIONS} value={draft.dayRhythm} onChange={(v) => set("dayRhythm", v)} />
      <OptionCards label="Walking" options={WALKING_OPTIONS} value={draft.walking} onChange={(v) => set("walking", v)} />
      <OptionCards label="Getting around" options={TRANSPORT_OPTIONS} value={draft.transport} onChange={(v) => set("transport", v)} />
      <OptionCards label="Flights" options={FLIGHT_OPTIONS} value={draft.flightPreference} onChange={(v) => set("flightPreference", v)} />
    </Stack>
  );
}

export function DealbreakersSection({ draft, set, dealbreakers, toggleDealbreaker }: SectionProps) {
  return (
    <Stack>
      <div>
        <div className="mb-1 text-[13px] font-medium">What ruins a trip for you?</div>
        <p className="mb-2 text-[12px] text-muted">Dealbreakers. Every recommendation is checked against them and any conflict is called out on the card.</p>
        <div className="flex flex-wrap gap-2" data-testid="dealbreaker-chips">
          {DEALBREAKER_OPTIONS.map((o) => (
            <Chip key={o.statement} active={dealbreakers.includes(o.statement)} onClick={() => toggleDealbreaker(o.statement)}>
              {o.statement}
            </Chip>
          ))}
        </div>
      </div>
      <Field label="Anything else the assistant should remember?">
        <TextArea value={draft.notes} maxLength={2000} onChange={(e) => set("notes", e.target.value)} placeholder="I love rooftop bars, hate early flights, collecting Marriott points…" />
      </Field>
    </Stack>
  );
}

export const SECTION_COMPONENT: Record<SectionKey, (props: SectionProps) => ReactNode> = {
  about: AboutSection,
  voice: VoiceSection,
  style: StyleSection,
  stays: StaysSection,
  food: FoodSection,
  places: PlacesSection,
  logistics: LogisticsSection,
  dealbreakers: DealbreakersSection,
};
