"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/utils";
import { DualThroughputCurveProps, TcPoint } from "./types";
import { VIZ_THEME } from "./theme";

/**
 * DualThroughputCurve — the DevOps throughput + latency chart.
 *
 * Fetches two registry range queries from the app's Prometheus proxy:
 *   fleet.http_rate   -> primary series (API requests/sec, 5m rate)
 *   fleet.http_p95    -> secondary series (p95 response time, ms)
 * and renders them as overlaid dual-axis time series (throughput as bars,
 * latency as a line) in a single SVG.
 *
 * When Prometheus has no data yet (e.g. the gate_web scrape target just got
 * added and hasn't populated), it renders an explicit empty state — never a
 * fabricated curve. Loading / error are distinct from empty.
 */

const DEFAULT_HEIGHT = 180;
const DEFAULT_STEP = "60s"; // one sample per minute
const WINDOW_MS = 3600_000; // last 1h

function parseMatrix(data: unknown, wantPrimary = true): TcPoint[] {
  // Prometheus matrix: data.result[] each with .values [[t, v], ...]
  const arr = Array.isArray(data) ? data : [];
  const out: TcPoint[] = [];
  for (const series of arr) {
    const vals: unknown = (series as { values?: unknown[] })?.values ?? [];
    if (!Array.isArray(vals)) continue;
    for (const pv of vals) {
      if (!Array.isArray(pv) || pv.length < 2) continue;
      const t = Number(pv[0]);
      const v = Number(pv[1]);
      if (!Number.isFinite(t) || !Number.isFinite(v)) continue;
      if (wantPrimary && v < 0) continue;
      out.push({ t: t * 1000, value: v });
    }
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

export function DualThroughputCurve({
  primary: primaryProp = [],
  secondary: secondaryProp,
  primaryLabel = "Throughput (req/s)",
  secondaryLabel = "p95 latency (ms)",
  height = DEFAULT_HEIGHT,
  windowLabel = "last 1h",
  loading = false,
  emptyMessage = "No traffic or telemetry yet — waiting for the first scrape.",
  className,
}: DualThroughputCurveProps) {
  const [fetched, setFetched] = useState<{ primary: TcPoint[]; secondary: TcPoint[] } | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  // Pull the two named range queries. Consumer passes series directly (primaryProp)
  // OR lets the component fetch from Prometheus via the monitoring proxy.
  useEffect(() => {
    if (primaryProp && primaryProp.length > 0) return; // caller supplied data
    let cancelled = false;
    async function load() {
      try {
        const headers = getAuthHeaders();
        const end = Date.now();
        const start = end - WINDOW_MS;
        const q = (id: string) =>
          `/api/admin/monitoring?queryId=${id}&start=${Math.floor(start / 1000)}&end=${Math.floor(end / 1000)}&step=${DEFAULT_STEP}`;
        const [rateRes, p95Res] = await Promise.all([
          fetch(q("fleet.http_rate"), { headers, cache: "no-store" }).then((r) => r.json()),
          fetch(q("fleet.http_p95"), { headers, cache: "no-store" }).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setFetched({
          primary: parseMatrix(rateRes?.data ?? [], true),
          secondary: parseMatrix(p95Res?.data ?? [], false),
        });
      } catch (e) {
        if (cancelled) return;
        setFetchErr(e instanceof Error ? e.message : "telemetry unavailable");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [primaryProp]);

  const primary = useMemo(
    () => (primaryProp && primaryProp.length > 0 ? primaryProp : fetched?.primary ?? []),
    [primaryProp, fetched],
  );
  const secondary = useMemo(
    () => secondaryProp ?? fetched?.secondary ?? [],
    [secondaryProp, fetched],
  );
  const hasData = primary.length > 0 || secondary.length > 0;

  const { w, h, pad, plotW, plotH } = useMemo(() => {
    const w = 640;
    const pad = { l: 44, r: 44, t: 18, b: 22 };
    const h = height;
    return { w, h, pad, plotW: w - pad.l - pad.r, plotH: h - pad.t - pad.b };
  }, [height]);

  // Build the combined time domain + per-series normalised paths.
  const geo = useMemo(() => {
    if (!hasData) return null;
    const allT = primary.map((p) => p.t).concat(secondary.map((s) => s.t));
    const tMin = Math.min(...allT);
    const tMax = Math.max(...allT);
    const tSpan = Math.max(1, tMax - tMin);
    const pMax = Math.max(1, ...primary.map((p) => p.value));
    const sMax = Math.max(1, ...secondary.map((s) => s.value));

    const xOf = (t: number) => pad.l + ((t - tMin) / tSpan) * plotW;
    const yOf = (frac: number) => pad.t + (1 - frac) * plotH; // frac 0..1

    // primary as bars (width = step in px)
    const stepPx = plotW / Math.max(1, (primary.length || 1));
    const primaryBars = primary.map((p) => ({
      x: xOf(p.t) - stepPx / 2,
      w: Math.max(1, stepPx * 0.6),
      y: yOf(Math.min(1, p.value / pMax)),
      h: plotH * Math.min(1, p.value / pMax),
      v: p.value,
    }));
    // secondary as a line
    const secondaryPts = secondary
      .map((s) => ({ x: xOf(s.t), y: yOf(Math.min(1, s.value / sMax)), v: s.value }))
      .sort((a, b) => a.x - b.x);
    const secondaryLine = secondaryPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

    // x-axis ticks (4)
    const ticks = [0, 1, 2, 3].map((i) => {
      const f = i / 3;
      const t = tMin + f * tSpan;
      const label = new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return { x: xOf(t), label };
    });

    return { primaryBars, secondaryLine, secondaryPts, ticks, pMax, sMax, tMin, tMax };
  }, [primary, secondary, hasData, pad.l, pad.t, plotW, plotH]);

  if (loading && !hasData) {
    return (
      <div className={cn("w-full", className)} style={{ height }} aria-busy="true">
        <div className="flex items-center gap-2 text-xs" style={{ color: VIZ_THEME.muted }}>
          <span className="inline-block size-3 animate-spin rounded-full border-2 border-current opacity-60" />
          Loading telemetry…
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className={cn("w-full rounded-lg border flex items-center justify-center text-center px-4", className)} style={{ height, borderColor: VIZ_THEME.border, color: VIZ_THEME.muted }} aria-busy={!!fetchErr}>
        <div className="text-xs leading-relaxed">
          <p className="font-medium" style={{ color: VIZ_THEME.text }}>
            {fetchErr ? "Telemetry unavailable" : "No telemetry yet"}
          </p>
          <p>{fetchErr ? "The monitoring proxy did not respond." : emptyMessage}</p>
        </div>
      </div>
    );
  }

  const { primaryBars, secondaryLine, secondaryPts, ticks, pMax, sMax } = geo!;

  return (
    <div className={cn("w-full", className)}>
      {/* legend */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: VIZ_THEME.muted }}>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: VIZ_THEME.ok }} />
          {primaryLabel}
          <span className="font-mono" style={{ color: VIZ_THEME.text }}>
            peak {pMax.toFixed(1)}
          </span>
        </span>
        {secondaryPts.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded" style={{ background: VIZ_THEME.error }} />
            {secondaryLabel}
            <span className="font-mono" style={{ color: VIZ_THEME.text }}>
              peak {sMax.toFixed(1)}ms
            </span>
          </span>
        )}
        <span className="ml-auto" style={{ color: VIZ_THEME.muted }}>{windowLabel}</span>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} role="img" aria-label={`${primaryLabel} and ${secondaryLabel} over ${windowLabel}`}>
        {/* gridlines */}
        {[0, 0.5, 1].map((f) => {
          const y = pad.t + f * plotH;
          return (
            <line key={f} x1={pad.l} x2={pad.l + plotW} y1={y} y2={y} stroke={VIZ_THEME.border} strokeDasharray="3 4" strokeWidth={1} />
          );
        })}

        {/* primary: bars */}
        {primaryBars.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={1} fill={VIZ_THEME.ok} opacity={0.85}>
            <title>{`${b.v.toFixed(2)} req/s`}</title>
          </rect>
        ))}

        {/* secondary: line */}
        {secondaryPts.length > 1 && (
          <>
            <path d={secondaryLine} fill="none" stroke={VIZ_THEME.error} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {secondaryPts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={2} fill={VIZ_THEME.error}>
                <title>{`${p.v.toFixed(1)} ms`}</title>
              </circle>
            ))}
          </>
        )}

        {/* x-axis ticks */}
        {ticks.map((tk, i) => (
          <text key={i} x={tk.x} y={h - 6} textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"} fontSize="10" fill={VIZ_THEME.muted}>
            {tk.label}
          </text>
        ))}

        {/* y-axis min/max labels */}
        <text x={pad.l - 6} y={pad.t + 8} textAnchor="end" fontSize="10" fill={VIZ_THEME.muted}>{pMax.toFixed(1)}</text>
        <text x={pad.l - 6} y={pad.t + plotH} textAnchor="end" fontSize="10" fill={VIZ_THEME.muted}>0</text>
      </svg>
    </div>
  );
}

export default DualThroughputCurve;
