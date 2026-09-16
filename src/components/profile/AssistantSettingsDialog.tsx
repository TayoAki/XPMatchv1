"use client";

import { useState } from "react";
import { Brain, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Chip, Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { TRAVEL_STYLE_OPTIONS } from "@/lib/travel/inspiration";
import { DEALBREAKER_OPTIONS, DOMAIN_LABEL, useTravelStore, type LearnedPreference, type TravelerProfile } from "@/lib/store";
import { useUiState } from "@/components/providers/UiState";

export function AssistantSettingsDialog() {
  const { assistantOpen } = useUiState();
  // Mount the form only while open so the draft always starts from the saved profile.
  return assistantOpen ? <AssistantSettingsForm /> : null;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const POLARITY_LABEL: Record<LearnedPreference["polarity"], string> = { like: "Likes", dislike: "Avoids", dealbreaker: "Dealbreaker" };
const SOURCE_LABEL: Record<LearnedPreference["source"], string> = { onboarding: "from onboarding", chat: "learned in chat", feedback: "from your feedback" };

function AssistantSettingsForm() {
  const { profile, preferences, trips, updateProfile, addPreference, removePreference } = useTravelStore();
  const { closeAssistant } = useUiState();
  const [draft, setDraft] = useState<TravelerProfile>(() => profile);
  // Dealbreaker chips start from the stored dealbreakers so the dialog is idempotent.
  const [dealbreakers, setDealbreakers] = useState<string[]>(() =>
    DEALBREAKER_OPTIONS.filter((o) => preferences.some((p) => !p.tripId && p.polarity === "dealbreaker" && same(p.statement, o.statement))).map((o) => o.statement),
  );

  const set = <K extends keyof TravelerProfile>(key: K, value: TravelerProfile[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const toggleStyle = (style: string) =>
    set(
      "travelStyles",
      draft.travelStyles.includes(style) ? draft.travelStyles.filter((s) => s !== style) : [...draft.travelStyles, style],
    );

  const toggleDealbreaker = (statement: string) =>
    setDealbreakers((list) => (list.includes(statement) ? list.filter((s) => s !== statement) : [...list, statement]));

  const syncDealbreakers = () => {
    for (const option of DEALBREAKER_OPTIONS) {
      const stored = preferences.find((p) => !p.tripId && p.polarity === "dealbreaker" && same(p.statement, option.statement));
      const wanted = dealbreakers.includes(option.statement);
      if (wanted && !stored) void addPreference({ statement: option.statement, domain: option.domain, polarity: "dealbreaker", source: "onboarding" }).catch(() => undefined);
      if (!wanted && stored) removePreference(stored.id);
    }
  };

  const save = () => {
    updateProfile({ ...draft, onboarded: true });
    syncDealbreakers();
    closeAssistant();
  };

  const skip = () => {
    updateProfile({ onboarded: true });
    closeAssistant();
  };

  const learned = preferences.filter((p) => !DEALBREAKER_OPTIONS.some((o) => o.statement === p.statement && p.polarity === "dealbreaker" && !p.tripId));
  const tripTitle = (id?: string) => (id ? trips.find((t) => t.id === id)?.title ?? "a trip" : null);

  return (
    <Modal
      open
      onClose={profile.onboarded ? closeAssistant : skip}
      title={profile.onboarded ? "Update my assistant" : "Let's personalize your assistant"}
      description="XPMatch uses this to tailor destinations, stays, flights and food to you. Saved to your account."
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

      <div className="mt-5">
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

      <div className="mt-6 rounded-2xl border border-border p-4" data-testid="memory-panel">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[14px] font-semibold">
              <Brain className="h-4 w-4" /> What XPMatch has learned
            </div>
            <p className="mt-0.5 text-[12px] text-muted">
              Tastes you confirmed in chat. Each one is sent to the assistant with every message; delete anything that no longer fits.
            </p>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[13px] font-medium">
            <input
              type="checkbox"
              checked={draft.learnFromChat}
              onChange={(e) => set("learnFromChat", e.target.checked)}
              className="h-4 w-4 accent-neutral-900"
            />
            Learn from our chats
          </label>
        </div>
        {learned.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted">Nothing yet. When you mention a taste in chat (“I prefer boutique hotels”), XPMatch will offer to remember it.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {learned.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2 text-[13px]" data-testid="memory-item">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{p.statement}</span>
                  <span className="block text-[12px] text-muted">
                    {POLARITY_LABEL[p.polarity]} · {DOMAIN_LABEL[p.domain]} · {SOURCE_LABEL[p.source]}
                    {p.tripId ? ` · only for ${tripTitle(p.tripId)}` : ""}
                  </span>
                </span>
                <button type="button" onClick={() => removePreference(p.id)} aria-label={`Forget ${p.statement}`} className="rounded-full p-2 text-neutral-500 hover:bg-surface hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
