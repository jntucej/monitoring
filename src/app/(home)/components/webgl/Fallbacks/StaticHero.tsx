"use client";

import type { HomeAccent } from "../../cinematic";

const ACCENT_HEX: Record<HomeAccent, string> = {
  amber: "#F59E0B",
  indigo: "#6366F1",
  steel: "#0EA5E9",
  crimson: "#EF4444",
  navy: "#1E3A5F",
};

export interface StaticHeroProps {
  accent?: HomeAccent;
}

export function StaticHero({ accent = "amber" }: StaticHeroProps) {
  const color = ACCENT_HEX[accent];
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 50% 60%, ${color}22 0%, transparent 60%), #0A0A0F`,
      }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="hero-gate-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
          <radialGradient id="hero-spot" cx="50%" cy="55%" r="35%">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="600" cy="440" rx="420" ry="260" fill="url(#hero-spot)" />
        <rect x="420" y="180" width="60" height="460" rx="4" fill="url(#hero-gate-fill)" stroke={color} strokeOpacity="0.3" />
        <rect x="720" y="180" width="60" height="460" rx="4" fill="url(#hero-gate-fill)" stroke={color} strokeOpacity="0.3" />
        <rect x="420" y="160" width="360" height="34" rx="4" fill="url(#hero-gate-fill)" stroke={color} strokeOpacity="0.3" />
        <rect x="480" y="420" width="240" height="8" rx="4" fill={color} fillOpacity="0.6" />
        <circle cx="480" cy="424" r="10" fill={color} fillOpacity="0.9" />
        <line x1="0" y1="640" x2="1200" y2="640" stroke={color} strokeOpacity="0.1" strokeWidth="1" />
        <g opacity="0.7">
          <circle cx="640" cy="470" r="12" fill="#0A0A0F" stroke={color} strokeOpacity="0.4" />
          <rect x="630" y="486" width="20" height="60" rx="8" fill="#0A0A0F" stroke={color} strokeOpacity="0.4" />
        </g>
      </svg>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%)",
        }}
      />
    </div>
  );
}
