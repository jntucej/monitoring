"use client";
import { useEffect, useState } from "react";

/**
 * useBreakpoint - React hook that tracks the current breakpoint name.
 * Matches Tailwind's sm/md/lg/xl/2xl breakpoints.
 * Use this instead of raw window.innerWidth checks for responsive logic.
 */
export function useBreakpoint(breakpoints: Record<string, string>): Record<string, boolean> {
  const [matches, setMatches] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const queryMedia = Object.entries(breakpoints).map(
      ([key, query]) => ({
        key,
        query,
        mql: window.matchMedia(query),
      })
    );

    const updateMatches = () => {
      const newMatches: Record<string, boolean> = {};
      for (const { key, mql } of queryMedia) {
        newMatches[key] = mql.matches;
      }
      setMatches(newMatches);
    };

    updateMatches();

    for (const { mql } of queryMedia) {
      mql.addEventListener("change", updateMatches);
    }

    return () => {
      for (const { mql } of queryMedia) {
        mql.removeEventListener("change", updateMatches);
      }
    };
  }, []);

  return matches;
}

/**
 * useIsMobile - Returns true when viewport is below md breakpoint (768px)
 */
export const useIsMobile = () => {
  const bp = useBreakpoint({ sm: "(min-width: 640px)", md: "(min-width: 768px)", lg: "(min-width: 1024px)" });
  return !bp.md;
};

/**
 * Use this hook whenever you need to make responsive logic decisions
 * (e.g., disabling animations on mobile, switching layouts).
 * Avoid raw window.innerWidth checks — they cause hydration mismatches
 * and don't react to resize events.
 */
export function useResponsive() {
  const [isMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  const [isTouch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);

  // Track responsive state without triggering re-renders on every resize
  // (only for one-off checks during initialization)
  return { isMobile, isTouch };
}
