"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

interface Spot {
  x: number;
  y: number;
}

/**
 * FLIP reordering for the children of `container` marked with `data-flip-key`. Their layout
 * positions are remembered after every render; when `orderKey` changes (a card moving to the
 * end of a row), each child that moved is shifted back to where it was and eased to its new
 * place, so the reorder reads as movement rather than a jump. Layout offsets, not screen
 * rects, are compared, so scrolling the row or the page between renders never fakes a move.
 * Skipped for people who prefer reduced motion.
 */
export function useFlip(container: RefObject<HTMLElement | null>, orderKey: string) {
  const spots = useRef(new Map<string, Spot>());
  const lastKey = useRef<string | null>(null);

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-flip-key]"));
    const next = new Map<string, Spot>();
    for (const node of nodes) next.set(node.dataset.flipKey ?? "", { x: node.offsetLeft, y: node.offsetTop });

    const reordered = lastKey.current !== null && lastKey.current !== orderKey;
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reordered && !reduced) {
      for (const node of nodes) {
        const key = node.dataset.flipKey ?? "";
        const before = spots.current.get(key);
        const after = next.get(key);
        if (!before || !after) continue;
        const dx = before.x - after.x;
        const dy = before.y - after.y;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
        node.style.transition = "none";
        node.style.transform = `translate(${dx}px, ${dy}px)`;
        void node.offsetWidth; // commit the start position before the transition begins
        requestAnimationFrame(() => {
          node.style.transition = "transform 480ms var(--xp-ease)";
          node.style.transform = "";
          const clear = (e: TransitionEvent) => {
            if (e.target !== node || e.propertyName !== "transform") return;
            node.style.transition = "";
            node.removeEventListener("transitionend", clear);
          };
          node.addEventListener("transitionend", clear);
        });
      }
    }
    spots.current = next;
    lastKey.current = orderKey;
  });
}
