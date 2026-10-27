"use client";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { FlowMapProps, FlowNode } from "./types";
import { statusColor, VIZ_THEME } from "./theme";

const DEFAULT_W = 640;
const NODE_R = 16;

export function FlowMap({ nodes, edges, height = 220, onNodeClick, className }: FlowMapProps) {
  const W = DEFAULT_W;
  const H = height;
  // Auto-layout: nodes without explicit x/y are placed left→right in input order.
  const positions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    const num = (v: unknown): number | null =>
      typeof v === "number" && Number.isFinite(v) ? v : null;
    const auto = nodes.filter((n) => num(n.x) == null || num(n.y) == null);
    const explicit = nodes.filter((n) => num(n.x) != null && num(n.y) != null);
    explicit.forEach((n) => (map[n.id] = { x: num(n.x)! * W, y: num(n.y)! * H }));
    const pad = 60;
    auto.forEach((n, i) => {
      void n;
      const step = auto.length > 1 ? (W - pad * 2) / (auto.length - 1) : 0;
      map[auto[i].id] = { x: pad + i * step, y: H / 2 };
    });
    return map;
  }, [nodes, W, H]);

  const nodeById = useMemo(() => {
    const m: Record<string, FlowNode> = {};
    nodes.forEach((n) => (m[n.id] = n));
    return m;
  }, [nodes]);
  void nodeById;

  return (
    <svg
      role="img"
      aria-label={`Service topology, ${nodes.length} services, ${edges.length} connections`}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      className={cn("overflow-visible", className)}
    >
      <defs>
        <marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={VIZ_THEME.border} />
        </marker>
      </defs>
      {/* edges */}
      {edges.map((e, i) => {
        const a = positions[e.from];
        const b = positions[e.to];
        if (!a || !b) return null;
        const stroke = statusColor(e.status ?? "neutral");
        const traffic = e.traffic ?? 0.5;
        const dur = `${Math.max(0.8, 2.2 - traffic * 1.5)}s`;
        const d = `M ${a.x + NODE_R} ${a.y} C ${a.x + (b.x - a.x) / 2} ${a.y}, ${b.x - (b.x - a.x) / 2} ${b.y}, ${b.x - NODE_R} ${b.y}`;
        return (
          <g key={`${e.from}-${e.to}-${i}`}>
            <path d={d} fill="none" stroke={stroke} strokeOpacity={0.25} strokeWidth={2} />
            <path
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={2}
              strokeDasharray="4 8"
              markerEnd="url(#flow-arrow)"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-24" dur={dur} repeatCount="indefinite" />
            </path>
            {e.latencyMs != null && (
              <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 6} textAnchor="middle" fontSize={10} fill={VIZ_THEME.muted}>
                {e.latencyMs}ms
              </text>
            )}
          </g>
        );
      })}
      {/* nodes */}
      {nodes.map((n) => {
        const p = positions[n.id];
        if (!p) return null;
        const c = statusColor(n.status);
        return (
          <g
            key={n.id}
            transform={`translate(${p.x} ${p.y})`}
            onClick={() => onNodeClick?.(n.id)}
            style={{ cursor: onNodeClick ? "pointer" : "default" }}
            role={onNodeClick ? "button" : "img"}
            aria-label={`${n.label} — ${n.status}`}
            tabIndex={onNodeClick ? 0 : -1}
            onKeyDown={(ev) => ev.key === "Enter" && onNodeClick?.(n.id)}
          >
            <circle r={NODE_R + 6} fill={c} fillOpacity={0.15} />
            <circle r={NODE_R} fill={VIZ_THEME.surface} stroke={c} strokeWidth={2} />
            <circle r={4} fill={c} />
            <text y={NODE_R + 18} textAnchor="middle" fontSize={11} fill={VIZ_THEME.text}>
              {n.label}
            </text>
            {n.meta && (
              <text y={NODE_R + 32} textAnchor="middle" fontSize={9} fill={VIZ_THEME.muted}>
                {n.meta}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
