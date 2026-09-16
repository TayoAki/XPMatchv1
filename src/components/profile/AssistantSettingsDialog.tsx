"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Chip, Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { TRAVEL_STYLE_OPTIONS } from "@/lib/travel/inspiration";
import { useTravelStore, type TravelerProfile } from "@/lib/store";
import { useUiState } from "@/components/providers/UiState";

export function AssistantSettingsDialog() {
  const { assistantOpen } = useUiState();
  // Mount the form only while open so the draft always starts from the saved profile.
  return assistantOpen ? <AssistantSettingsForm /> : null;
}

function AssistantSettingsForm() {
  const { profile, updateProfile } = useTravelStore();
  const { closeAssistant } = useUiState();
  const [draft, setDraft] = useState<TravelerProfile>(() => profile);

  const set = <K extends keyof TravelerProfile>(key: K, value: TravelerProfile[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const toggleStyle = (style: string) =>
    set(
      "travelStyles",
      draft.travelStyles.includes(style) ? draft.travelStyles.filter((s) => s !== style) : [...draft.travelStyles, style],
    );

  const save = () => {
    updateProfile({ ...draft, onboarded: true });
    closeAssistant();
  };

  const skip = () => {
    updateProfile({ onboarded: true });
    closeAssistant();
  };

  return (
    <Modal
      open
      onClose={profile.onboarded ? closeAssistant : skip}
      title={profile.onboarded ? "Update my assistant" : "Let's personalize your assistant"}
      description="XPMatch uses this to tailor destinations, stays, flights and food to you. Everything stays in your browser."
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          {!profile.onboarded ? (
            <button type="button" onClick={skip} className="text-sm text-muted hover:underline">
              Skip for now
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={profile.onboarded ? closeAssistant : skip}>
              Cancel
            </Button>
            <Button onClick={save}>Save preferences</Button>
          </div>
        </div>
      }
    >
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

      <div className="mt-5">
        <div className="mb-2 text-[13px] font-medium">Travel style</div>
        <div className="flex flex-wrap gap-2">
          {TRAVEL_STYLE_OPTIONS.map((style) => (
            <Chip key={style} active={draft.travelStyles.includes(style)} onClick={() => toggleStyle(style)}>
              {style}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Dietary needs">
          <TextInput value={draft.dietary} onChange={(e) => set("dietary", e.target.value)} placeholder="Vegetarian, no shellfish…" />
        </Field>
        <Field label="Preferred stays">
          <TextInput value={draft.accommodation} onChange={(e) => set("accommodation", e.target.value)} placeholder="Boutique hotels, walkable areas" />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Anything else the assistant should remember?">
          <TextArea value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="I love rooftop bars, hate early flights, collecting Marriott points…" />
        </Field>
      </div>
    </Modal>
  );
}
