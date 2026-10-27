import type { VizStatus, VizTheme } from "./types";

// All colours resolve to CSS variables (defined in globals.css) so the viz
// automatically adapts to the active theme (dark / light / glass).
export const VIZ_THEME: VizTheme = {
  ok: "var(--action-primary)",
  warn: "var(--action-warning)",
  error: "var(--action-danger)",
  info: "var(--action-info)",
  neutral: "var(--text-muted)",
  text: "var(--text-primary)",
  muted: "var(--text-muted)",
  border: "var(--border)",
  surface: "var(--bg-surface)",
};

export function statusColor(s: VizStatus | undefined): string {
  if (!s) return VIZ_THEME.neutral;
  return VIZ_THEME[s];
}

/** Linear interpolate value in [0,1] → hex/rgba via CSS var + alpha */
export function heatColor(intensity: number, hue: "ok" | "warn" | "error" = "ok"): string {
  const alpha = Math.max(0.08, Math.min(1, intensity));
  const base = hue === "ok" ? "16,185,129" : hue === "warn" ? "245,158,11" : "244,63,94";
  return `rgba(${base},${alpha})`;
}

/** Clamp helper */
export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
