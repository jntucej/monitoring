"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Stage, HeroScene, ParticleField, StaticHero } from "../webgl";

export function GateScene() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  return (
    <section ref={ref} className="relative" style={{ height: "160vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <Stage fallback={<StaticHero accent="amber" />}>
          <HeroScene accent="amber" />
          <ParticleField accent="amber" />
        </Stage>
      </div>
    </section>
  );
}
