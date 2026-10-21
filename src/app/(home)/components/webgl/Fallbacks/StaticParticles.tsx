"use client";

import { useMemo } from "react";
import type { HomeAccent } from "../../cinematic";

const ACCENT_HEX: Record<HomeAccent, string> = {
  amber: "#F59E0B",
  indigo: "#6366F1",
  steel: "#0EA5E9",
  crimson: "#EF4444",
  navy: "#1E3A5F",
};

export interface StaticParticlesProps {
  accent?: HomeAccent;
  count?: number;
}

export function StaticParticles({
  accent = "amber",
  count = 120,
}: StaticParticlesProps) {
  const color = ACCENT_HEX[accent];
  const dots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const seed = i * 9301 + 49297;
        const rand = (n: number) => ((seed * n) % 233280) / 233280;
        return {
          id: i,
          x: rand(1) * 100,
          y: rand(2) * 100,
          size: 1 + rand(3) * 2.5,
          opacity: 0.2 + rand(4) * 0.6,
        };
      }),
    [count]
  );

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      {dots.map((d) => (
        <circle
          key={d.id}
          cx={`${d.x}%`}
          cy={`${d.y}%`}
          r={d.size}
          fill={color}
          opacity={d.opacity}
        />
      ))}
    </svg>
  );
}
