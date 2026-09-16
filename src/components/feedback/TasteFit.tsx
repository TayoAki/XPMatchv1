"use client";

import { Sparkles } from "lucide-react";
import type { PlaceKind } from "@/lib/places/types";
import { useTravelStore } from "@/lib/store";
import { fitsYourTaste } from "@/lib/feedback/taste";

/** "Fits your taste" line computed from recorded reactions; renders nothing without real overlap. */
export function TasteFit({ kind, name, category, text }: { kind: PlaceKind; name?: string; category?: string; text?: string }) {
  const { taste } = useTravelStore();
  const line = fitsYourTaste({ kind, name, category, text }, taste);
  if (!line) return null;
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[12px] font-medium text-violet-700" data-testid="taste-fit">
      <Sparkles className="h-3 w-3" /> Fits your taste · {line}
    </div>
  );
}
