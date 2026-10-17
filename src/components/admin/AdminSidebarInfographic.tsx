"use client";

/**
 * AdminSidebarInfographic — compact per-category "infographic" rendered next
 * to each category header in the admin AdminSidebar.
 *
 * Driven entirely by the admin IA manifest (`cat.infographic`): a `kind` picks
 * the mini-visualization, a dotted `source` points at a slice of the live
 * admin overview payload, and an optional `color` tints it. The overview
 * payload is polled at the layout level and threaded down, so every sidebar
 * mini stays live without its own fetch.
 *
 * Shares the same `Mini*` kit primitives as sysadmin (pure presentational),
 * but reads the *admin* overview payload shape (`/api/admin/overview`), which
 * adds `operations.*` and `analytics.*` slices the sysadmin payload lacks.
 */
import {
  MiniDotCluster,
  MiniGauge,
  MiniHeatStrip,
  MiniSeverityChips,
  MiniSparkline,
  MiniStackedBar,
  MiniDriftPill,
  MiniCountPills,
} from "@/components/sysadmin/kit/sidebar";
import type { AdminOverviewPayload } from "./AdminSidebar";

export interface AdminInfographicSpec {
  kind: string;
  source: string;
  color?: string;
}

export interface AdminSidebarInfographicProps {
  spec?: AdminInfographicSpec;
  overview: AdminOverviewPayload | null;
}

/**
 * Read a dotted path ("a.b.c") off the admin overview payload. Returns
 * undefined when any hop is missing or the shape doesn't match — callers
 * treat that as "no data yet" and render nothing.
 */
export function readAdminSource<T = unknown>(
  overview: AdminOverviewPayload | null,
  dottedPath: string
): T | undefined {
  if (!overview || !dottedPath) return undefined;
  const parts = dottedPath.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cursor: any = overview;
  for (const part of parts) {
    if (cursor == null || typeof cursor !== "object") return undefined;
    cursor = cursor[part];
  }
  return cursor as T | undefined;
}

const STACKED_BAR_COLORS = [
  "var(--action-primary)",
  "var(--action-warning)",
  "var(--action-info)",
];

export function AdminSidebarInfographic({ spec, overview }: AdminSidebarInfographicProps) {
  if (!spec) return null;

  switch (spec.kind) {
    case "dots": {
      const statuses = readAdminSource<Record<string, unknown>[]>(overview, spec.source)
        ?.map((s) => {
          const v = String(s);
          if (v === "offline" || v === "error") return "error" as const;
          if (v === "online" || v === "ok") return "ok" as const;
          return "warn" as const;
        })
        ?? undefined;
      if (!statuses || statuses.length === 0) return null;
      return <MiniDotCluster label={`Live status: ${statuses.length} services`} statuses={statuses} />;
    }

    case "stacked-bar": {
      const seg = readAdminSource<{ active?: number; suspended?: number; deprovisioned?: number }>(
        overview,
        spec.source
      );
      if (!seg) return null;
      const segments = [
        { value: seg.active ?? 0, color: STACKED_BAR_COLORS[0] },
        { value: seg.suspended ?? 0, color: STACKED_BAR_COLORS[1] },
        { value: seg.deprovisioned ?? 0, color: STACKED_BAR_COLORS[2] },
      ];
      return <MiniStackedBar label="Identity mix" segments={segments} />;
    }

    case "gauge": {
      const raw = readAdminSource<number>(overview, spec.source);
      if (raw == null) return null;
      const value = raw > 1 ? raw / 100 : raw;
      return (
        <MiniGauge
          label={`Coverage ${Math.round(raw > 1 ? raw : raw * 100)}%`}
          value={value}
          color={spec.color}
        />
      );
    }

    case "sparkline": {
      const values = readAdminSource<number[]>(overview, spec.source);
      if (!values || values.length < 2) return null;
      return <MiniSparkline label="Trend" values={values} color={spec.color} />;
    }

    case "heat": {
      const cells = readAdminSource<number[]>(overview, spec.source);
      if (!cells || cells.length === 0) return null;
      return <MiniHeatStrip label="Activity heat" cells={cells} />;
    }

    case "severity": {
      const counts = readAdminSource<{ critical?: number; high?: number; medium?: number; low?: number }>(
        overview,
        spec.source
      );
      if (!counts) return null;
      return (
        <MiniSeverityChips
          label="Alert severity"
          counts={{
            critical: counts.critical ?? 0,
            high: counts.high ?? 0,
            medium: counts.medium ?? 0,
            low: counts.low ?? 0,
          }}
        />
      );
    }

    case "drift": {
      const plat = readAdminSource<{ envDrift?: number; schemaDrift?: number }>(
        overview,
        spec.source
      );
      if (!plat) return null;
      const driftCount = (plat.envDrift ?? 0) + (plat.schemaDrift ?? 0);
      return <MiniDriftPill label="Config drift" driftCount={driftCount} />;
    }

    case "counts": {
      const ref = readAdminSource<{
        departments?: number;
        courses?: number;
        sections?: number;
      }>(overview,
        spec.source
      );
      if (!ref) return null;
      const counts = [ref.departments ?? 0, ref.courses ?? 0, ref.sections ?? 0];
      return <MiniCountPills label="Reference counts" counts={counts} />;
    }

    default:
      return null;
  }
}
