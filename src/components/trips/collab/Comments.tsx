"use client";

import { useState } from "react";
import clsx from "clsx";
import { ArrowUp, MessageSquare, Trash2 } from "lucide-react";
import { MESSAGE_MAX, targetKey, type CollabTarget, type TripMessage } from "@/lib/collab/types";
import { useTripCollab } from "./TripCollab";

/** "just now", "5 min ago", "3 h ago", then the day and time. */
export function timeAgo(at: string): string {
  const ms = Date.now() - Date.parse(at);
  if (!Number.isFinite(ms) || ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} min ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} h ago`;
  return new Date(at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** One message or comment: who, when, what it is about, and Delete for its author (or the owner). */
export function MessageItem({
  message,
  me,
  canDelete,
  onDelete,
  onLocate,
  showTarget = true,
}: {
  message: TripMessage;
  me: string | null;
  canDelete: boolean;
  onDelete: () => Promise<void>;
  /** Shows the place a comment is about (on the map or the board). */
  onLocate?: (target: CollabTarget) => void;
  /** Off inside a place's own thread, where "on Colosseum" says nothing new. */
  showTarget?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    if (!window.confirm("Delete this message for everyone on the trip?")) return;
    setBusy(true);
    try {
      await onDelete();
    } catch (err) {
      console.error("XPMatch: deleting a message failed", err);
      setBusy(false);
    }
  };
  const target = showTarget ? message.target : undefined;
  return (
    <li className={clsx("group flex gap-2.5", busy && "opacity-50")} data-testid="trip-message">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[12px] font-semibold text-white" aria-hidden="true">
        {message.name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <span className="text-[13px] font-semibold">
            {message.name}
            {message.userId === me ? <span className="font-normal text-muted"> (you)</span> : null}
          </span>
          <time dateTime={message.createdAt} title={new Date(message.createdAt).toLocaleString()} className="text-[12px] text-muted">
            {timeAgo(message.createdAt)}
          </time>
          {target ? (
            onLocate ? (
              <button type="button" onClick={() => onLocate(target)} className="max-w-[200px] truncate rounded-full bg-surface px-2 py-0.5 text-[12px] font-medium hover:bg-surface-2" title={`Show ${target.label}`}>
                on {target.label}
              </button>
            ) : (
              <span className="max-w-[200px] truncate rounded-full bg-surface px-2 py-0.5 text-[12px] font-medium">on {target.label}</span>
            )
          ) : null}
          {canDelete ? (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              aria-label="Delete message"
              title="Delete"
              className="ml-auto rounded-full p-1 text-neutral-400 opacity-60 hover:bg-surface hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <p className="whitespace-pre-wrap break-words text-[14px] leading-snug text-neutral-800">{message.body}</p>
      </div>
    </li>
  );
}

/** A growing text box that sends on Enter (Shift+Enter for a new line). */
export function MessageComposer({ label, placeholder, onSend, autoFocus }: { label: string; placeholder: string; onSend: (body: string) => Promise<void>; autoFocus?: boolean }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    const body = value.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSend(body);
      setValue("");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not send that. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex items-end gap-2 rounded-2xl border border-border bg-white py-1 pl-3 pr-1 focus-within:border-brand"
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={1}
          maxLength={MESSAGE_MAX}
          aria-label={label}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="field-sizing-content max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-[14px] outline-none placeholder:text-neutral-400"
        />
        <button
          type="submit"
          disabled={busy || !value.trim()}
          aria-label="Send"
          className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
      {error ? <p className="mt-1 text-[12px] text-red-600">{error}</p> : null}
    </div>
  );
}

/** The comment count on an idea or a stop; opens its thread. Hidden until someone else is on the trip. */
export function CommentToggle({ target, open, onToggle }: { target: CollabTarget; open: boolean; onToggle: () => void }) {
  const collab = useTripCollab();
  if (!collab?.shared) return null;
  const count = collab.comments.get(targetKey(target))?.length ?? 0;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`Comments on ${target.label}`}
      title={count ? `${count} comment${count === 1 ? "" : "s"}` : "Comment"}
      data-collab
      className={clsx(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2 text-[12px] font-semibold tabular-nums hover:bg-surface pointer-coarse:px-2.5",
        open ? "bg-surface text-foreground" : "text-neutral-600",
      )}
    >
      <MessageSquare className="h-4 w-4" aria-hidden="true" />
      {count ? <span data-testid="comment-count">{count}</span> : null}
    </button>
  );
}

/** The comments on one idea or stop, with a box to add one. */
export function CommentThread({ target }: { target: CollabTarget }) {
  const collab = useTripCollab();
  if (!collab?.shared) return null;
  const list = collab.comments.get(targetKey(target)) ?? [];
  return (
    <div className="mt-2 grid gap-2 rounded-xl bg-surface/70 p-2.5" data-collab data-testid="comment-thread">
      {list.length ? (
        <ul className="grid gap-2">
          {list.map((m) => (
            <MessageItem key={m.id} message={m} me={collab.me} canDelete={m.userId === collab.me || collab.isOwner} onDelete={() => collab.remove(m.id)} showTarget={false} />
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-muted">No comments yet. What does everyone think?</p>
      )}
      <MessageComposer label={`Comment on ${target.label}`} placeholder="Add a comment…" onSend={(body) => collab.post(body, target)} autoFocus />
    </div>
  );
}
