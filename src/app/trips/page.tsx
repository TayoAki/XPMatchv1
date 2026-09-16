"use client";

import { Calendar, Trash2, Users, Wallet } from "lucide-react";
import { PageFrame, EmptyState } from "@/components/PageFrame";
import { Button } from "@/components/ui/Button";
import { PlaceImage } from "@/components/ui/PlaceImage";
import { useTravelStore, formatDateRange } from "@/lib/store";
import { useUiState } from "@/components/providers/UiState";
import { useSendMessage } from "@/components/chat/useSendMessage";

export default function TripsPage() {
  const { trips, removeTrip } = useTravelStore();
  const { openPlanner } = useUiState();
  const send = useSendMessage();
  return (
    <PageFrame
      title="Trips"
      description="Plans you confirmed in chat. Ask XPMatch to keep refining them."
      actions={<Button onClick={() => openPlanner("where")}>Create a trip</Button>}
    >
      {trips.length === 0 ? (
        <EmptyState title="No trips yet" body="Ask the assistant to plan a trip and confirm the proposal to save it here." action={<Button onClick={() => openPlanner("where")}>Create a trip</Button>} />
      ) : (
        <div className="grid gap-5">
          {trips.map((t) => (
            <article key={t.id} className="overflow-hidden rounded-3xl border border-border bg-white">
              <div className="grid md:grid-cols-[280px_1fr]">
                <PlaceImage queries={[t.destination]} alt={t.destination} className="min-h-[180px]" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[20px] font-semibold tracking-tight">{t.title}</h2>
                      <div className="mt-1 flex flex-wrap gap-2 text-[13px] text-muted">
                        <span>{t.destination}</span>
                        {t.startDate ? (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> {formatDateRange(t.startDate, t.endDate)}
                          </span>
                        ) : null}
                        {t.travelers ? (
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" /> {t.travelers}
                          </span>
                        ) : null}
                        {t.budgetTier ? (
                          <span className="inline-flex items-center gap-1">
                            <Wallet className="h-3.5 w-3.5" /> {t.budgetTier}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button type="button" onClick={() => removeTrip(t.id)} aria-label="Delete trip" className="rounded-full p-2 text-neutral-500 hover:bg-surface hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {t.summary ? <p className="mt-3 text-[14px] text-neutral-700">{t.summary}</p> : null}
                  <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                    {t.itinerary.map((d) => (
                      <li key={d.day} className="rounded-xl bg-surface/70 p-3">
                        <div className="text-[13px] font-semibold">
                          Day {d.day} · <span className="text-neutral-600">{d.title}</span>
                        </div>
                        <ul className="mt-1 list-disc pl-4 text-[13px] text-neutral-700">
                          {d.items.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => send(`Find hotels for my trip "${t.title}" to ${t.destination}${t.startDate ? ` (${t.startDate} to ${t.endDate ?? ""})` : ""}.`)}>
                      Find hotels
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => send(`Recommend restaurants for my trip "${t.title}" to ${t.destination}.`)}>
                      Restaurants
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => send(`What should I pack for my trip "${t.title}" to ${t.destination}? Check the weather if it's soon.`)}>
                      Weather & packing
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
