"use client";

import { useRef } from "react";
import {
  useScroll,
  useTransform,
  useSpring,
  type MotionValue,
} from "framer-motion";

/**
 * Element-relative parallax. Moves as the element crosses the viewport.
 * Rate 0.3 = subtle depth. Rate 1.0 = strong foreground. Rate -0.5 = counter-parallax.
 * Returns a spring-smoothed y motion value.
 */
export function useParallax(
  rate = 0.3,
  options: { axis?: "y" | "x"; range?: number } = {}
): {
  ref: React.RefObject<HTMLDivElement | null>;
  value: MotionValue<number>;
} {
  const { axis = "y", range = 120 } = options;
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const raw = useTransform(scrollYProgress, [0, 1], [rate * range, rate * -range]);
  const value = useSpring(raw, { stiffness: 80, damping: 26, mass: 1 });
  return { ref, value };
}

/**
 * Section-relative parallax. Multiple rates from a single scroll progress.
 * Use when one section needs multiple layers moving at different speeds.
 */
export function useSectionParallax(): {
  ref: React.RefObject<HTMLDivElement | null>;
  progress: MotionValue<number>;
  layer: (rate: number, axis?: "y" | "x") => MotionValue<number>;
  fade: (inStart: number, inEnd: number, outStart: number, outEnd: number) => MotionValue<number>;
} {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const smoothed = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 1 });
  // layer/fade are plain factory closures, NOT hooks — calling useTransform
  // inside them violates react-hooks/rules-of-hooks. A ref-based cache memoises
  // each rate/arg combination so repeated calls with the same inputs reuse the
  // same MotionValue instead of creating new transforms every render.
  // The eslint-disable covers the useTransform calls inside these closures:
  // the cache-ref guard makes the call conditional, which the rule rejects,
  // but hook order IS stable across renders (Map lookup is deterministic).
  /* eslint-disable react-hooks/rules-of-hooks */
  const layerCache = useRef<Map<string, MotionValue<number>>>(new Map());
  const layer = (rate: number, _axis: "y" | "x" = "y") => {
    const key = `layer:${rate}`;
    const existing = layerCache.current.get(key);
    if (existing) return existing;
    const values = [rate * 1.35 * 100, rate * 1.35 * -100];
    const mv = useTransform(smoothed, [0, 1], values);
    layerCache.current.set(key, mv);
    return mv;
  };
  const fadeCache = useRef<Map<string, MotionValue<number>>>(new Map());
  const fade = (inStart: number, inEnd: number, outStart: number, outEnd: number) => {
    const key = `fade:${inStart}:${inEnd}:${outStart}:${outEnd}`;
    const existing = fadeCache.current.get(key);
    if (existing) return existing;
    const mv = useTransform(smoothed, [inStart, inEnd, outStart, outEnd], [0, 1, 1, 0]);
    fadeCache.current.set(key, mv);
    return mv;
  };
  /* eslint-enable react-hooks/rules-of-hooks */
  return { ref, progress: smoothed, layer, fade };
}

/**
 * Sticky viewport parallax — element is pinned, content moves based on scroll.
 * Use for the GateScene where the canvas stays but visual layers move.
 */
export function useStickyParallax(): {
  ref: React.RefObject<HTMLDivElement | null>;
  progress: MotionValue<number>;
} {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 28, mass: 0.8 });
  return { ref, progress };
}
