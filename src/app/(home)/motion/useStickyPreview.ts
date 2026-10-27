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

    // Card geometry cache: top + height, read ONCE per card then only
    // refreshed when an IntersectionObserver fires (card enters/exits the
    // viewport) or the window is resized. Reading the cache on every
    // scroll frame avoids 8x getBoundingClientRect() per frame, which
    // is the main TBT/long-task contributor of this hook.
    const cache = new Map<Element, { top: number; height: number }>();

    const refreshCache = () => {
      const cards = cardRefs.current ?? [];
      for (const el of cards) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        cache.set(el, { top: r.top + window.scrollY, height: r.height });
      }
    };

    const pickFromCache = () => {
      const cards = cardRefs.current ?? [];
      if (cards.length === 0) return;
      const hotZoneY = window.innerHeight * hotZone + window.scrollY;
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < cards.length; i++) {
        const el = cards[i];
        if (!el) continue;
        const c = cache.get(el);
        if (!c) continue;
        const center = c.top + c.height / 2;
        const dist = Math.abs(center - hotZoneY);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      setActiveIndex((cur) => (cur === best ? cur : best));
    };

    // Scroll: cheap — only reads the cache, no layout reads.
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(pickFromCache);
    };

    // Resize: cache is stale; re-read once, then pick.
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        refreshCache();
        pickFromCache();
      });
    };

    // IntersectionObserver: fires when a card crosses a threshold boundary;
    // re-read ONLY the cards whose geometry could have shifted.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const r = e.target.getBoundingClientRect();
          cache.set(e.target, {
            top: r.top + window.scrollY,
            height: r.height,
          });
        }
        pickFromCache();
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    const cards = cardRefs.current ?? [];
    cards.forEach((el) => el && io.observe(el));

    // Initial read + start listening.
    refreshCache();
    pickFromCache();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [cardRefs, hotZone, root, reduced, prefersReduced]);

  return activeIndex;
}
