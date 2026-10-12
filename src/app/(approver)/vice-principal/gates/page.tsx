"use client";

import { Suspense, useMemo } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { Loader2, Inbox, MapPin, Siren } from "lucide-react";

interface PresenceMatrixData {
  gates: Array<{ id: string; name: string; code: string }>;
  roles: string[];
  matrix: Record<string, Record<string, number>>;
  lastUpdated: string;
}

function VpGatesInner() {
  const {
    data: matrix,
    refresh: refreshMatrix,
  } = useApiResource<{ success: boolean; data: PresenceMatrixData }>(
    "/api/occupancy/presence-matrix",
    { ttlMs: 30_000 }
  );

  usePolling(refreshMatrix, { intervalMs: 30_000, enabled: true });

  const gateTotals = useMemo(() => {
    const gates = matrix?.data?.gates ?? [];
    const m = matrix?.data?.matrix ?? {};
    const roles = matrix?.data?.roles ?? [];
    return gates.map((g) => ({
      ...g,
      total: roles.reduce((sum, r) => sum + (m[g.id]?.[r] ?? 0), 0),
    }));
  }, [matrix]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Gate and Incident Summary">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex items-center gap-2 text-slate-400 mb-3 min-w-0">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Gate & Incident Summary
            </span>
          </div>
          {!matrix ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading gate data…
            </div>
          ) : gateTotals.length === 0 ? (
            <div className="p-6 text-center">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No active gates configured.</p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800">
                    <th className="text-left px-3 py-2">Gate</th>
                    <th className="text-left px-3 py-2">Code</th>
                    <th className="text-right px-3 py-2">On Campus</th>
                    <th className="text-right px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {gateTotals.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-800/30">
                      <td className="px-3 py-2 text-slate-200">{g.name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-400">{g.code}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-bold ${g.total > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                          {g.total}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            g.total > 0
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-slate-500/15 text-slate-400"
                          }`}
                        >
                          {g.total > 0 ? "Active" : "Clear"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 min-w-0">
            <Siren className="w-3.5 h-3.5 shrink-0" />
            Incident details are admin-scoped and not shown at the Vice Principal tier.
          </div>
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function VpGatesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VpGatesInner />
    </Suspense>
  );
}
