"use client";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { GeoGate, GeoMapProps } from "./types";
import { statusColor, VIZ_THEME } from "./theme";

const DEFAULT_W = 640;

// Earth radius in meters → approx px scale for radiusMeters.
// 1 degree of latitude ≈ 111,000 m (111000 m/deg).
const M_PER_DEG = 111_000;

/** SVG "campus map": a subtle lat/lng grid with each gate drawn as an outer
 *  radius circle (radiusMeters → px via 111000 m/deg) around a center dot and
 *  label. Status drives the color. */
export function GeoMap({ gates, bounds, height = 360, onGateClick, className }: GeoMapProps) {
  const W = DEFAULT_W;
  const H = height;

  const computedBounds = useMemo(() => {
    if (bounds) return bounds;
    if (gates.length === 0) return { minLat: -1, maxLat: 1, minLng: -1, maxLng: 1 };
    let minLat = Infinity,
      maxLat = -Infinity,
      minLng = Infinity,
      maxLng = -Infinity;
    gates.forEach((g) => {
      minLat = Math.min(minLat, g.lat);
      maxLat = Math.max(maxLat, g.lat);
      minLng = Math.min(minLng, g.lng);
      maxLng = Math.max(maxLng, g.lng);
    });
    // pad by ~15% so radius circles near the edge don't clip
    const latPad = (maxLat - minLat || 0.001) * 0.2;
    const lngPad = (maxLng - minLng || 0.001) * 0.2;
    return {
      minLat: minLat - latPad,
      maxLat: maxLat + latPad,
      minLng: minLng - lngPad,
      maxLng: maxLng + lngPad,
    };
  }, [bounds, gates]);

  const latSpan = computedBounds.maxLat - computedBounds.minLat;
  const lngSpan = computedBounds.maxLng - computedBounds.minLng;

  // px-per-meter at this latitude (deg → px, meters per degree is M_PER_DEG)
  const pxPerMeter = W / (lngSpan * M_PER_DEG);

  const toX = (lng: number) => ((lng - computedBounds.minLng) / lngSpan) * W;
  const toY = (lat: number) => H - ((lat - computedBounds.minLat) / latSpan) * H;

  // Subtle grid: one vertical line every ~1/8 of the width, one horizontal
  // every ~1/8 of the height.
  const gridLines = useMemo(() => {
    const v: { x: number }[] = [];
    const h: { y: number }[] = [];
    for (let i = 0; i <= 8; i++) {
      v.push({ x: (i / 8) * W });
      h.push({ y: (i / 8) * H });
    }
    return { v, h };
  }, [W, H]);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 text-[11px] font-medium" style={{ color: VIZ_THEME.muted }}>
        Campus map · {gates.length} gate{gates.length === 1 ? "" : "s"}
      </div>
      <svg
        role="img"
        aria-label={`Campus map, ${gates.length} gates`}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        className="overflow-visible"
      >
        {/* subtle grid */}
        {gridLines.v.map((l, i) => (
          <line key={`v-${i}`} x1={l.x} y1={0} x2={l.x} y2={H} stroke="var(--border)" strokeOpacity={0.25} strokeWidth={0.5} />
        ))}
        {gridLines.h.map((l, i) => (
          <line key={`h-${i}`} x1={0} y1={l.y} x2={W} y2={l.y} stroke="var(--border)" strokeOpacity={0.25} strokeWidth={0.5} />
        ))}

        {/* gates */}
        {gates.map((g) => {
          const x = toX(g.lng);
          const y = toY(g.lat);
          const rPx = g.radiusMeters != null ? Math.max(4, g.radiusMeters * pxPerMeter) : 14;
          const c = statusColor(g.status);
          return (
            <Gate key={g.id} g={g} x={x} y={y} rPx={rPx} color={c} onGateClick={onGateClick} />
          );
        })}
      </svg>
    </div>
  );
}

function Gate({
  g,
  x,
  y,
  rPx,
  color,
  onGateClick,
}: {
  g: GeoGate;
  x: number;
  y: number;
  rPx: number;
  color: string;
  onGateClick?: (id: string) => void;
}) {
  const interactive = !!onGateClick;
  return (
    <g
      transform={`translate(${x} ${y})`}
      onClick={() => onGateClick?.(g.id)}
      style={{ cursor: interactive ? "pointer" : "default" }}
      role={interactive ? "button" : "img"}
      aria-label={`${g.name} — ${g.status}, lat ${g.lat}, lng ${g.lng}`}
      tabIndex={interactive ? 0 : -1}
      onKeyDown={(ev) => ev.key === "Enter" && onGateClick?.(g.id)}
    >
      {/* outer radius ring */}
      <circle r={rPx} fill={color} fillOpacity={0.12} stroke={color} strokeOpacity={0.5} strokeWidth={1} />
      {/* center dot */}
      <circle r={4} fill={color} />
      {/* label with paint-order text-stroke so it stays legible over the grid */}
      <text
        y={rPx + 14}
        textAnchor="middle"
        fontSize={11}
        fill={VIZ_THEME.text}
        style={{
          paintOrder: "stroke",
          stroke: "var(--bg-surface)",
          strokeWidth: 3,
          strokeLinejoin: "round",
        }}
      >
        {g.name}
      </text>
    </g>
  );
}
