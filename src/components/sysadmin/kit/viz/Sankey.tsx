"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { SankeyNode, SankeyLink } from "./types";
import { statusColor, VIZ_THEME } from "./theme";

/**
 * Sankey — a two-column role/flow diagram: source nodes on the left, target
 * nodes on the right, with curved links whose thickness is proportional to
 * value. Pure SVG + CSS vars; no third-party sankey dep.
 */
export function Sankey({
  source,
  target,
  links,
  height = 260,
  onLinkClick,
  className,
}: {
  source: SankeyNode[];
  target: SankeyNode[];
  links: SankeyLink[];
  height?: number;
  onLinkClick?: (source: string, target: string, value: number) => void;
  className?: string;
}) {
  const W = 640;
  const H = height;
  const pad = 80; // side padding for labels
  const gap = 14; // gap between nodes in a column

  const layout = useMemo(() => {
    const totalSource = source.reduce((a, n) => a + n.count, 0) || 1;
    const totalTarget = target.reduce((a, n) => a + n.count, 0) || 1;

    const nodeHeight = (n: SankeyNode, total: number, available: number) =>
      Math.max(8, (n.count / total) * available);

    const availableH = H - pad - gap * Math.max(0, source.length - 1);
    const sourceYs: Record<string, { y: number; h: number }> = {};
    let yCursor = 0;
    for (const n of source) {
      const h = nodeHeight(n, totalSource, availableH);
      sourceYs[n.id] = { y: yCursor, h };
      yCursor += h + gap;
    }

    const availableH2 = H - pad - gap * Math.max(0, target.length - 1);
    const targetYs: Record<string, { y: number; h: number }> = {};
    yCursor = 0;
    for (const n of target) {
      const h = nodeHeight(n, totalTarget, availableH2);
      targetYs[n.id] = { y: yCursor, h };
      yCursor += h + gap;
    }

    // Assign link offsets within each node so multiple links stack.
    const srcOffsets: Record<string, number> = {};
    const tgtOffsets: Record<string, number> = {};
    const linkGeos = links.map((l) => {
      const s = sourceYs[l.source];
      const t = targetYs[l.target];
      if (!s || !t) return null;
      const totalSourceCount = source.reduce((a, n) => (n.id === l.source ? a + n.count : a), 0) || 1;
      const totalTargetCount = target.reduce((a, n) => (n.id === l.target ? a + n.count : a), 0) || 1;
      const thickness = Math.min(
        s.h * (l.value / totalSourceCount),
        t.h * (l.value / totalTargetCount),
        40,
      );
      const so = srcOffsets[l.source] ?? 0;
      const to = tgtOffsets[l.target] ?? 0;
      srcOffsets[l.source] = so + thickness;
      tgtOffsets[l.target] = to + thickness;

      const x0 = pad;
      const x1 = W - pad;
      const y0 = Number.isFinite(s.y + so + thickness / 2) ? s.y + so + thickness / 2 : H / 2;
      const y1 = Number.isFinite(t.y + to + thickness / 2) ? t.y + to + thickness / 2 : H / 2;
      const midX = (x0 + x1) / 2;
      const d = `M ${x0} ${y0} C ${midX} ${y0}, ${midX} ${y1}, ${x1} ${y1}`;
      return { link: l, d, thickness };
    });

    return { sourceYs, targetYs, linkGeos };
  }, [source, target, links, H, pad]);

  return (
    <svg
      role="img"
      aria-label={`Role transition Sankey, ${source.length} sources, ${target.length} targets, ${links.length} flows`}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      className={cn("overflow-visible", className)}
    >
      {/* links */}
      {layout.linkGeos.map((g, i) => {
        if (!g) return null;
        const l = g.link;
        const stroke = statusColor(l.status ?? "neutral");
        const width = Math.max(2, g.thickness);
        return (
          <g key={`link-${i}`}>
            <path
              d={g.d}
              fill="none"
              stroke={stroke}
              strokeOpacity={0.18}
              strokeWidth={width}
            />
            <path
              d={g.d}
              fill="none"
              stroke={stroke}
              strokeOpacity={0.55}
              strokeWidth={Math.min(width, 3)}
              strokeDasharray="4 6"
              style={onLinkClick ? { cursor: "pointer" } : undefined}
              onClick={() => onLinkClick?.(l.source, l.target, l.value)}
            />
            <text
              x={W / 2}
              y={(g.d.match(/C (\d+)/)?.[1] ? 0 : 0)}
              dy={-4}
              textAnchor="middle"
              fontSize={10}
              fill={VIZ_THEME.muted}
            >
              {l.value}
            </text>
          </g>
        );
      })}

      {/* source nodes */}
      {source.map((n) => {
        const p = layout.sourceYs[n.id];
        if (!p) return null;
        return (
          <g key={`src-${n.id}`}>
            <rect
              x={pad - 4}
              y={p.y}
              width={8}
              height={p.h}
              rx={2}
              fill={VIZ_THEME.info}
              fillOpacity={0.85}
            />
            <text
              x={pad - 12}
              y={p.y + p.h / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={12}
              fill={VIZ_THEME.text}
            >
              {n.label}
            </text>
            <text
              x={pad - 12}
              y={p.y + p.h / 2 + 14}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fill={VIZ_THEME.muted}
            >
              {n.count}
            </text>
          </g>
        );
      })}

      {/* target nodes */}
      {target.map((n) => {
        const p = layout.targetYs[n.id];
        if (!p) return null;
        return (
          <g key={`tgt-${n.id}`}>
            <rect
              x={W - pad - 4}
              y={p.y}
              width={8}
              height={p.h}
              rx={2}
              fill={VIZ_THEME.ok}
              fillOpacity={0.85}
            />
            <text
              x={W - pad + 12}
              y={p.y + p.h / 2}
              textAnchor="start"
              dominantBaseline="middle"
              fontSize={12}
              fill={VIZ_THEME.text}
            >
              {n.label}
            </text>
            <text
              x={W - pad + 12}
              y={p.y + p.h / 2 + 14}
              textAnchor="start"
              dominantBaseline="middle"
              fontSize={10}
              fill={VIZ_THEME.muted}
            >
              {n.count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
