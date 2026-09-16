"use client";

import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { Plus, SlidersHorizontal, X } from "lucide-react";
import { ToolCallStatus } from "@copilotkit/core";
import type { SetSearchConstraintsArgs, Streaming } from "@/lib/travel/schemas";
import { constraintActions, KIND_NOUN, searchAgainMessage, useConstraints, type ConstraintKind, type SearchConstraint } from "@/lib/constraints-store";
import { useMapView } from "@/lib/map-store";
import { useCardThreadId } from "@/components/map/useRegisterPlaces";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { useTripScope } from "@/components/trips/TripScope";

/**
 * "Understood as" strip: the assistant's reading of the traveler's criteria as
 * chips. The newest strip in a chat is live (remove, add, toggle must-have) and
 * every edit re-runs the search through the chat; older strips stay as a record.
 */
export function ConstraintChips({ args, status, toolCallId }: { args: Streaming<SetSearchConstraintsArgs>; status: ToolCallStatus; toolCallId: string }) {
  const threadId = useCardThreadId();
  const live = useConstraints(threadId);
  const view = useMapView(threadId);
  const send = useSendMessage();
  const tripId = useTripScope();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const isLive = status === ToolCallStatus.Complete && !!live && live.toolCallId === toolCallId;
  const streamed = (args.constraints ?? []).filter((c): c is SearchConstraint => !!c && typeof c.label === "string" && !!c.label);
  const constraints = isLive && live ? live.constraints : streamed;
  const notUnderstood = (isLive && live ? live.notUnderstood : args.notUnderstood ?? []).filter((s): s is string => typeof s === "string" && !!s);
  const kind: ConstraintKind = (isLive && live ? live.kind : args.kind) ?? "hotels";
  const destination = view.focus?.name;

  const rerun = (next: SearchConstraint[]) => send(searchAgainMessage(kind, next, destination));

  const remove = (label: string) => {
    if (!threadId) return;
    constraintActions.remove(threadId, label);
    rerun(constraintActions.get(threadId)?.constraints ?? []);
  };

  const toggleHard = (label: string) => {
    if (!threadId) return;
    constraintActions.toggleHard(threadId, label);
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    const label = draft.trim();
    if (!label || !threadId) return;
    constraintActions.add(threadId, { label, type: "other", hard: false });
    setDraft("");
    setAdding(false);
    rerun(constraintActions.get(threadId)?.constraints ?? []);
  };

  const saveToTrip = () => {
    const list = constraints.map((c) => `${c.label}${c.hard ? " (must)" : ""}`).join(", ");
    send(`Save these as trip preferences for ${KIND_NOUN[kind]}: ${list}.`);
  };

  if (constraints.length === 0 && notUnderstood.length === 0 && status === ToolCallStatus.Complete) return null;

  return (
    <div className="mt-2 rounded-2xl border border-border bg-white px-3 py-2.5 text-[13px] shadow-sm" data-testid="constraint-strip" data-live={isLive ? "true" : "false"}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 inline-flex items-center gap-1.5 font-semibold text-neutral-700">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Understood as
        </span>
        {constraints.map((c) => (
          <span
            key={c.label}
            className={clsx(
              "inline-flex h-7 items-center gap-1 rounded-full border pl-2.5 text-[12px] font-medium",
              c.hard ? "border-neutral-900 bg-neutral-900 text-white" : "border-border bg-surface text-neutral-800",
              isLive ? "pr-1" : "pr-2.5",
            )}
            data-testid="constraint-chip"
          >
            {isLive ? (
              <button type="button" onClick={() => toggleHard(c.label)} title={c.hard ? "Must have (click to make it a preference)" : "Preference (click to make it a must)"} className="hover:underline">
                {c.label}
              </button>
            ) : (
              c.label
            )}
            {isLive ? (
              <button type="button" onClick={() => remove(c.label)} aria-label={`Remove ${c.label}`} className={clsx("rounded-full p-0.5", c.hard ? "hover:bg-white/20" : "hover:bg-neutral-200")}>
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </span>
        ))}
        {status !== ToolCallStatus.Complete ? <span className="text-muted">reading your request…</span> : null}
        {isLive ? (
          adding ? (
            <form onSubmit={add} className="inline-flex items-center gap-1">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => !draft.trim() && setAdding(false)}
                placeholder="e.g. rooftop bar"
                aria-label="Add a filter"
                className="h-7 w-36 rounded-full border border-border px-2.5 text-[12px] outline-none focus:border-neutral-900"
              />
              <button type="submit" className="h-7 rounded-full bg-neutral-900 px-2.5 text-[12px] font-semibold text-white">
                Add
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-neutral-400 px-2.5 text-[12px] font-medium text-neutral-700 hover:bg-surface">
              <Plus className="h-3 w-3" /> Add
            </button>
          )
        ) : null}
      </div>
      {notUnderstood.length ? (
        <div className="mt-1.5 text-[12px] text-muted">
          Not applied: {notUnderstood.map((s) => `“${s}”`).join(", ")}
          {isLive ? " — rephrase or add it as a chip." : ""}
        </div>
      ) : null}
      {isLive ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[12px] text-muted">
          <span>Dark chips are must-haves. Removing or adding a chip searches again.</span>
          {tripId && constraints.length ? (
            <button type="button" onClick={saveToTrip} className="font-semibold text-neutral-700 hover:underline">
              Save to trip
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
