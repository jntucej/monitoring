"use client";

import type { RefObject } from "react";
import {
  useMotionValue,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useReducedMotion } from "framer-motion";

/**
 * useGradientHeadline — a MotionValue<string> that returns a CSS
 * `background-position` value, driven by the user's scroll through the
 * element the caller points `ref` at.
 *
 * Intended to pair with a CSS class like:
 * ```css
 * background: linear-gradient(90deg, a, b, c, b, a);
 * background-size: 200% 100%;
 * background-clip: text;
 * -webkit-text-fill-color: transparent;
 * ```
 * and applied via `style={{ backgroundPosition }}`.
 *
 * The gradient SHIFTS as the user scrolls; it never runs on a timer.
 *
 * On prefers-reduced-motion the returned motion value is a frozen
 * "50% 50%" so the headline still shows a static gradient but the scroll
 * link is inert. All hooks run unconditionally to respect the rules of
 * hooks.
 */
export function useGradientHeadline(
  ref: RefObject<HTMLElement | null>,
): MotionValue<string> {
  const prefersReduced = useReducedMotion();

  // Hooks must run in the same order every render, so the scroll-linked
  // value is always computed; reduced motion simply gates it at use time.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const linked = useTransform(scrollYProgress, [0, 1], [
    "0% 50%",
    "100% 50%",
  ]);

  const frozen = useMotionValue("50% 50%");

  if (prefersReduced) return frozen;
  return linked;
}
