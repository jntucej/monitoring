"use client";

import { useEffect, useState } from "react";

export type PerformanceTier = "full" | "reduced" | "static";

export function usePerformanceTier(): PerformanceTier {
  const [tier, setTier] = useState<PerformanceTier>("full");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check prefers-reduced-motion or save-data
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

    if (prefersReducedMotion || saveData) {
      setTier("static");
      return;
    }

    // Check hardware concurrency & device memory if available
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
    const effectiveType = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType;

    if (cores < 4 || memory < 4 || effectiveType === "2g" || effectiveType === "3g") {
      setTier("reduced");
      return;
    }

    // Check WebGL support
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        setTier("static");
      }
    } catch {
      setTier("static");
    }
  }, []);

  return tier;
}
