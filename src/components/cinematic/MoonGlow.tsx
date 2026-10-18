"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

export type MoonHue =
  | "indigo"
  | "cyan"
  | "violet"
  | "pink"
  | "amber"
  | "gold"
  | "slate";

const HUE_COLORS: Record<MoonHue, string> = {
  indigo: "rgba(129,140,248,0.12)",
  cyan: "rgba(103,232,249,0.12)",
  violet: "rgba(167,139,250,0.12)",
  pink: "rgba(244,114,182,0.12)",
  amber: "rgba(245,158,11,0.12)",
  gold: "rgba(251,191,36,0.12)",
  slate: "rgba(148,163,184,0.08)",
};

interface MoonGlowProps {
  hue?: MoonHue;
  stars?: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  minOpacity: number;
  maxOpacity: number;
}

const TWINKLE_KEYFRAMES = `@keyframes moonGlowTwinkle {
  0%, 100% { opacity: var(--mg-star-min, 0.3); }
  50% { opacity: var(--mg-star-max, 0.9); }
}`;

export function MoonGlow({ hue = "indigo", stars = 0 }: MoonGlowProps) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const { scrollYProgress } = useScroll();

  // As user scrolls deeper into the story, darken base and fade moon light (moving away from moonlight into deep night)
  const baseGrad = useTransform(
    scrollYProgress,
    [0, 0.2, 0.6, 1],
    [
      "linear-gradient(180deg, #070B14 0%, #0F172A 100%)",
      "linear-gradient(180deg, #04060B 0%, #090D16 100%)",
      "linear-gradient(180deg, #020306 0%, #05070C 100%)",
      "linear-gradient(180deg, #010204 0%, #020306 100%)",
    ]
  );

  const moonOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.35, 0.1]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const starList = useMemo<Star[]>(() => {
    if (stars <= 0) return [];
    let seed = 1337;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: stars }, () => ({
      x: rand() * 100,
      y: rand() * 85,
      size: 0.8 + rand() * 1.6,
      delay: rand() * 8,
      duration: 6 + rand() * 6,
      minOpacity: 0.15 + rand() * 0.15,
      maxOpacity: 0.55 + rand() * 0.45,
    }));
  }, [stars]);

  const hasHeroDecor = stars > 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: TWINKLE_KEYFRAMES }} />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <motion.div className="absolute inset-0" style={{ background: baseGrad }} />
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at top, ${HUE_COLORS[hue]}, transparent 40%)`,
            opacity: moonOpacity,
          }}
        />
      </div>

      {hasHeroDecor && mounted && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 top-0 z-0 h-[100svh] overflow-hidden"
        >
          {starList.map((s, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={
                {
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  width: `${s.size}px`,
                  height: `${s.size}px`,
                  background: "#eaf2ff",
                  boxShadow: `0 0 ${s.size * 3}px rgba(200,220,255,0.5)`,
                  "--mg-star-min": s.minOpacity,
                  "--mg-star-max": s.maxOpacity,
                  animation: reduce
                    ? "none"
                    : `moonGlowTwinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
                  opacity: reduce
                    ? (s.minOpacity + s.maxOpacity) / 2
                    : undefined,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
