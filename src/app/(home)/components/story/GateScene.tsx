"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Stage, HeroScene, ParticleField, StaticHero } from "../webgl";

export function GateScene() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const opacity = useTransform(scrollYProgress, [0, 0.85, 1], [1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section ref={ref} className="relative" style={{ height: "160vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <Stage fallback={<StaticHero accent="amber" />}>
          <HeroScene accent="amber" />
          <ParticleField accent="amber" />
        </Stage>
        <motion.div
          style={{ opacity, y }}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6"
        >
          <h1 className="max-w-3xl text-center font-serif text-4xl leading-tight text-[var(--home-text-primary)] md:text-6xl">
            Every campus has a door.
            <br />
            We gave it a memory.
          </h1>
        </motion.div>
      </div>
    </section>
  );
}
