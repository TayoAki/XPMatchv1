"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { Chip, Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { TRAVEL_STYLE_OPTIONS } from "@/lib/travel/inspiration";
import { DEALBREAKER_OPTIONS, type TravelerProfile } from "@/lib/store";
import {
  CUISINES,
  DAY_RHYTHM_OPTIONS,
  DIETARY_TAGS,
  FLIGHT_OPTIONS,
  FOOD_ADVENTURE_OPTIONS,
  INTERESTS,
  STAY_MUST_HAVES,
  STAY_TYPES,
  TRANSPORT_OPTIONS,
  WALKING_OPTIONS,
} from "@/lib/profile/options";

/**
 * The sections of the in-depth onboarding. The first-run wizard shows one per
 * step; "Update my assistant" stacks them all. Every section edits the same
 * draft profile through `set`.
 */

export type SectionKey = "about" | "style" | "stays" | "food" | "logistics" | "dealbreakers";

export const SECTIONS: { key: SectionKey; title: string; blurb: string }[] = [
  { key: "about", title: "About you", blurb: "Where you start from and who comes along." },
  { key: "style", title: "Style & interests", blurb: "Pace, budget and what you actually like doing." },
  { key: "stays", title: "Where you stay", blurb: "The kind of place you sleep well in." },
  { key: "food", title: "How you eat", blurb: "Cuisines, needs and how adventurous you are." },
  { key: "logistics", title: "Logistics & next trip", blurb: "Your rhythm, how you get around, and where next." },
  { key: "dealbreakers", title: "Dealbreakers & notes", blurb: "What ruins a trip, and anything else to remember." },
];

export interface SectionProps {
  draft: TravelerProfile;
  set: <K extends keyof TravelerProfile>(key: K, value: TravelerProfile[K]) => void;
  dealbreakers: string[];
  toggleDealbreaker: (statement: string) => void;
}

const toggleIn = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

function ChipGroup({ label, hint, options, value, onToggle, testId }: { label: string; hint?: string; options: readonly string[]; value: string[]; onToggle: (v: string) => void; testId?: string }) {
  return (
    <div>
      <div className="mb-1 text-[13px] font-medium">{label}</div>
      {hint ? <p className="mb-2 text-[12px] text-muted">{hint}</p> : null}
      <div className="flex flex-wrap gap-2" data-testid={testId} role="group" aria-label={label}>
        {options.map((o) => (
          <Chip key={o} active={value.includes(o)} onClick={() => onToggle(o)}>
            {o}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function OptionCards<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string; hint: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div>
      <div className="mb-2 text-[13px] font-medium">{label}</div>
      <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={clsx("rounded-2xl border px-3 py-2.5 text-left transition-colors", value === o.value ? "border-neutral-900 bg-neutral-900 text-white" : "border-border bg-white hover:bg-surface")}
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
          <TextInput value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Tayo" autoFocus />
        </Field>
        <Field label="Home city">
          <TextInput value={draft.homeCity} onChange={(e) => set("homeCity", e.target.value)} placeholder="Austell, GA" />
        </Field>
        <Field label="Home airport" hint="IATA code, used as the default flight origin">
          <TextInput value={draft.homeAirport} onChange={(e) => set("homeAirport", e.target.value.toUpperCase())} placeholder="ATL" maxLength={4} />
        </Field>
        <Field label="Usually travel with">
          <Select value={draft.companions} onChange={(e) => set("companions", e.target.value as TravelerProfile["companions"])}>
            <option value="solo">Solo</option>
            <option value="partner">Partner</option>
            <option value="family">Family (with kids)</option>
            <option value="friends">Friends</option>
            <option value="mixed">It varies</option>
          </Select>
        </Field>
      </div>
    </Stack>
  );
}

export function StyleSection({ draft, set }: SectionProps) {
  return (
    <Stack>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Budget">
          <Select value={draft.budgetTier} onChange={(e) => set("budgetTier", e.target.value as TravelerProfile["budgetTier"])}>
            <option value="budget">Budget — hostels, street food, deals</option>
            <option value="mid-range">Mid-range — 3-4★ hotels, nice dinners</option>
            <option value="premium">Premium — boutique & 4-5★</option>
            <option value="luxury">Luxury — the best of everything</option>
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
      <ChipGroup label="Travel style" options={TRAVEL_STYLE_OPTIONS} value={draft.travelStyles} onToggle={(v) => set("travelStyles", toggleIn(draft.travelStyles, v))} testId="style-chips" />
      <ChipGroup
        label="Things you love doing"
        hint="Pick as many as fit. These drive the things-to-do picks and every itinerary."
        options={INTERESTS.map((o) => o.label)}
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
      <ChipGroup label="Kind of place" hint="Where you sleep well." options={STAY_TYPES.map((o) => o.label)} value={draft.stayTypes} onToggle={(v) => set("stayTypes", toggleIn(draft.stayTypes, v))} testId="stay-type-chips" />
      <ChipGroup label="Must-haves" options={STAY_MUST_HAVES.map((o) => o.label)} value={draft.stayMustHaves} onToggle={(v) => set("stayMustHaves", toggleIn(draft.stayMustHaves, v))} testId="must-have-chips" />
      <Field label="Anything else about stays" hint="Free text the assistant reads word for word">
        <TextInput value={draft.accommodation} onChange={(e) => set("accommodation", e.target.value)} placeholder="Boutique hotels, walkable areas" />
      </Field>
    </Stack>
  );
}

export function FoodSection({ draft, set }: SectionProps) {
  return (
    <Stack>
      <ChipGroup label="Cuisines you seek out" options={CUISINES.map((o) => o.label)} value={draft.cuisines} onToggle={(v) => set("cuisines", toggleIn(draft.cuisines, v))} testId="cuisine-chips" />
      <ChipGroup label="Dietary needs" options={DIETARY_TAGS.map((o) => o.label)} value={draft.dietaryTags} onToggle={(v) => set("dietaryTags", toggleIn(draft.dietaryTags, v))} testId="dietary-chips" />
      <Field label="More on food" hint="Allergies, dislikes, anything specific">
        <TextInput value={draft.dietary} onChange={(e) => set("dietary", e.target.value)} placeholder="Vegetarian, no shellfish…" />
      </Field>
      <OptionCards label="How adventurous?" options={FOOD_ADVENTURE_OPTIONS} value={draft.foodAdventure} onChange={(v) => set("foodAdventure", v)} />
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Where are you dreaming of going next?" hint="Your home page lines up picks for it">
          <TextInput value={draft.nextDestination} onChange={(e) => set("nextDestination", e.target.value)} placeholder="Rome, Italy" />
        </Field>
        <Field label="Roughly when?">
          <TextInput value={draft.nextWhen} onChange={(e) => set("nextWhen", e.target.value)} placeholder="October" />
        </Field>
      </div>
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
        <TextArea value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="I love rooftop bars, hate early flights, collecting Marriott points…" />
      </Field>
    </Stack>
  );
}

export const SECTION_COMPONENT: Record<SectionKey, (props: SectionProps) => ReactNode> = {
  about: AboutSection,
  style: StyleSection,
  stays: StaysSection,
  food: FoodSection,
  logistics: LogisticsSection,
  dealbreakers: DealbreakersSection,
};
