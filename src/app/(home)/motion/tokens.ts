import type { Transition } from "framer-motion";

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.76, 0, 0.24, 1] as const;
export const SPRING = { type: "spring", stiffness: 300, damping: 24 } as const;
export const SPRING_SOFT = { type: "spring", stiffness: 180, damping: 22 } as const;
export const COLORS = {
  primary: "#0072ff",
  accent: "#a855f7",
  success: "#22c55e",
  warning: "#f59e0b",
} as const;
export const revealViewport = { once: true, margin: "-80px" } as const;
export const fadeUp = (delay = 0): Transition => ({
  duration: 0.6,
  ease: EASE_OUT,
  delay,
});
