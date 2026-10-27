"use client";

/**
 * SidebarInfographic — a compact per-category "infographic" rendered next to
 * each category header in the sysadmin Sidebar.
 *
 * It is driven entirely by the IA manifest (`cat.infographic`): a `kind` picks
 * the mini-visualization, a dotted `source` points at a slice of the live
 * overview payload, and an optional `color` tints it. The overview payload is
 * polled at the layout level and threaded down, so every sidebar mini stays
 * live without its own fetch.
 *
 * The minis come from the shared kit barrel. If the parallel agent hasn't
 * landed a symbol yet, only that import may be flagged by tsc — the mapping
 * logic here is independent of the visuals.
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
import type { OverviewPayload } from "./Sidebar";

export interface InfographicSpec {
  kind: string;
  source: string;
  color?: string;
}

export interface SidebarInfographicProps {
  spec?: InfographicSpec;
  overview: OverviewPayload | null;
}

/**
 * Read a dotted path ("a.b.c") off the overview payload. Returns undefined
 * when any hop is missing or the shape doesn't match — callers treat that as
 * "no data yet" and render nothing.
 */
export function readSource<T = unknown>(
  overview: OverviewPayload | null,
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

export function SidebarInfographic({ spec, overview }: SidebarInfographicProps) {
  if (!spec) return null;

  switch (spec.kind) {
    case "dots": {
      // command.health / gates.status → status strings
      const statuses = readSource<Record<string, unknown>[]>(overview, spec.source)
        ?.map((s) => {
          const v = String(s);
          if (v === "ok" || v === "warn" || v === "error") return v;
          // fall back on generic "not bad"
          return "ok" as const;
        })
        ?? undefined;
      if (!statuses || statuses.length === 0) return null;
      return (
        <MiniDotCluster
          label={`Live status: ${statuses.length} services`}
          statuses={statuses}
        />
      );
    }

    case "stacked-bar": {
      // identity → { active, suspended, deprovisioned }
      const seg = readSource<{ active?: number; suspended?: number; deprovisioned?: number }>(
        overview,
        spec.source
      );
      if (!seg) return null;
      const segments = [
        { value: seg.active ?? 0, color: STACKED_BAR_COLORS[0] },
        { value: seg.suspended ?? 0, color: STACKED_BAR_COLORS[1] },
        { value: seg.deprovisioned ?? 0, color: STACKED_BAR_COLORS[2] },
      ];
      return (
        <MiniStackedBar
          label="Identity mix"
          segments={segments}
        />
      );
    }

    case "gauge": {
      // access.mfaCoverage (0..100) or data.backupFreshness (0..1)
      const raw = readSource<number>(overview, spec.source);
      if (raw == null) return null;
      // Normalize 0..100 → 0..1; pass through 0..1 values.
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
      // monitoring.errorRate24h / governance.events7d
      const values = readSource<number[]>(overview, spec.source);
      if (!values || values.length < 2) return null;
      return (
        <MiniSparkline
          label="Trend"
          values={values}
          color={spec.color}
        />
      );
    }

    case "heat": {
      // automation.runs14d
      const cells = readSource<number[]>(overview, spec.source);
      if (!cells || cells.length === 0) return null;
      return <MiniHeatStrip label="Activity heat" cells={cells} />;
    }

    case "severity": {
      // alerts → { critical, high, medium, low }
      const counts = readSource<{ critical?: number; high?: number; medium?: number; low?: number }>(
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
      // platform → { envDrift, schemaDrift }
      const plat = readSource<{ envDrift?: number; schemaDrift?: number }>(
        overview,
        spec.source
      );
      if (!plat) return null;
      const driftCount = (plat.envDrift ?? 0) + (plat.schemaDrift ?? 0);
      return <MiniDriftPill label="Config drift" driftCount={driftCount} />;
    }

    case "counts": {
      // reference → { departments, courses, sections }
      const ref = readSource<{
        departments?: number;
        courses?: number;
        sections?: number;
      }>(overview, spec.source);
      if (!ref) return null;
      const counts = [
        ref.departments ?? 0,
        ref.courses ?? 0,
        ref.sections ?? 0,
      ];
      return (
        <MiniCountPills
          label="Reference counts"
          counts={counts}
        />
      );
    }

    default:
      return null;
  }
}
