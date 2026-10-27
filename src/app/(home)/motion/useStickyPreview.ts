"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useReducedMotionSafe } from "../components/hooks/useReducedMotionSafe";

/**
 * useStickyPreview — native scroll-linked "which card is in the hot zone"
 * detector for the Modules section.
 *
 * Returns the active card index based on which card's vertical center sits
 * closest to the "hot zone" (~40% viewport height by default). No
 * scroll-jacking, no scroll-snap: just an IntersectionObserver + a passive
 * scroll listener + an initial read.
 *
 * The caller pairs the returned index with a shared `layoutId` so the
 * preview panel morphs to the new card's content instead of crossfading.
 *
 * Reduced motion: the hook still tracks the active index (the panel swap
 * is instant, no motion involved), so it behaves the same under
 * `prefers-reduced-motion: reduce`.
 */

export interface StickyPreviewOptions {
  /** Viewport fraction at which a card is considered "in view" (0..1).
   *  Default 0.4 = 40% from the top of the viewport. */
  hotZone?: number;
  /** Root element to observe against. Defaults to document. */
  root?: Element | null;
}

export function useStickyPreview(
  _containerRef: React.RefObject<HTMLElement | null>,
  cardRefs: React.RefObject<(HTMLElement | null)[]>,
  opts: StickyPreviewOptions = {},
): number {
  const { hotZone = 0.4, root = null } = opts;
  const reduced = useReducedMotionSafe();
  const prefersReduced = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let raf = 0;
    const evaluate = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const cards = cardRefs.current ?? [];
        if (cards.length === 0) return;
        const hotZoneY = window.innerHeight * hotZone;
        let best = 0;
        let bestDist = Infinity;
        for (let i = 0; i < cards.length; i++) {
          const el = cards[i];
          if (!el) continue;
          const r = el.getBoundingClientRect();
          const center = r.top + r.height / 2;
          const dist = Math.abs(center - hotZoneY);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        }
        setActiveIndex((cur) => (cur === best ? cur : best));
      });
    };

    const cards = cardRefs.current ?? [];
    const io = new IntersectionObserver(
      () => evaluate(),
      { threshold: [0.01, 0.5, 1], root: root ?? null },
    );
    cards.forEach((el) => el && io.observe(el));

    const onScroll = () => evaluate();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    evaluate();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [cardRefs, hotZone, root, reduced, prefersReduced]);

  return activeIndex;
}
