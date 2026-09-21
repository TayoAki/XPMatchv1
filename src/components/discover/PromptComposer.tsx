"use client";

import { useId, useState } from "react";
import { Send, Sparkles } from "lucide-react";

/**
 * The hero prompt: a serif textarea with a sparkle mark and a round send button. Ctrl or ⌘ +
 * Enter sends, Enter is a newline. Sending hands the text to the concierge (which opens the
 * conversation with it); a failure keeps the text so nothing typed is lost.
 */
export function PromptComposer({ onSend, placeholder = "Describe your ideal escape…" }: { onSend: (text: string) => Promise<void> | void; placeholder?: string }) {
  const id = useId();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSend(trimmed);
      setText("");
    } catch {
      setError("That did not go through. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="rounded-[18px] border border-border bg-white p-3 shadow-composer transition-colors focus-within:border-brand"
      data-testid="prompt-composer"
    >
      <label htmlFor={id} className="sr-only">
        Describe your ideal escape
      </label>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-brand" aria-hidden="true">
          <Sparkles className="h-[18px] w-[18px]" />
        </span>
        <textarea
          id={id}
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={placeholder}
          disabled={busy}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          className="max-h-[160px] min-h-[52px] w-full resize-none bg-transparent py-1 font-serif text-[17px] leading-relaxed text-foreground placeholder:text-muted/70 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Send to your AI concierge"
          disabled={!text.trim() || busy}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:bg-brand/45"
        >
          <Send className="h-5 w-5 -translate-x-px translate-y-px" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-[13px] text-error">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="sr-only">
          Press Control or Command and Enter to send.
        </p>
      )}
    </form>
  );
}
