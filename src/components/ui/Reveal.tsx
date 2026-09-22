"use client";

import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

/**
 * Fades and lifts its children in: on the next frame after mount when `immediate`, otherwise
 * the first time they scroll into view, with an optional stagger delay. Reduced-motion users
 * get the content without the movement (see globals.css).
 */
export function Reveal({
  children,
  delay = 0,
  immediate = false,
  className,
  as: Tag = "div",
  style,
  ...rest
}: { children: ReactNode; delay?: number; immediate?: boolean; className?: string; as?: "div" | "section" | "article" | "li" } & HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (immediate || !el || typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [immediate]);

  const merged = delay ? ({ ...style, "--xp-delay": `${delay}ms` } as CSSProperties) : style;
  return (
    <Tag ref={ref as never} className={clsx("xp-reveal", shown && "is-shown", className)} style={merged} {...rest}>
      {children}
    </Tag>
  );
}
