"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { MapPin, Users, Activity } from "lucide-react";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { usePolling } from "@/hooks/usePolling";
import { useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface PresenceMatrixData {
  gates?: Array<{ id: string; name?: string; code?: string }>;
  roles?: string[];
  matrix?: Record<string, Record<string, number>>;
  lastUpdated?: string;
}

function CampusActivityInner() {
  const [matrix, setMatrix] = useState<PresenceMatrixData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/occupancy/presence-matrix");
      const json = await res.json();
      if (json.success) {
        setMatrix(json.data);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  usePolling(load, { intervalMs: 30_000 });

  const totalInside = (() => {
    if (!matrix?.matrix || !matrix.gates || !matrix.roles) return 0;
    let total = 0;
    for (const gate of matrix.gates) {
      for (const role of matrix.roles) {
        total += matrix.matrix[gate.id]?.[role] ?? 0;
      }
    }
    return total;
  })();

  return (
    <PrincipalWidgetBoundary title="Campus Activity">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Campus Presence Matrix
          </span>
          {matrix && (
            <span className="text-xs text-[var(--text-muted)] ml-auto">
              {totalInside} total inside
            </span>
          )}
        </div>

        {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}

        {!matrix && !error ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : matrix ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left font-semibold text-[var(--text-muted)] pb-2">Gate</th>
                  {matrix.roles?.slice(0, 6).map((r) => (
                    <th key={r} className="text-center font-semibold text-[var(--text-muted)] pb-2">
                      {r}
                    </th>
                  ))}
                  <th className="text-center font-semibold text-[var(--text-muted)] pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {matrix.gates?.map((g) => {
                  const row = matrix.matrix?.[g.id] ?? {};
                  const total = Object.values(row).reduce((s, v) => s + v, 0);
                  return (
                    <tr key={g.id} className="border-t border-[var(--border)]">
                      <td className="py-1.5 pr-2 text-[var(--text-primary)] font-medium truncate">
                        {g.name || g.code || g.id}
                      </td>
                      {matrix.roles?.slice(0, 6).map((r) => (
                        <td key={r} className="py-1.5 text-center">
                          <span
                            className={`inline-block min-w-[2rem] px-1 rounded ${
                              (row[r] ?? 0) > 0 ? "bg-indigo-500/10 text-indigo-300" : "text-[var(--text-muted)]"
                            }`}
                          >
                            {row[r] ?? 0}
                          </span>
                        </td>
                      ))}
                      <td className="py-1.5 text-center font-semibold text-[var(--text-primary)]">
                        {total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)] py-3 text-center">No presence data.</p>
        )}
      </div>
    </PrincipalWidgetBoundary>
  );
}

export default function CampusActivityPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <div className="px-4 sm:px-6 py-6 space-y-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Campus Activity</h1>
        <CampusActivityInner />
      </div>
    </Suspense>
  );
}
