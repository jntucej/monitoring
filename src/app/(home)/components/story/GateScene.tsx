"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Stage, HeroScene, ParticleField, StaticHero } from "../webgl";
import { useStickyParallax } from "../hooks/useParallax";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

export function GateScene() {
  const reduced = useReducedMotionSafe();
  const { ref, progress } = useStickyParallax();

  const canvasScale   = useTransform(progress, [0, 1], [1, 1.15]);
  const canvasY       = useTransform(progress, [0, 1], [0, -40]);
  const canvasOpacity = useTransform(progress, [0, 0.9, 1], [1, 1, 0]);

  const brandY        = useTransform(progress, [0, 0.5], [24, 0]);
  const brandOpacity  = useTransform(progress, [0.05, 0.25, 0.85, 1], [0, 1, 1, 0]);

  const headlineY     = useTransform(progress, [0, 1], [0, -140]);
  const headlineOpacity = useTransform(progress, [0, 0.1, 0.85, 1], [0, 1, 1, 0]);
  const headlineScale = useTransform(progress, [0, 1], [1, 0.92]);

  const subY          = useTransform(progress, [0.1, 1], [0, -200]);
  const subOpacity    = useTransform(progress, [0.15, 0.35, 0.85, 1], [0, 1, 1, 0]);

  return (
    <section ref={ref} className="relative bg-black" style={{ height: "170vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden bg-black">
        <motion.div
          style={{
            scale: reduced ? 1 : canvasScale,
            y: reduced ? 0 : canvasY,
            opacity: reduced ? 1 : canvasOpacity,
          }}
          className="absolute inset-0"
        >
          <Stage fallback={<StaticHero accent="amber" />}>
            <HeroScene accent="amber" />
            <ParticleField accent="amber" />
          </Stage>
        </motion.div>
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
          <motion.div
            style={{
              opacity: reduced ? 1 : brandOpacity,
              y: reduced ? 0 : brandY,
            }}
            className="mb-6 text-xs font-medium uppercase tracking-[0.4em] text-[var(--home-accent-amber)]"
          >
            UCEJ Monitoring
          </motion.div>
          <motion.h1
            style={{
              opacity: reduced ? 1 : headlineOpacity,
              y: reduced ? 0 : headlineY,
              scale: reduced ? 1 : headlineScale,
            }}
            className="max-w-3xl font-serif text-4xl leading-tight text-[var(--home-text-primary)] md:text-6xl"
          >
            Every campus has a door.
            <br />
            We gave it a memory.
          </motion.h1>
          <motion.p
            style={{
              opacity: reduced ? 1 : subOpacity,
              y: reduced ? 0 : subY,
            }}
            className="mt-8 max-w-md text-sm text-[var(--home-text-secondary)]"
          >
            Scroll to see it.
          </motion.p>
        </div>
        <motion.div
          aria-hidden
          style={{ y: reduced ? 0 : useTransform(progress, [0, 1], [0, -260]) }}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-32 bg-gradient-to-t from-[var(--home-bg-base)] to-transparent"
        />
      </div>
    </section>
  );
}
