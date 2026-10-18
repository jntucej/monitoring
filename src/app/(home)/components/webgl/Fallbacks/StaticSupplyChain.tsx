"use client";

import type { HomeAccent } from "../../cinematic";

const ACCENT_HEX: Record<HomeAccent, string> = {
  amber: "#F59E0B",
  indigo: "#6366F1",
  steel: "#0EA5E9",
  crimson: "#EF4444",
  navy: "#1E3A5F",
};

export interface StaticSupplyChainProps {
  accent?: HomeAccent;
}

export function StaticSupplyChain({ accent = "amber" }: StaticSupplyChainProps) {
  const color = ACCENT_HEX[accent];
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1200 400"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="static-chain-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#static-chain-glow)">
        <path
          d="M 100 200 Q 400 100 700 220 T 1100 180"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
        <path
          d="M 100 260 Q 500 180 800 260 T 1100 240"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
          opacity="0.4"
        />
        <path
          d="M 150 320 Q 550 260 850 320 T 1080 300"
          stroke={color}
          strokeWidth="1"
          fill="none"
          opacity="0.3"
        />
      </g>
      {[
        [100, 200],
        [700, 220],
        [1100, 180],
        [400, 220],
        [800, 260],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill={color} opacity="0.9" />
      ))}
    </svg>
  );
}
