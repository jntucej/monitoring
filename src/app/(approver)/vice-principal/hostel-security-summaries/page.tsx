"use client";

import { Suspense, useMemo } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useProbe } from "../_probe";
import { Loader2, Inbox, Building2, Siren, ShieldCheck, Users } from "lucide-react";

interface PresenceMatrixData {
  gates: Array<{ id: string; name: string; code: string }>;
  roles: string[];
  matrix: Record<string, Record<string, number>>;
  lastUpdated: string;
}

interface AlertRow {
  id: string;
  severity: string;
  title: string;
  message?: string;
  timestamp: string;
  gateId?: string;
  studentRoll?: string;
}

function VpHostelSecurityInner() {
  const {
    data: matrix,
    loading: matrixLoading,
    refresh: refreshMatrix,
  } = useApiResource<{ success: boolean; data: PresenceMatrixData }>(
    "/api/occupancy/presence-matrix",
    { ttlMs: 30_000 }
  );

  const alertsProbe = useProbe<{ data?: AlertRow[]; total?: number }>(
    "/api/alerts?resolved=false",
    30_000
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

  const onCampus = gateTotals.reduce((sum, g) => sum + g.total, 0);

  const alertRows: AlertRow[] = useMemo(() => {
    if (!alertsProbe.data) return [];
    if (Array.isArray(alertsProbe.data.data)) return alertsProbe.data.data as AlertRow[];
    return [];
  }, [alertsProbe]);

  const activeAlerts = alertRows.filter((a) => !("resolved" in a) || !(a as AlertRow & { resolved?: boolean }).resolved);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Hostel & Security Rollup">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex items-center gap-2 text-slate-400 mb-3 min-w-0">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Live Campus Presence & Security Posture
            </span>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 min-w-0">
            <div className="rounded-lg bg-slate-800/40 p-3 min-w-0">
              <div className="flex items-center gap-2 text-slate-400">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-xs uppercase tracking-wide">On Campus Now</span>
              </div>
              <p className="text-xl font-bold text-emerald-400">
                {matrixLoading ? <Loader2 className="w-5 h-5 animate-spin inline text-slate-500" /> : onCampus}
              </p>
            </div>
            <div className="rounded-lg bg-slate-800/40 p-3 min-w-0">
              <div className="flex items-center gap-2 text-slate-400">
                <Building2 className="w-4 h-4 text-sky-400" />
                <span className="text-xs uppercase tracking-wide">Active Gates</span>
              </div>
              <p className="text-xl font-bold text-sky-400">
                {matrixLoading && !matrix ? "…" : gateTotals.filter((g) => g.total > 0).length}
              </p>
            </div>
            <div className="rounded-lg bg-slate-800/40 p-3 min-w-0">
              <div className="flex items-center gap-2 text-slate-400">
                <Siren className="w-4 h-4 text-rose-400" />
                <span className="text-xs uppercase tracking-wide">Unresolved Alerts</span>
              </div>
              <p className="text-xl font-bold text-rose-400">
                {alertsProbe.loading ? <Loader2 className="w-5 h-5 animate-spin inline text-slate-500" /> : activeAlerts.length}
              </p>
            </div>
          </div>

          {/* Gate table */}
          {!matrix ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading presence data…
            </div>
          ) : gateTotals.length === 0 ? (
            <div className="p-4 text-center">
              <Inbox className="w-5 h-5 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No active gates configured.</p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800">
                    <th className="text-left px-3 py-2">Gate</th>
                    <th className="text-left px-3 py-2">Code</th>
                    <th className="text-right px-3 py-2">On Campus</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <WidgetBoundary title="Security Alerts">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex items-center gap-2 text-slate-400 mb-3 min-w-0">
            <Siren className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Unresolved Campus Alerts
            </span>
          </div>
          {alertsProbe.loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Checking access…
            </div>
          ) : alertsProbe.restricted ? (
            <div className="rounded-xl border-slate-800 bg-slate-800/20 p-5 text-center text-sm text-slate-500 min-w-0">
              <Siren className="w-5 h-5 text-slate-600 mx-auto mb-2" />
              <p className="max-w-md mx-auto">
                Campus alert detail is restricted at the Vice Principal tier. The Principal and
                Administrator desks carry the live alert feed. Presence rollups above remain
                available.
              </p>
            </div>
          ) : alertsProbe.error ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 min-w-0">
              Alerts unavailable right now: {alertsProbe.error}
            </div>
          ) : activeAlerts.length === 0 ? (
            <div className="p-4 text-center">
              <ShieldCheck className="w-5 h-5 text-emerald-500/50 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No unresolved alerts. Security posture is nominal.</p>
            </div>
          ) : (
            <ul className="space-y-2 min-w-0 max-h-64 overflow-y-auto">
              {activeAlerts.slice(0, 10).map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 min-w-0 flex flex-wrap items-center gap-2"
                >
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                      a.severity === "critical"
                        ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        : a.severity === "high"
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "bg-slate-700 text-slate-300 border border-slate-600"
                    }`}
                  >
                    {a.severity?.toUpperCase() || "INFO"}
                  </span>
                  <span className="text-sm text-slate-200 truncate min-w-0 flex-1">{a.title}</span>
                  <span className="text-xs text-slate-500 shrink-0">
                    {new Date(a.timestamp).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function VpHostelSecuritySummariesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VpHostelSecurityInner />
    </Suspense>
  );
}
