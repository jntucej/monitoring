"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";
import type { Scene } from "./scenes";
import { SpringCounter } from "../ui/SpringCounter";
import { SPRING_STORY } from "../hooks/useSpringConfig";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

export interface SceneFrameProps {
  scene: Scene;
  visual: ReactNode;
}

const ACCENT_VAR = {
  amber:   "var(--home-accent-amber)",
  emerald: "var(--home-accent-navy)",
  steel:   "var(--home-accent-steel)",
  crimson: "var(--home-accent-crimson)",
  violet:  "var(--home-accent-indigo)",
} as const;

export function SceneFrame({ scene, visual }: SceneFrameProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.3 });
  const reduced = useReducedMotionSafe();
  const accentVar = ACCENT_VAR[scene.accent];
  const num = String(scene.order).padStart(2, "0");

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { ...SPRING_STORY, delay: reduced ? 0 : i * 0.1 },
    }),
  };

  return (
    <section
      ref={sectionRef}
      id={`scene-${scene.id}`}
      data-scene={scene.id}
      className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-24 md:px-10"
    >
      <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center">
        <div>
          <motion.div
            custom={0} initial="hidden" animate={inView ? "visible" : "hidden"} variants={variants}
            className="mb-6 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em]"
            style={{ color: accentVar }}
          >
            <span>{num}</span>
            <span className="h-px w-8" style={{ background: accentVar }} />
            <span>{scene.id.replace("wholecampus", "whole campus")}</span>
          </motion.div>
          <motion.h2
            custom={1} initial="hidden" animate={inView ? "visible" : "hidden"} variants={variants}
            className="font-serif text-4xl leading-tight tracking-tight text-[var(--home-text-primary)] md:text-5xl"
          >
            {scene.tagline}
          </motion.h2>
          <motion.p
            custom={2} initial="hidden" animate={inView ? "visible" : "hidden"} variants={variants}
            className="mt-5 max-w-md text-base leading-relaxed text-[var(--home-text-secondary)] md:text-lg"
          >
            {scene.sub}
          </motion.p>
          <motion.div
            custom={3} initial="hidden" animate={inView ? "visible" : "hidden"} variants={variants}
            className="mt-10 grid max-w-md grid-cols-2 gap-6 border-t border-[var(--home-border-soft)] pt-6"
          >
            {scene.stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-[10px] uppercase tracking-widest text-[var(--home-text-muted)]">
                  {stat.label}
                </div>
                <SpringCounter
                  value={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  decimals={stat.decimals}
                  className="mt-1 block text-2xl font-bold tabular-nums text-[var(--home-text-primary)] md:text-3xl"
                />
              </div>
            ))}
          </motion.div>
        </div>
        <div>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
            transition={reduced ? { duration: 0 } : SPRING_STORY}
          >
            {visual}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
