"use client";

/* ── PresenceMatrixPanel (Live Gate Presence) ── */

import { memo } from "react";
import { AlertTriangle, MapPin } from "lucide-react";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import type { PresenceMatrixData } from "./types";
import { fmtTime } from "./types";

/* ── cell class lookup (module-level to avoid per-render string allocation) ── */
const CELL_BG = ["", "bg-emerald-500/10", "bg-emerald-500/20", "bg-emerald-500/40"] as const;
function cellClass(n: number): string {
  return `px-2 py-1 text-[10px] ${CELL_BG[Math.min(n, 3)]}`;
}

export const PresenceMatrixPanel = memo(function PresenceMatrixPanel({
  matrixData,
  loading,
  error,
}: {
  matrixData: PresenceMatrixData | null;
  loading: boolean;
  error: string | null;
}) {
  const gates = matrixData?.gates ?? [];
  const roles = matrixData?.roles ?? [];
  const matrix = matrixData?.matrix ?? {};

  return (
    <PrincipalWidgetBoundary title="Live Gate Presence">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-4">
          <MapPin className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Live Gate Presence</span>
        </div>
        {loading && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
        {error && !loading && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Could not load presence matrix: {error}
          </div>
        )}
        {matrixData && !loading && !error && gates.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">No active gates configured.</p>
        )}
        {matrixData && !loading && !error && gates.length > 0 && (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr>
                  <th className="text-left text-[var(--text-muted)] font-semibold pr-3 pb-2">Gate</th>
                  {roles.map((r) => (
                    <th key={r} className="text-center text-[var(--text-muted)] font-semibold px-1.5 pb-2">
                      {r.length > 6 ? `${r.slice(0, 5)}…` : r}
                    </th>
                  ))}
                  <th className="text-right text-[var(--text-muted)] font-semibold pl-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {gates.map((g) => {
                  const row = matrix[g.id] ?? {};
                  const total = roles.reduce((acc, r) => acc + (Number(row[r]) || 0), 0);
                  return (
                    <tr key={g.id} className="border-t border-[var(--border)]">
                      <td className="py-2.5 pr-3 font-medium text-[var(--text-primary)]">
                        {g.name || g.code || g.id}
                      </td>
                      {roles.map((r) => {
                        const v = Number(row[r]) || 0;
                        return (
                          <td key={r} className="text-center px-1.5 py-2.5">
                            <span
                              className={`inline-block min-w-[1.5rem] rounded px-1 py-0.5 text-center font-mono ${
                                v > 0
                                  ? v >= 20
                                    ? "bg-emerald-500/30 text-emerald-300"
                                    : "bg-indigo-500/25 text-indigo-300"
                                  : "text-[var(--text-muted)]"
                              } ${cellClass(v)}`}
                            >
                              {v}
                            </span>
                          </td>
                        );
                      })}
                      <td className="text-right pl-2 font-mono text-[var(--text-primary)]">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {matrixData.lastUpdated && (
              <p className="text-[10px] text-[var(--text-muted)] mt-2">Updated {fmtTime(matrixData.lastUpdated)}</p>
            )}
          </div>
        )}
      </div>
    </PrincipalWidgetBoundary>
  );
});
