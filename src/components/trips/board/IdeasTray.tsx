"use client";

import { photoCreditTitle } from "@/components/ui/PhotoCredit";
import { useState } from "react";
import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Lightbulb, MapPin, Star } from "lucide-react";
import type { TripItem } from "@/lib/types";
import { shortTitle } from "@/lib/places/names";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { tripItemKey } from "../TripMap";
import { IDEAS_CONTAINER, ideaDragId } from "./useItineraryDnd";

function IdeaThumb({ item, destination }: { item: TripItem; destination: string }) {
  const [failed, setFailed] = useState(false);
  const photo = item.place?.photos?.[0];
  if (photo && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo
    return <img src={photo} alt="" title={photoCreditTitle(item.place?.photoCredits?.[0])} onError={() => setFailed(true)} className="h-12 w-12 shrink-0 rounded-xl object-cover" loading="lazy" />;
  }
  return <PlaceImage queries={[item.title, destination]} alt="" className="h-12 w-12 shrink-0 rounded-xl" />;
}

function IdeaCard({
  item,
  destination,
  dayCount,
  canEdit,
  hovered,
  onHover,
  onSelectPlace,
  onAddToDay,
}: {
  item: TripItem;
  destination: string;
  dayCount: number;
  canEdit: boolean;
  hovered: boolean;
  onHover?: (key: string | null) => void;
  onSelectPlace: (key: string) => void;
  onAddToDay: (item: TripItem, dayIndex: number) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: ideaDragId(item.id), disabled: !canEdit });
  const place = item.place;
  const key = tripItemKey(item.id);
  const meta = [place?.category, place?.locality].filter(Boolean).join(" · ");
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid="idea-card"
      onMouseEnter={() => place && onHover?.(key)}
      onMouseLeave={() => onHover?.(null)}
      className={clsx("flex items-center gap-2 rounded-2xl border bg-white p-2.5", hovered ? "border-brand" : "border-border", isDragging && "z-10 opacity-70 shadow-lg")}
    >
      {canEdit ? (
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${item.title}`}
          className="-ml-1 h-6 shrink-0 cursor-grab touch-none rounded-md text-neutral-400 hover:bg-surface hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : null}
      <IdeaThumb item={item} destination={destination} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold" title={item.title}>
          {shortTitle(item.title, place)}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
          {place?.rating ? (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Star className="h-3 w-3 fill-current" /> {place.rating.toFixed(1)}
            </span>
          ) : null}
          {meta ? <span className="truncate">{meta}</span> : null}
        </div>
      </div>
      {place ? (
        <button type="button" aria-label={`Show ${item.title} on the map`} onClick={() => onSelectPlace(key)} className="rounded-full p-1.5 text-neutral-500 hover:bg-surface hover:text-foreground">
          <MapPin className="h-4 w-4" />
        </button>
      ) : null}
      {canEdit && dayCount > 0 ? (
        <select
          aria-label={`Add ${item.title} to a day`}
          value=""
          onChange={(e) => {
            const v = Number(e.target.value);
            if (e.target.value !== "" && Number.isInteger(v)) onAddToDay(item, v);
          }}
          className="h-7 max-w-[104px] rounded-full border border-border bg-white px-2 text-[12px] font-medium"
        >
          <option value="">Add to day…</option>
          {Array.from({ length: dayCount }, (_, j) => (
            <option key={j} value={j}>
              Day {j + 1}
            </option>
          ))}
        </select>
      ) : null}
    </li>
  );
}

/** Unscheduled ideas: drag one into a day, or use "Add to day". */
export function IdeasTray({
  ideas,
  destination,
  dayCount,
  canEdit,
  hoveredKey,
  onHover,
  onSelectPlace,
  onAddToDay,
}: {
  ideas: TripItem[];
  destination: string;
  dayCount: number;
  canEdit: boolean;
  hoveredKey: string | null | undefined;
  onHover?: (key: string | null) => void;
  onSelectPlace: (key: string) => void;
  onAddToDay: (item: TripItem, dayIndex: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: IDEAS_CONTAINER, disabled: !canEdit });
  return (
    <section className="rounded-3xl border border-dashed border-border p-3" data-testid="ideas-tray" aria-label="Ideas not scheduled yet">
      <header className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4" />
        <h3 className="text-[15px] font-semibold">Ideas</h3>
        <span className="text-[12px] text-muted">{ideas.length ? `${ideas.length} not scheduled` : "all scheduled"}</span>
      </header>
      <SortableContext items={ideas.map((i) => ideaDragId(i.id))} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className={clsx("mt-2 grid min-h-[40px] gap-2 rounded-2xl transition-colors", isOver && "bg-amber-50 ring-2 ring-amber-200")}>
          {ideas.map((item) => (
            <IdeaCard
              key={item.id}
              item={item}
              destination={destination}
              dayCount={dayCount}
              canEdit={canEdit}
              hovered={hoveredKey === tripItemKey(item.id)}
              onHover={onHover}
              onSelectPlace={onSelectPlace}
              onAddToDay={onAddToDay}
            />
          ))}
          {ideas.length === 0 ? (
            <li className="px-3 py-2 text-[13px] text-muted">Places you add from chat, Explore or the map wait here until you put them on a day.</li>
          ) : null}
        </ul>
      </SortableContext>
    </section>
  );
}
