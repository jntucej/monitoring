"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { usePolling } from "@/hooks/usePolling";
import { useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Grid3x3 } from "lucide-react";

/**
 * PrincipalSlaHeatmap — SLA status heatmap across gate × role.
 * Uses /api/occupancy/presence-matrix as the data source (closest real endpoint).
 * Displays a colour-coded grid where each cell shows the count of people
 * in that gate+role combination.
 */
export function PrincipalSlaHeatmap() {
  const [matrix, setMatrix] = useState<{
    gates?: Array<{ id: string; name?: string; code?: string }>;
    roles?: string[];
    matrix?: Record<string, Record<string, number>>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/occupancy/presence-matrix");
      const json = await res.json();
      if (json.success) setMatrix(json.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  usePolling(load, { intervalMs: 30_000 });

  const cellColor = (count: number): string => {
    if (count === 0) return "bg-[var(--bg-elevated)]";
    if (count < 3) return "bg-emerald-500/20";
    if (count < 10) return "bg-amber-500/30";
    return "bg-rose-500/40";
  };

  return (
    <PrincipalWidgetBoundary title="SLA Heatmap">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <Grid3x3 className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Gate × Role Presence
          </span>
        </div>

        {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}

        {!matrix && !error ? (
          <div className="space-y-2">
            {[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : matrix ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="p-1.5 text-left font-semibold text-[var(--text-muted)]">Gate</th>
                  {matrix.roles?.map((r) => (
                    <th key={r} className="p-1.5 text-center font-semibold text-[var(--text-muted)]">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.gates?.map((g) => (
                  <tr key={g.id}>
                    <td className="p-1.5 text-[var(--text-primary)] font-medium min-w-[6rem] truncate">
                      {g.name || g.code || g.id}
                    </td>
                    {matrix.roles?.map((r) => {
                      const count = matrix.matrix?.[g.id]?.[r] ?? 0;
                      return (
                        <td key={r} className="p-0.5">
                          <div
                            className={`h-8 flex items-center justify-center rounded ${cellColor(count)}`}
                            title={`${g.name}: ${r} = ${count}`}
                          >
                            <span className="text-[11px] font-bold text-[var(--text-primary)]">
                              {count}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)] py-3 text-center">No data available.</p>
        )}

        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 text-[10px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-[var(--bg-elevated)]" /> 0
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500/20" /> Low
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-500/30" /> Medium
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-rose-500/40" /> High
          </span>
        </div>
      </div>
    </PrincipalWidgetBoundary>
  );
}

/**
 * /principal/oversee/sla-heatmap — wraps PrincipalSlaHeatmap.
 */
function SlaHeatmapPageInner() {
  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">SLA Heatmap</h1>
      <PrincipalSlaHeatmap />
    </div>
  );
}

export default function SlaHeatmapPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <SlaHeatmapPageInner />
    </Suspense>
  );
}
