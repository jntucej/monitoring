"use client";

import type { RefObject } from "react";
import { useInView } from "framer-motion";
import { useReducedMotion } from "framer-motion";

/**
 * useFocusPull — letter-spacing + blur "focus" reveal on scroll-into-view.
 *
 * While the element is in the viewport, letter-spacing tightens
 * 0.1em -> 0 and filter: blur(2px) -> blur(0px). When it leaves the
 * viewport the values reset so the pull replays on re-entry.
 *
 * Exposes the two CSS values as plain strings plus the raw inView /
 * reduced flags. The consumer applies them to `style` with a CSS
 * `transition` (letter-spacing and filter are cheap enough for a 500ms
 * reveal and are not GPU-critical like transform). This keeps the hook
 * pure and rules-of-hooks safe.
 *
 * Reduced motion: returns the rest state (0em / blur(0px)) immediately
 * and the consumer should also suppress the CSS transition.
 */

export interface FocusPull {
  letterSpacing: string;
  filter: string;
  inView: boolean;
  reduced: boolean;
}

export function useFocusPull(
  ref: RefObject<HTMLElement | null>,
): FocusPull {
  const reduced = useReducedMotion() ?? false;
  const inView = useInView(ref, { once: false, margin: "-20%" });

  if (reduced) {
    return { letterSpacing: "0em", filter: "blur(0px)", inView: true, reduced };
  }
  return {
    letterSpacing: inView ? "0em" : "0.1em",
    filter: inView ? "blur(0px)" : "blur(2px)",
    inView,
    reduced,
  };
}
