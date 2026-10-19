import type { Transition } from "framer-motion";

// ─── Springs — ordered by weight ─────────────────────────────
export const SPRING_SNAP:     Transition = { type: "spring", stiffness: 500, damping: 30, mass: 0.3 };
export const SPRING_STORY:    Transition = { type: "spring", stiffness: 120, damping: 18, mass: 0.9 };
export const SPRING_WEIGHT:   Transition = { type: "spring", stiffness: 200, damping: 28, mass: 1.4 };
export const SPRING_BOUNCE:   Transition = { type: "spring", stiffness: 300, damping: 15, mass: 0.7 };
export const SPRING_BARRIER:  Transition = { type: "spring", stiffness: 45,  damping: 12, mass: 1.0 };
export const SPRING_CRITICAL: Transition = { type: "spring", stiffness: 180, damping: 26, mass: 1.0 };
export const SPRING_LIQUID:   Transition = { type: "spring", stiffness: 80,  damping: 20, mass: 1.2 };
export const SPRING_MAGNETIC: Transition = { type: "spring", stiffness: 350, damping: 28, mass: 0.6 };
export const SPRING_PARALLAX: Transition = { type: "spring", stiffness: 60,  damping: 24, mass: 1.2 };
export const SPRING_SCENE:    Transition = { type: "spring", stiffness: 45,  damping: 20, mass: 1.4 };
export const SPRING_DRAG:     Transition = { type: "spring", stiffness: 400, damping: 30, mass: 0.8 };
export const SPRING_CURSOR:   Transition = { type: "spring", stiffness: 500, damping: 30, mass: 0.3 };
export const SPRING_COUNTER:  Transition = { type: "spring", stiffness: 90,  damping: 20, mass: 1.0 };

// ─── Drift ──────────────────────────────────────────────────
export const EASE_DRIFT = [0.16, 1, 0.3, 1] as const;
export const EASE_SOFT = [0.4, 0, 0.2, 1] as const;
export const DUR_FAST = 0.6;
export const DUR_BASE = 1.2;
export const DUR_SLOW = 2.4;
export const DUR_CINEMA = 3.0;

// ─── Bounce configs for drag ────────────────────────────────
export const DRAG_TRANSITION = { bounceStiffness: 400, bounceDamping: 28 } as const;

// ─── Reduced-motion fallback ────────────────────────────────
export const STATIC_TRANSITION: Transition = { duration: 0 };

export function springForTier(tier: "high" | "mid" | "low"): Transition {
  return tier === "low" ? STATIC_TRANSITION : SPRING_STORY;
}
