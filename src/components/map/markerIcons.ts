import type { PlaceKind } from "@/lib/places/types";

/** Lucide icon paths (24x24 viewBox) used inside map markers. */
const PATHS: Record<PlaceKind, string> = {
  hotel: '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/>',
  restaurant:
    '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  attraction:
    '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
  destination: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
};

export function iconSvg(kind: PlaceKind, size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[kind]}</svg>`;
}

export interface MarkerOptions {
  focus?: boolean;
  /** Text label next to the pin (Explore style). */
  label?: string;
  /** Short text inside the pin instead of the icon, e.g. the stop number of a day. */
  badge?: string;
  /** Pin color (itinerary days are colored per day). */
  color?: string;
}

export function buildMarkerElement(kind: PlaceKind, name: string, options: MarkerOptions = {}): HTMLElement {
  const el = document.createElement("div");
  el.className = options.focus ? "xp-marker xp-marker--focus" : options.badge ? "xp-marker xp-marker--poi xp-marker--day" : "xp-marker xp-marker--poi";
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", options.badge ? `${options.badge}. ${name}` : name);
  if (options.color) el.style.setProperty("--xp-pin", options.color);
  const pin = document.createElement("div");
  pin.className = "xp-marker-pin";
  if (options.badge) pin.textContent = options.badge;
  else pin.innerHTML = iconSvg(options.focus ? "destination" : kind, options.focus ? 18 : 16);
  el.appendChild(pin);
  const labelText = options.focus ? name : options.label;
  if (labelText) {
    const label = document.createElement("div");
    label.className = "xp-marker-label";
    label.textContent = labelText;
    el.appendChild(label);
  }
  return el;
}

export function setMarkerState(el: HTMLElement, state: { selected?: boolean; hovered?: boolean }) {
  el.classList.toggle("is-selected", !!state.selected);
  el.classList.toggle("is-hovered", !!state.hovered);
}
