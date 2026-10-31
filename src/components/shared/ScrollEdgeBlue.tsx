"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * ScrollEdgeBlue — a scroll-linked, progressive variable-blue blur veil that
 * fades in at the top and bottom edges of a scroll container.
 *
 * The component only writes two CSS variables (`--edge-top`, `--edge-bottom`)
 * on the container element as the user scrolls; the actual blur is composited
 * entirely in CSS (see .scroll-edge-blue in globals.css). Zero work on the
 * paint path — the scroll listener is a cheap passive read + two style
 * writes. The veil is invisible at the exact edge and ramps up over ~140px,
 * so the sharp-focus zone in the center of the content is what the eye rests
 * on.
 *
 * Respects prefers-reduced-motion: when reduced, the CSS disables the ramp and
 * applies a constant subtle veil instead.
 */
export interface ScrollEdgeBlueProps {
  children: React.ReactNode;
  /** Extra classes to merge into the scroll container. */
  className?: string;
  /** Pass true to use the banded (3-layer) blur variant. */
  banded?: boolean;
}

export function ScrollEdgeBlue({
  children,
  className,
  banded = false,
}: ScrollEdgeBlueProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const top = el.scrollTop;
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      const bottom = Math.max(0, max - top);
      // If container is not scrollable, don't show edge blur
      const topVar = max > 0 ? Math.min(1, top / 140) : 0;
      const bottomVar = max > 0 ? Math.min(1, bottom / 140) : 0;
      el.style.setProperty("--edge-top", String(topVar));
      el.style.setProperty("--edge-bottom", String(bottomVar));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // Observe size changes of the container or its content to recompute blur immediately
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        onScroll();
      });
      ro.observe(el);
      if (el.firstElementChild) {
        ro.observe(el.firstElementChild);
      }
    }

    onScroll();

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (ro) ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "scroll-edge-blue h-full overflow-y-auto relative",
        banded && "scroll-edge-blue-banded",
        className
      )}
    >
      {children}
    </div>
  );
}

export default ScrollEdgeBlue;
