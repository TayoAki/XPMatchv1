"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import clsx from "clsx";
import { MapPin, X } from "lucide-react";
import type { CitySuggestion } from "@/lib/places/types";

/** "home": towns someone lives in; "any": also regions and countries someone travels to. */
export type CityScope = "home" | "any";

const cache = new Map<string, Promise<CitySuggestion[]>>();

function fetchSuggestions(query: string, scope: CityScope): Promise<CitySuggestion[]> {
  const key = `${scope}|${query.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const value = fetch(`/api/places/cities?scope=${scope}&q=${encodeURIComponent(query)}`, { credentials: "same-origin" })
    .then(async (r) => (r.ok ? ((await r.json()) as { suggestions: CitySuggestion[] }).suggestions : []))
    .catch(() => {
      cache.delete(key);
      return [] as CitySuggestion[];
    });
  if (cache.size > 200) cache.delete(cache.keys().next().value as string);
  cache.set(key, value);
  return value;
}

/**
 * A city field with suggestions as you type (Atlanta → Atlanta, Georgia; Atlanta, Kansas …).
 * Picking a suggestion stores its full line; anything typed is kept as typed, so the field
 * still works when no suggestion fits or suggestions are unavailable.
 */
export function CityInput({
  value,
  onChange,
  onPick,
  onSubmit,
  onCancel,
  scope = "any",
  label,
  placeholder,
  autoFocus,
  id,
  testId,
  compact,
  className,
}: {
  value: string;
  onChange: (text: string) => void;
  /** A suggestion was chosen. Without this the field takes the suggestion's text. */
  onPick?: (suggestion: CitySuggestion) => void;
  /** Enter with no suggestion highlighted. */
  onSubmit?: (text: string) => void;
  /** Escape with the list closed. */
  onCancel?: () => void;
  scope?: CityScope;
  /** The accessible name. */
  label: string;
  placeholder?: string;
  autoFocus?: boolean;
  id?: string;
  testId?: string;
  /** Form-sized (the settings dialog) instead of the onboarding's tall pill. */
  compact?: boolean;
  className?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  // Suggestions only after the traveler types, not for a value that was already there or just picked.
  const [typed, setTyped] = useState(false);
  const [results, setResults] = useState<{ query: string; items: CitySuggestion[] } | null>(null);
  const [active, setActive] = useState(-1);
  const query = value.trim();
  const wanted = typed && query.length >= 2;

  useEffect(() => {
    if (!wanted) return;
    let live = true;
    const t = setTimeout(() => {
      void fetchSuggestions(query, scope).then((items) => {
        if (live) {
          setResults({ query, items });
          setActive(-1);
        }
      });
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query, scope, wanted]);

  // The last answer stays up while the next one loads, so the list doesn't flicker per letter.
  const items = wanted && results ? results.items : [];
  const open = focused && items.length > 0;

  const pick = (s: CitySuggestion) => {
    setTyped(false);
    setResults(null);
    setActive(-1);
    if (onPick) onPick(s);
    else onChange(s.text);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && open) {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp" && open) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && active >= 0) pick(items[active]);
      else {
        setTyped(false);
        onSubmit?.(query);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        setTyped(false);
      } else if (onCancel) {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    }
  };

  return (
    <div className={clsx("relative", className)}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        data-testid={testId}
        onChange={(e) => {
          setTyped(true);
          onChange(e.target.value);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        className={clsx(
          "w-full border border-border bg-white text-foreground placeholder:text-neutral-400 focus:outline-none",
          compact ? "h-10 rounded-[10px] pl-3 pr-10 text-sm focus:border-brand" : "h-[52px] rounded-full pl-5 pr-12 text-[16px] focus:border-foreground",
        )}
      />
      {value ? (
        <button
          type="button"
          aria-label={`Clear ${label.toLowerCase()}`}
          onClick={() => {
            onChange("");
            setTyped(false);
            inputRef.current?.focus();
          }}
          className={clsx(
            "absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-neutral-300 text-white hover:bg-neutral-400",
            compact ? "right-2.5 h-5 w-5" : "right-3 h-7 w-7",
          )}
        >
          <X className={compact ? "h-3 w-3" : "h-4 w-4"} strokeWidth={2.5} aria-hidden="true" />
        </button>
      ) : null}
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-white p-2 shadow-floating"
        >
          {items.map((s, i) => (
            <li
              key={s.text}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // Keeps the focus in the field so the blur doesn't close the list before the click lands.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
              onMouseEnter={() => setActive(i)}
              className={clsx("flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5", i === active ? "bg-surface" : "hover:bg-surface")}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2/70 text-foreground" aria-hidden="true">
                <MapPin className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 truncate text-[15px]">
                <span className="font-semibold">{s.main}</span>
                {s.secondary ? <span className="text-foreground">, {s.secondary}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
