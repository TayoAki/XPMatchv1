"use client";

import { useEffect, useState } from "react";

export interface AppConfig {
  mode: "live" | "demo";
  model: string;
  places?: "google" | "fallback";
}

const FALLBACK: AppConfig = { mode: "live", model: "unknown", places: "fallback" };

let cached: Promise<AppConfig> | null = null;

function load(): Promise<AppConfig> {
  if (cached) return cached;
  const promise: Promise<AppConfig> = fetch("/api/config")
    .then(async (r) => (r.ok ? ((await r.json()) as AppConfig) : FALLBACK))
    .catch(() => FALLBACK);
  cached = promise;
  return promise;
}

export function useAppConfig(): AppConfig | null {
  const [config, setConfig] = useState<AppConfig | null>(null);
  useEffect(() => {
    let active = true;
    load().then((c) => {
      if (active) setConfig(c);
    });
    return () => {
      active = false;
    };
  }, []);
  return config;
}
