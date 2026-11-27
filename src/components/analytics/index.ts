/**
 * @/components/analytics — single canonical module for dashboard analytics.
 *
 * The plan's target structure keeps ONE canonical set of KPI cards,
 * skeletons, charts, pill bars, spatial maps, Sankey funnels, and radial
 * gauges so every dashboard imports the same primitives instead of
 * re-implementing them across `admin/shared`, `sysadmin/kit`, `dashboard`,
 * and per-role `_shared` folders.
 *
 * This barrel re-exports the already-consolidated shared primitives and the
 * pure-SVG viz kit, plus the two data-driven composite dashboards, so new
 * pages (and future consolidation of the existing importers) have one
 * source of truth. It is intentionally ADDITIVE — existing importers of the
 * underlying modules keep working; this is the new canonical entry point.
 */

// ── KPI / skeleton / stat primitives (shared canonical) ───────────────────
export {
  KpiCard,
  type KpiCardProps,
  type KpiDrilldown,
} from "@/components/shared/KpiCard";
export { MiniStat, type MiniStatProps } from "@/components/shared/MiniStat";
export {
  ListSkeleton,
  type ListSkeletonProps,
} from "@/components/shared/ListSkeleton";
export {
  DataFreshness,
  type FreshnessStatus,
} from "@/components/shared/DataFreshness";

// ── Pure-SVG visualization kit (formerly sysadmin/kit/viz) ────────────────
// Sankey funnels, flow maps, heat strips/matrices, calendar heatmaps, geo
// maps, chain dots, plus the shared theme + type re-exports.
export {
  FlowMap,
  HeatStrip,
  HeatMatrix,
  CalendarHeatmap,
  GeoMap,
  Sankey,
  ChainDots,
} from "@/components/sysadmin/kit/viz";
export type * from "@/components/sysadmin/kit/viz/types";
export {
  VIZ_THEME,
  statusColor,
  heatColor,
  clamp01,
} from "@/components/sysadmin/kit/viz/theme";

// ── Data-driven composite dashboards ───────────────────────────────────────
// Both are API-backed (no seeded/random generators): CampusAnalyticsDashboard
// reads /api/admin/analytics/analyze, SpatialPeopleMapWorkspace reads
// /api/org-map.
export {
  CampusAnalyticsDashboard,
} from "@/components/dashboard/CampusAnalyticsDashboard";
export {
  SpatialPeopleMap,
  SpatialPeopleMapWorkspace,
} from "@/components/dashboard/SpatialPeopleMap";
