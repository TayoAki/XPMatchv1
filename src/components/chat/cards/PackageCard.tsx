"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { ToolCallStatus } from "@copilotkit/core";
import { ArrowLeftRight, Lock, LockOpen, MapPin, Plus, Route, Star, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { api } from "@/lib/api";
import { mapActions } from "@/lib/map-store";
import type { MapPlace, ResolvedPlace } from "@/lib/places/types";
import { candidateFromPlace, recKey, scoreMatch, type MatchResult } from "@/lib/match";
import { CUISINES, INTERESTS, STAY_TYPES } from "@/lib/profile/options";
import { useTravelStore } from "@/lib/store";
import type { ShowPackageArgs, Streaming } from "@/lib/travel/schemas";
import type { PackageConstraints, PackageItem, PackagePick, PackageResult, PackageVariantKey } from "@/server/packages";
import { useSendMessage } from "@/components/chat/useSendMessage";
import { useCardThreadId } from "@/components/map/useRegisterPlaces";
import { useUiState } from "@/components/providers/UiState";
import { MatchBadge } from "@/components/recs/MatchBadge";
import { CardGrid, CardPhoto, SaveButton, SectionHeader } from "./shared";

const KIND_LABEL: Record<PackageItem["kind"], string> = { hotel: "Stay", attraction: "Things to do", restaurant: "Eat" };
type Pace = NonNullable<PackageConstraints["pace"]>;
const PACES: { value: Pace; label: string }[] = [
  { value: "relaxed", label: "Relaxed" },
  { value: "balanced", label: "Balanced" },
  { value: "packed", label: "Packed" },
];

function compact(n?: number): string {
  if (!n) return "";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function Chip({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={clsx(
        "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12px] font-medium transition-colors pointer-coarse:h-9",
        on ? "border-neutral-900 bg-neutral-900 text-white" : "border-border bg-white text-neutral-700 hover:bg-surface",
      )}
    >
      {children}
    </button>
  );
}

function Small({ onClick, label, pressed, children }: { onClick: () => void; label: string; pressed?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={clsx(
        "inline-flex h-7 items-center gap-1 rounded-full border px-2 text-[12px] font-medium transition-colors pointer-coarse:h-9 pointer-coarse:px-3",
        pressed ? "border-neutral-900 bg-neutral-900 text-white" : "border-border bg-white text-neutral-700 hover:bg-surface",
      )}
    >
      {children}
    </button>
  );
}

interface EventInput {
  action: "variant" | "swap" | "lock" | "unlock" | "thumbs_up" | "thumbs_down" | "narrow" | "keep" | "to_trip" | "open";
  slot?: string;
  fromPlaceId?: string;
  toPlaceId?: string;
  reason?: string;
  factors?: string[];
}

/**
 * The package opener: one personalized set for a destination (a stay, things to do,
 * places to eat) built on the server from the place catalog, in three variants. Every
 * slot swaps from ready alternates, locks survive rebuilds, chips narrow the whole
 * package, and the set turns into a trip in one tap. Photos load only for the variant
 * on screen, so three options cost what one does.
 */
export function PackageCard({ args, status, toolCallId }: { args: Streaming<ShowPackageArgs>; status: ToolCallStatus; toolCallId: string }) {
  const destinationQuery = args.destination ?? "";
  const ready = status === ToolCallStatus.Complete && !!destinationQuery;
  const threadId = useCardThreadId();
  const { profile, taste, preferences, recFeedback, packageCalibration, recordRecFeedback, hydrated } = useTravelStore();
  const { openAddToTrip } = useUiState();
  const send = useSendMessage();

  const [data, setData] = useState<PackageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [variantKey, setVariantKey] = useState<PackageVariantKey>("match");
  const [locks, setLocks] = useState<string[]>([]);
  const [keeps, setKeeps] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [constraints, setConstraints] = useState<PackageConstraints>({});
  const [swapSlot, setSwapSlot] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [settledVersion, setSettledVersion] = useState(-1);
  const requestRef = useRef(0);
  const loading = ready && settledVersion !== version;

  useEffect(() => {
    if (!ready) return;
    const id = ++requestRef.current;
    const requested = version;
    api<{ package: PackageResult }>("/api/packages", {
      method: "POST",
      json: { destination: destinationQuery, locks: [...new Set([...locks, ...keeps])], excluded, constraints },
    })
      .then((res) => {
        if (id !== requestRef.current) return;
        setData(res.package);
        setError(null);
      })
      .catch((err: unknown) => {
        if (id !== requestRef.current) return;
        setError(err instanceof Error ? err.message : "Could not build a package");
      })
      .finally(() => {
        if (id === requestRef.current) setSettledVersion(requested);
      });
    // Rebuilds are explicit (version): locks, keeps, excluded and constraints are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, destinationQuery, version]);

  const variant = useMemo(() => data?.variants.find((v) => v.key === variantKey) ?? data?.variants[0] ?? null, [data, variantKey]);

  // Scores recompute on the client so thumbs move the badges at once.
  const live = useMemo(() => {
    if (!variant) return new Map<string, MatchResult>();
    const inputs = { profile, taste, preferences, recFeedback, packageCalibration };
    return new Map(variant.items.map((it) => [it.slot, hydrated ? scoreMatch(candidateFromPlace(it.place), inputs) : it.match]));
  }, [variant, profile, taste, preferences, recFeedback, packageCalibration, hydrated]);

  // One "shown" event per card, once the first build lands: the denominator for keep and trip rates.
  const shownRef = useRef(false);
  useEffect(() => {
    if (!data || shownRef.current) return;
    shownRef.current = true;
    void api("/api/packages/events", { method: "POST", json: { destinationId: data.destination.id, variant: "match", action: "shown" } }).catch(() => undefined);
  }, [data]);

  // The package's places are the map's pins for this tool call; a swap or rebuild replaces them.
  useEffect(() => {
    if (!threadId || !data || !variant) return;
    const pins: MapPlace[] = variant.items.map((it) => ({ ...it.place, key: `${toolCallId}:${it.slot}`, toolCallId }));
    const current = mapActions.getState().threads[threadId];
    if (!current?.focus) mapActions.setFocus(threadId, data.destination);
    mapActions.replacePlaces(threadId, toolCallId, pins);
  }, [threadId, data, variant, toolCallId]);

  const logEvent = useCallback(
    (input: EventInput) => {
      if (!data || !variant) return;
      void api("/api/packages/events", { method: "POST", json: { destinationId: data.destination.id, variant: variant.key, ...input } }).catch(() => undefined);
    },
    [data, variant],
  );

  const rebuild = (next: { locks?: string[]; keeps?: string[]; excluded?: string[]; constraints?: PackageConstraints }) => {
    if (next.locks) setLocks(next.locks);
    if (next.keeps) setKeeps(next.keeps);
    if (next.excluded) setExcluded(next.excluded);
    if (next.constraints) setConstraints(next.constraints);
    setSwapSlot(null);
    setVersion((v) => v + 1);
  };

  const pickVariant = (key: PackageVariantKey) => {
    setVariantKey(key);
    setSwapSlot(null);
    logEvent({ action: "variant", reason: key });
  };

  const othersOf = (item: PackageItem) => (variant?.items ?? []).filter((i) => i.slot !== item.slot).map((i) => i.place.id);

  const swapTo = (item: PackageItem, alternate: PackagePick) => {
    logEvent({ action: "swap", slot: item.slot, fromPlaceId: item.place.id, toPlaceId: alternate.place.id, factors: item.match.factors });
    rebuild({ keeps: [...othersOf(item), alternate.place.id], excluded: [...excluded, item.place.id] });
  };

  const toggleLock = (item: PackageItem) => {
    const locked = locks.includes(item.place.id);
    logEvent({ action: locked ? "unlock" : "lock", slot: item.slot, fromPlaceId: item.place.id, factors: item.match.factors });
    // Rebuilt at once so every variant honors the lock, not just the one on screen.
    rebuild({ locks: locked ? locks.filter((id) => id !== item.place.id) : [...locks, item.place.id] });
  };

  const judge = (item: PackageItem, verdict: "up" | "down") => {
    const match = live.get(item.slot) ?? item.match;
    void recordRecFeedback({
      placeId: recKey(item.place.name, item.place),
      name: item.place.name,
      kind: item.place.kind,
      destination: data?.destination.name,
      place: item.place,
      context: "chat",
      verdict,
      score: match.score,
      factors: match.factors,
      reason: null,
    }).catch(() => undefined);
    logEvent({ action: verdict === "up" ? "thumbs_up" : "thumbs_down", slot: item.slot, fromPlaceId: item.place.id, factors: match.factors });
    if (verdict === "down") rebuild({ keeps: othersOf(item), excluded: [...excluded, item.place.id], locks: locks.filter((id) => id !== item.place.id) });
  };

  const notThisKind = (item: PackageItem) => {
    const category = item.place.category;
    if (!category) return;
    logEvent({ action: "narrow", slot: item.slot, fromPlaceId: item.place.id, reason: `no ${category}` });
    rebuild({ keeps: othersOf(item), constraints: { ...constraints, categoriesOff: [...(constraints.categoriesOff ?? []), category] } });
  };

  const narrow = (patch: PackageConstraints, reason: string) => {
    logEvent({ action: "narrow", reason });
    rebuild({ keeps: [], constraints: { ...constraints, ...patch } });
  };

  const toggleBasedOn = (label: string) => {
    const key = INTERESTS.some((o) => o.label === label) ? "interestsOff" : STAY_TYPES.some((o) => o.label === label) ? "stayTypesOff" : CUISINES.some((o) => o.label === label) ? "cuisinesOff" : null;
    if (!key) return;
    const current = constraints[key] ?? [];
    const off = current.includes(label);
    narrow({ [key]: off ? current.filter((l) => l !== label) : [...current, label] }, `${off ? "on" : "off"} ${label}`);
  };

  const openPin = (item: PackageItem) => {
    if (!threadId) return;
    mapActions.selectPlace(threadId, `${toolCallId}:${item.slot}`);
    logEvent({ action: "open", slot: item.slot, fromPlaceId: item.place.id });
  };

  const toTrip = () => {
    if (!data || !variant) return;
    const stay = variant.items.find((i) => i.kind === "hotel");
    const things = variant.items.filter((i) => i.kind === "attraction").map((i) => i.place.name);
    const eats = variant.items.filter((i) => i.kind === "restaurant").map((i) => i.place.name);
    logEvent({ action: "to_trip" });
    // Every place carried into the trip counts as kept, with the factors that put it there.
    for (const item of variant.items) logEvent({ action: "keep", slot: item.slot, fromPlaceId: item.place.id, factors: (live.get(item.slot) ?? item.match).factors });
    void send(
      `Turn this package into a trip to ${data.destination.name}: ${stay ? `stay at ${stay.place.name}; ` : ""}things to do: ${things.join(", ")}; places to eat: ${eats.join(", ")}. Keep these exact places and build a day-by-day itinerary around them.`,
    );
  };

  const destinationName = data?.destination.name ?? destinationQuery;
  const title = destinationName ? `Your ${destinationName} package` : "Your package";

  return (
    <div data-testid="package-card" data-loading={loading ? "true" : "false"}>
      <SectionHeader title={title} subtitle={args.intro ?? (data ? `Built from ${data.basedOn.slice(0, 3).join(", ")}` : undefined)} status={status} />

      {data && data.basedOn.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5" data-testid="package-based-on" aria-label="Built from">
          <span className="text-[12px] text-muted">Built from</span>
          {data.basedOn.map((label) => {
            const off = [...(constraints.interestsOff ?? []), ...(constraints.stayTypesOff ?? []), ...(constraints.cuisinesOff ?? [])].includes(label);
            const toggleable = INTERESTS.some((o) => o.label === label) || STAY_TYPES.some((o) => o.label === label) || CUISINES.some((o) => o.label === label);
            return toggleable ? (
              <Chip key={label} on={!off} onClick={() => toggleBasedOn(label)} label={`${off ? "Include" : "Leave out"} ${label}`}>
                {label}
              </Chip>
            ) : (
              <span key={label} className="inline-flex h-8 items-center rounded-full bg-surface px-3 text-[12px] font-medium text-neutral-700">
                {label}
              </span>
            );
          })}
        </div>
      ) : null}

      {data && data.variants.length > 1 ? (
        <div role="tablist" aria-label="Package options" className="xp-no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {data.variants.map((v) => {
            const selected = v.key === (variant?.key ?? "match");
            return (
              <button
                key={v.key}
                type="button"
                role="tab"
                aria-selected={selected}
                data-testid="package-variant"
                onClick={() => pickVariant(v.key)}
                className={clsx(
                  "flex shrink-0 flex-col items-start rounded-2xl border px-3 py-2 text-left transition-colors",
                  selected ? "border-neutral-900 bg-neutral-900 text-white" : "border-border bg-white hover:bg-surface",
                )}
              >
                <span className="text-[13px] font-semibold">
                  {v.title} <span className={clsx("text-[12px] font-medium", selected ? "text-white/80" : "text-muted")}>{v.score}%</span>
                </span>
                <span className={clsx("text-[11px]", selected ? "text-white/80" : "text-muted")}>{v.subtitle}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border px-4 py-5 text-center text-[13px] text-muted">{error}</p>
      ) : !data ? (
        <div className="mt-3 grid grid-cols-2 gap-3" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="xp-skeleton h-[220px] rounded-2xl" />
          ))}
        </div>
      ) : !variant || variant.items.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border px-4 py-5 text-center text-[13px] text-muted">
          {data.provider === "fallback" ? "Google Places is not configured, so there is nothing to build a package from." : "Nothing in the catalog fits yet. Loosen the chips above or ask for a specific kind of place."}
        </p>
      ) : (
        <CardGrid className={clsx(loading && "opacity-60")}>
          {variant.items.map((item) => {
            const match = live.get(item.slot) ?? item.match;
            const locked = locks.includes(item.place.id);
            const verdict = recFeedback.find((f) => f.placeId === recKey(item.place.name, item.place))?.verdict;
            const p = item.place;
            return (
              <article
                key={`${item.slot}:${p.id}`}
                data-testid="package-item"
                data-kind={item.kind}
                data-slot={item.slot}
                data-name={p.name}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white text-[14px] leading-snug shadow-sm"
              >
                <CardPhoto place={p} queries={[p.name, destinationName]} alt={p.name} className="aspect-[16/9]" onOpen={() => openPin(item)}>
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-neutral-800">{KIND_LABEL[item.kind]}</span>
                  <SaveButton place={p} kind={p.kind} title={p.name} subtitle={p.locality} destination={destinationName} className="absolute right-2 top-2" />
                  <MatchBadge match={match} size="sm" className="absolute bottom-2 left-2" />
                </CardPhoto>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <h4 className="line-clamp-2 text-[14px] font-semibold" title={p.name}>
                    {p.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                    {p.rating ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <Star className="h-3 w-3 fill-current" /> {p.rating.toFixed(1)}
                        {p.userRatingCount ? <span className="font-normal text-muted">({compact(p.userRatingCount)})</span> : null}
                      </span>
                    ) : null}
                    <span className="truncate">{[p.category, p.priceLevel].filter(Boolean).join(" · ")}</span>
                  </div>
                  <p className="line-clamp-2 text-[12px] text-neutral-700">{item.why}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
                    <Small onClick={() => setSwapSlot(swapSlot === item.slot ? null : item.slot)} label={`Swap ${p.name}`} pressed={swapSlot === item.slot}>
                      <ArrowLeftRight className="h-3 w-3" /> Swap
                    </Small>
                    <Small onClick={() => toggleLock(item)} label={`${locked ? "Unlock" : "Lock"} ${p.name}`} pressed={locked}>
                      {locked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                    </Small>
                    <Small onClick={() => judge(item, "up")} label={`Good pick: ${p.name}`} pressed={verdict === "up"}>
                      <ThumbsUp className="h-3 w-3" />
                    </Small>
                    <Small onClick={() => judge(item, "down")} label={`Not for me: ${p.name}`} pressed={verdict === "down"}>
                      <ThumbsDown className="h-3 w-3" />
                    </Small>
                    <Small onClick={() => openAddToTrip({ place: p })} label={`Add ${p.name} to a trip`}>
                      <Plus className="h-3 w-3" />
                    </Small>
                    <Small onClick={() => openPin(item)} label={`Show ${p.name} on the map`}>
                      <MapPin className="h-3 w-3" />
                    </Small>
                  </div>
                  {swapSlot === item.slot ? (
                    <div className="mt-2 rounded-xl border border-border bg-surface/60 p-2" data-testid="package-alternates" aria-label={`Alternatives to ${p.name}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold">Instead of {p.name}</span>
                        <button type="button" onClick={() => setSwapSlot(null)} aria-label="Close alternatives" className="rounded-full p-1 text-neutral-500 hover:bg-white">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {item.alternates.length ? (
                        <ul className="mt-1.5 grid gap-1.5">
                          {item.alternates.map((alt) => (
                            <li key={alt.place.id} className="flex items-center gap-2 rounded-lg bg-white p-1.5">
                              <Thumb place={alt.place} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-semibold">{alt.place.name}</span>
                                <span className="block truncate text-[11px] text-muted">
                                  {alt.match.score}% match{alt.why ? ` · ${alt.why}` : ""}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => swapTo(item, alt)}
                                aria-label={`Pick ${alt.place.name}`}
                                className="h-7 shrink-0 rounded-full bg-neutral-900 px-2.5 text-[12px] font-semibold text-white hover:bg-neutral-800 pointer-coarse:h-9"
                              >
                                Pick
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1.5 text-[12px] text-muted">No other {KIND_LABEL[item.kind].toLowerCase()} in the catalog fits yet.</p>
                      )}
                      {p.category ? (
                        <button type="button" onClick={() => notThisKind(item)} className="mt-1.5 text-[12px] font-medium text-neutral-600 underline-offset-2 hover:underline">
                          Not this kind ({p.category.toLowerCase()})
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </CardGrid>
      )}

      {data ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5" data-testid="package-narrow" aria-label="Narrow the package">
          <Chip on={(constraints.budgetShift ?? 0) === -1} onClick={() => narrow({ budgetShift: (constraints.budgetShift ?? 0) === -1 ? 0 : -1 }, "budget down")}>
            Easier on the budget
          </Chip>
          <Chip on={(constraints.budgetShift ?? 0) === 1} onClick={() => narrow({ budgetShift: (constraints.budgetShift ?? 0) === 1 ? 0 : 1 }, "budget up")}>
            A notch up
          </Chip>
          {PACES.map((pace) => (
            <Chip key={pace.value} on={(constraints.pace ?? profile.pace) === pace.value} onClick={() => narrow({ pace: pace.value }, `pace ${pace.value}`)}>
              {pace.label}
            </Chip>
          ))}
          <Chip on={!!constraints.walkable} onClick={() => narrow({ walkable: !constraints.walkable }, constraints.walkable ? "any distance" : "walkable")}>
            <Route className="h-3 w-3" /> Walkable from the stay
          </Chip>
        </div>
      ) : null}

      {data && variant && variant.items.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toTrip}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-neutral-900 px-4 text-[13px] font-semibold text-white hover:bg-neutral-800 pointer-coarse:h-11"
          >
            <Route className="h-4 w-4" /> Turn into a trip
          </button>
          <span className="text-[12px] text-muted">
            {variant.items.length} places · {data.poolSize.hotel + data.poolSize.attraction + data.poolSize.restaurant} in the catalog for {destinationName}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Thumb({ place }: { place: ResolvedPlace }) {
  const src = place.photos?.[0];
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
    return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="h-10 w-10 shrink-0 rounded-lg object-cover" />;
  }
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-neutral-500"><MapPin className="h-4 w-4" /></span>;
}
