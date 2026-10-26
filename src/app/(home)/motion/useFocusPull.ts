"use client";

import type { RefObject } from "react";
import { useEffect, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

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
  // framer-motion's useInView reports false on the server and on the first
  // client render (before the IntersectionObserver fires), then flips to
  // true when the element is observed in-view. Consuming it directly would
  // paint the title in the "resting" (0.1em / blur(2px)) state on both the
  // server and first client render, then jump to the in-view state after
  // hydration — a visible shift. Instead, seed the assumption as in-view on
  // both server and first client render; only after mount do we start
  // trusting the observer's real value. The consumer's 500ms CSS transition
  // makes any later out-of-view reset animate rather than snap.
  const inView = useInView(ref, { once: false, margin: "-20%" });
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(true);
  }, []);
  const effectiveInView = !settled || inView;

  if (reduced) {
    return { letterSpacing: "0em", filter: "blur(0px)", inView: true, reduced };
  }
  return {
    letterSpacing: effectiveInView ? "0em" : "0.1em",
    filter: effectiveInView ? "blur(0px)" : "blur(2px)",
    inView: effectiveInView,
    reduced,
  };
}
