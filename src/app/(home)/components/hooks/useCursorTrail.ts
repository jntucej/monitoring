"use client";

import { useEffect } from "react";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

/**
 * Spawns a short-lived div at the pointer, on a fixed rAF-throttled
 * schedule. Non-interactive, auto-cleans itself.
 */
export function useCursorTrail(enabled = true) {
  const tier = usePerformanceTier();
  const reduced = useReducedMotionSafe();

  useEffect(() => {
    if (!enabled || reduced || tier !== "full") return;
    if (window.matchMedia("(pointer: coarse)").matches) return; // touch

    let last = 0;
    const THROTTLE_MS = 45;

    const spawn = (x: number, y: number) => {
      const dot = document.createElement("div");
      dot.setAttribute("aria-hidden", "true");
      dot.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 6px;
        height: 6px;
        margin: -3px 0 0 -3px;
        border-radius: 9999px;
        background: rgba(245, 166, 35, 0.55);
        box-shadow: 0 0 12px rgba(245, 166, 35, 0.55);
        pointer-events: none;
        z-index: 3;
        will-change: transform, opacity;
        transition: transform 700ms cubic-bezier(0.16,1,0.3,1),
                    opacity 700ms ease-out;
      `;
      document.body.appendChild(dot);
      requestAnimationFrame(() => {
        dot.style.transform = "translate3d(0, -8px, 0) scale(0.4)";
        dot.style.opacity = "0";
      });
      window.setTimeout(() => dot.remove(), 750);
    };

    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - last < THROTTLE_MS) return;
      last = now;
      spawn(e.clientX, e.clientY);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled, reduced, tier]);
}
