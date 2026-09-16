"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * The trip a screen is about (trip page, or a chat opened from one). Messages
 * sent from inside the scope stay attached to that trip and "Add to trip"
 * preselects it.
 */
const TripScopeContext = createContext<string | null>(null);

export function TripScopeProvider({ tripId, children }: { tripId: string | null; children: ReactNode }) {
  return <TripScopeContext.Provider value={tripId}>{children}</TripScopeContext.Provider>;
}

export function useTripScope(): string | null {
  return useContext(TripScopeContext);
}
