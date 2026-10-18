import type { Transition, Variants } from "framer-motion";

/** Contract Rule 1 — slow motion, constant across every page. */
export const DURATION = {
  page: 1.2,
  card: 1.0,
  hover: 0.6,
  quote: 1.4,
  drift: 8,
} as const;

export const EASE = {
  gentle: [0.22, 1, 0.36, 1] as [number, number, number, number],
  cinematic: [0.65, 0, 0.35, 1] as [number, number, number, number],
};

export const pageEnter: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.page, ease: EASE.gentle },
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.card, ease: EASE.gentle },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.card, ease: EASE.gentle } },
};

/** Slow vertical float — used by the login bubbles. */
export function driftTransition(seed = 0): Transition {
  return {
    duration: DURATION.drift + (seed % 4),
    repeat: Infinity,
    repeatType: "mirror",
    ease: "easeInOut",
    delay: seed * 0.4,
  };
}
