"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView, useScroll, useTransform, useSpring } from "framer-motion";
import type { Scene } from "./scenes";
import { BlurReveal } from "../ui/BlurReveal";
import { SPRING_STORY, SPRING_WEIGHT } from "../hooks/useSpringConfig";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import type { LivePayload } from "../hooks/useLiveData";
import { SpringCounter } from "../ui/SpringCounter";

const ACCENT_VAR = {
  amber: "var(--home-accent-amber)",
  emerald: "var(--home-accent-navy)",
  steel: "var(--home-accent-steel)",
  crimson: "var(--home-accent-crimson)",
  violet: "var(--home-accent-indigo)",
} as const;

export interface SceneFrameProps {
  scene: Scene;
  data: LivePayload | null;
  visual: ReactNode;
}

export function SceneFrame({ scene, data, visual }: SceneFrameProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.3 });
  const reduced = useReducedMotionSafe();
  const tier = usePerformanceTier();
  const accentVar = ACCENT_VAR[scene.accent];
  const num = String(scene.order).padStart(2, "0");

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const smoothed = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 1 });
  const textY = useTransform(smoothed, [0, 1], [40, -40]);
  const visualY = useTransform(smoothed, [0, 1], [80, -80]);
  const visualScale = useTransform(smoothed, [0, 0.5, 1], [0.98, 1, 1.02]);
  const useParallax = tier !== "static" && !reduced;

  const stats =
    scene.id === "request"
      ? [
          { label: "Requests today", value: data?.stats.requestsToday ?? 0 },
          { label: "On campus now", value: data?.stats.onCampusNow ?? 0 },
        ]
      : scene.id === "approval"
      ? [
          { label: "Approved today", value: data?.stats.approvedToday ?? 0 },
          { label: "Requests today", value: data?.stats.requestsToday ?? 0 },
        ]
      : scene.id === "scan"
      ? [
          { label: "Scans today", value: data?.stats.scansToday ?? 0 },
          { label: "On campus now", value: data?.stats.onCampusNow ?? 0 },
        ]
      : scene.id === "shield"
      ? [
          { label: "Unauthorized (30d)", value: 0 },
          { label: "Scans today", value: data?.stats.scansToday ?? 0 },
        ]
      : [
          { label: "On campus now", value: data?.stats.onCampusNow ?? 0 },
          { label: "Modules connected", value: data?.modules.filter((m) => m.active).length ?? 0 },
        ];

  const textVariants = {
    hidden: { opacity: 0, y: 28, scale: 0.985 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { ...SPRING_STORY, delay: reduced ? 0 : i * 0.08 },
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
        <motion.div style={{ y: useParallax ? textY : 0 }}>
          <motion.div
            custom={0}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={textVariants}
            className="mb-6 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em]"
            style={{ color: accentVar }}
          >
            <span>{num}</span>
            <span className="h-px w-8" style={{ background: accentVar }} />
            <span>{scene.id.replace("wholecampus", "whole campus")}</span>
          </motion.div>
          <motion.h2
            custom={1}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={textVariants}
            className="font-serif text-4xl leading-tight tracking-tight text-[var(--home-text-primary)] md:text-5xl"
          >
            {scene.tagline}
          </motion.h2>
          <motion.p
            custom={2}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={textVariants}
            className="mt-5 max-w-md text-base leading-relaxed text-[var(--home-text-secondary)] md:text-lg"
          >
            {scene.sub}
          </motion.p>
          <motion.div
            custom={3}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={textVariants}
            className="mt-10 grid max-w-md grid-cols-2 gap-6 border-t border-[var(--home-border-soft)] pt-6"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ scale: 1.02, transition: SPRING_STORY }}
              >
                <div className="text-[10px] uppercase tracking-widest text-[var(--home-text-muted)]">
                  {stat.label}
                </div>
                <SpringCounter
                  value={stat.value}
                  className="mt-1 block text-2xl font-bold tabular-nums text-[var(--home-text-primary)] md:text-3xl"
                />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
        <motion.div
          style={{
            y: useParallax ? visualY : 0,
            scale: useParallax ? visualScale : 1,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={
              inView
                ? { opacity: 1, scale: 1, y: 0 }
                : { opacity: 0, scale: 0.94, y: 20 }
            }
            transition={reduced ? { duration: 0 } : { ...SPRING_WEIGHT, delay: 0.15 }}
          >
            <BlurReveal delay={0.1}>{visual}</BlurReveal>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
