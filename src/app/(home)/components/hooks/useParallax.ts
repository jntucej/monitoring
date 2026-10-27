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
  layer0: MotionValue<number>;
  layer1: MotionValue<number>;
  layer2: MotionValue<number>;
  layerFade: MotionValue<number>;
} {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const smoothed = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 1 });
  // Precompute the four standard layers (hero, mid, far, fade) as hooks so
  // they satisfy react-hooks/rules-of-hooks (no hooks inside callbacks).
  const layer0 = useTransform(smoothed, [0, 1], [0.3 * 1.35 * 100, 0.3 * 1.35 * -100]);
  const layer1 = useTransform(smoothed, [0, 1], [0.5 * 1.35 * 100, 0.5 * 1.35 * -100]);
  const layer2 = useTransform(smoothed, [0, 1], [0.8 * 1.35 * 100, 0.8 * 1.35 * -100]);
  const layerFade = useTransform(smoothed, [0, 0.3, 0.8, 1], [0, 1, 1, 0]);
  return { ref, progress: smoothed, layer0, layer1, layer2, layerFade };
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
