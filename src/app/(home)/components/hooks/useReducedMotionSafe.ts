"use client";

import { useReducedMotion } from "framer-motion";
import { usePerformanceTier } from "./usePerformanceTier";

export function useReducedMotionSafe(): boolean {
  const prefersReduced = useReducedMotion() ?? false;
  const tier = usePerformanceTier();
  return prefersReduced || tier === "static";
}
