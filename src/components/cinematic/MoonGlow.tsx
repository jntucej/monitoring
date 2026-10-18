"use client";

import { useMemo } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * Moon + Contrast Contract — the canonical night-sky primitive.
 *
 * Layer A (fixed, always rendered):
 *   - deep base: linear-gradient(180deg, #070B14, #0F172A)
 *   - moon radial: radial-gradient(circle at top, <hue>, transparent 40%)
 *
 * Layer B (optional, hero-scoped, scrolls with the page):
 *   - stars + moon disc — only enabled on the landing page.
 */
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

const BASE_GRADIENT = "linear-gradient(180deg, #070B14 0%, #0F172A 100%)";

interface MoonGlowProps {
  hue?: MoonHue;
  stars?: number;
  disc?: boolean;
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

export function MoonGlow({
  hue = "indigo",
  stars = 0,
  disc = false,
}: MoonGlowProps) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const discFade = useTransform(scrollY, [0, 900], [1, 0]);

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

  const hasHeroDecor = stars > 0 || disc;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: TWINKLE_KEYFRAMES }} />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0" style={{ background: BASE_GRADIENT }} />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at top, ${HUE_COLORS[hue]}, transparent 40%)`,
          }}
        />
      </div>

      {hasHeroDecor && (
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
          {disc && (
            <motion.div
              className="absolute right-[10%] top-[10%]"
              style={{ opacity: reduce ? 1 : discFade }}
            >
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: 240,
                  height: 240,
                  background:
                    "radial-gradient(circle, rgba(220,230,255,0.16) 0%, rgba(103,232,249,0.06) 35%, transparent 70%)",
                  filter: "blur(24px)",
                }}
              />
              <div
                className="relative"
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 38% 32%, #fbfdff 0%, #dfe6fa 40%, #a9b3d3 100%)",
                  boxShadow:
                    "0 0 32px rgba(210,225,255,0.35), 0 0 80px rgba(210,225,255,0.18), inset -8px -10px 18px rgba(90,100,150,0.35), inset 6px 8px 14px rgba(255,255,255,0.6)",
                }}
              >
                <span
                  className="absolute rounded-full"
                  style={{
                    width: 13,
                    height: 13,
                    top: "30%",
                    left: "32%",
                    background: "rgba(150,160,200,0.32)",
                    boxShadow: "inset -1px -1px 2px rgba(80,90,140,0.45)",
                  }}
                />
                <span
                  className="absolute rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    top: "58%",
                    left: "56%",
                    background: "rgba(150,160,200,0.28)",
                  }}
                />
                <span
                  className="absolute rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    top: "42%",
                    left: "68%",
                    background: "rgba(150,160,200,0.24)",
                  }}
                />
                <span
                  className="absolute rounded-full"
                  style={{
                    width: 5,
                    height: 5,
                    top: "72%",
                    left: "32%",
                    background: "rgba(150,160,200,0.22)",
                  }}
                />
              </div>
            </motion.div>
          )}
        </div>
      )}
    </>
  );
}
