/* ------------------------------------------------------------------ *
 *  RadialMeter — an SVG-only animated radial progress meter.
 * ------------------------------------------------------------------ */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface RadialMeterProps {
  /** 0..100 */
  value: number;
  label: string;
  sublabel?: string;
  color?: string;
  size?: number;
  thickness?: number;
}

/**
 * Renders an SVG circle with a `stroke-dasharray` progress arc, centered numeric
 * value + `%` in bold, with `label` below in muted. The arc animates from 0
 * → `value` on mount via CSS transition; honors `prefers-reduced-motion` and
 * renders instantly when set.
 */
export function RadialMeter({
  value,
  label,
  sublabel,
  color = "var(--action-primary)",
  size = 140,
  thickness = 12,
}: RadialMeterProps) {
  const [mounted, setMounted] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Detect reduced-motion preference.
    if (typeof window !== "undefined") {
      setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
  }, []);

  // Animate stroke-dashoffset on mount.
  useEffect(() => {
    if (!mounted || reducedMotion) return;
    const el = svgRef.current;
    if (!el) return;
    const offset = el.querySelector(".progress-arc") as SVGElement;
    if (!offset) return;
    // Force reflow so the CSS transition triggers.
    offset.style.transition = "stroke-dashoffset 800ms ease-out";
    // Force layout reset; the next frame applies the final offset.
    void offset.getBoundingClientRect();
    offset.style.strokeDashoffset = "0";
  }, [mounted, reducedMotion, value]);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalized = Math.min(100, Math.max(0, value));
  const offset = circumference - (normalized / 100) * circumference;

  const svgStyle: React.CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
  };

  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
      <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={svgStyle}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={thickness}
        />
        {/* Progress arc */}
        <circle
          className="progress-arc"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: size >= 120 ? "2rem" : "1.5rem",
            lineHeight: 1,
            color: "var(--text-primary)",
          }}
        >
          {normalized.toFixed(0)}
          <span style={{ fontVariationSettings: '"wght" 800' }}>%</span>
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: size >= 120 ? "12px" : "11px", marginTop: 2 }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ color: "var(--text-muted)", fontSize: size >= 120 ? "11px" : "10px", marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}
