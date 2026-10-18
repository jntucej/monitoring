import type { Transition, Variants } from "framer-motion";

export const DURATION = {
  page: 1.4,
  card: 1.6,
  chapter: 2.2,
  hover: 0.8,
  quote: 1.8,
  drift: 14,
  breath: 24,
} as const;

export const EASE = {
  gentle: [0.22, 1, 0.36, 1] as [number, number, number, number],
  cinematic: [0.65, 0, 0.35, 1] as [number, number, number, number],
};

export const pageEnter: Variants = {
  hidden: { opacity: 0.85 },
  show: { opacity: 1, transition: { duration: DURATION.page, ease: EASE.gentle } },
};

export const fadeUp: Variants = {
  hidden: { y: 16 },
  show: { y: 0, transition: { duration: DURATION.card, ease: EASE.gentle } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0.6 },
  show: { opacity: 1, transition: { duration: DURATION.card, ease: EASE.gentle } },
};

export const slideUp: Variants = {
  hidden: { y: "100%" },
  show: { y: "0%", transition: { duration: DURATION.page, ease: EASE.gentle } },
};

export function driftTransition(seed = 0): Transition {
  return {
    duration: DURATION.drift + (seed % 4),
    repeat: Infinity,
    repeatType: "mirror",
    ease: "easeInOut",
    delay: seed * 0.5,
  };
}
