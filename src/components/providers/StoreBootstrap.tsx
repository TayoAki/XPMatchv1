"use client";

import { useEffect } from "react";
import { travelActions } from "@/lib/store";

/** Loads the signed-in user's data once the app mounts. */
export function StoreBootstrap() {
  useEffect(() => {
    void travelActions.hydrate();
  }, []);
  return null;
}
