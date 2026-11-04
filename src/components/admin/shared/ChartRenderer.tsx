// src/components/admin/shared/ChartRenderer.tsx
// UI-audit fix 2: dynamic lazy-load of the recharts-based renderer.
//
// Before: every admin page that rendered a chart pulled ~200KB of recharts
// into its first-load bundle. After: the chunk is split and only loads when
// a chart actually mounts.
"use client";

import dynamic from "next/dynamic";

// The Impl module still exports ChartRenderer + CHART_PALETTE (for static
// imports of the palette by dashboard pages that don't render charts).
// Only the component itself is lazy — the palette is a tiny const array.
const ChartRendererImpl = dynamic(
  () =>
    import("./ChartRendererImpl").then((m) => (m.default as typeof import("./ChartRendererImpl").ChartRenderer)),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[280px] w-full animate-pulse rounded-lg bg-[var(--bg-surface)]"
        role="status"
        aria-label="Loading chart"
      />
    ),
  }
);

// Re-export the type + palette so existing imports keep working.
export type { ChartType, SeriesDef } from "./ChartRendererImpl";
export { CHART_PALETTE } from "./ChartRendererImpl";

export { ChartRendererImpl as ChartRenderer };
export default ChartRendererImpl;
