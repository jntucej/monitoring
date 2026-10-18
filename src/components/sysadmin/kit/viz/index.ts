// Barrel export for the sysadmin "advanced viz" kit.
// Pure-SVG infographic primitives — no chart library, colors via CSS vars.

export { FlowMap } from "./FlowMap";
export { HeatStrip } from "./HeatStrip";
export { HeatMatrix } from "./HeatMatrix";
export { CalendarHeatmap } from "./CalendarHeatmap";
export { GeoMap } from "./GeoMap";
export { Sankey } from "./Sankey";
export { ChainDots } from "./ChainDots";

export type * from "./types";
export { VIZ_THEME, statusColor, heatColor, clamp01 } from "./theme";
