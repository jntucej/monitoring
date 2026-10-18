import type { Transition } from "framer-motion";

export const SPRING_STORY: Transition = {
  type: "spring",
  stiffness: 120,
  damping: 18,
  mass: 0.9,
};

export const SPRING_HOVER: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 22,
  mass: 0.5,
};

export const SPRING_COUNTER: Transition = {
  type: "spring",
  stiffness: 90,
  damping: 20,
  mass: 1.0,
};

export const SPRING_PARALLAX: Transition = {
  type: "spring",
  stiffness: 60,
  damping: 24,
  mass: 1.2,
};

export const SPRING_SCENE: Transition = {
  type: "spring",
  stiffness: 45,
  damping: 20,
  mass: 1.4,
};

export const SPRING_CURSOR: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 0.3,
};

export function springForTier(tier: "full" | "reduced" | "static"): Transition {
  if (tier === "static") {
    return { duration: 0 };
  }
  if (tier === "reduced") {
    return { duration: 0.2, ease: "easeOut" };
  }
  return SPRING_STORY;
}
