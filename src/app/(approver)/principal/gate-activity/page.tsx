"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { usePolling } from "@/hooks/usePolling";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { clearCache } from "@/hooks/useApiResource";
import { fetchJson } from "../_shared";
import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  ArrowLeft,
  MapPin,
} from "lucide-react";
import {
  PresenceMatrixPanel,
  HostelOverviewPanel,
  HostelAttendancePanel,
  OutpassLeavePanel,
  OutpassRow,
  PresenceMatrixData,
} from "../_shared";

function GateActivityInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  const [matrix, setMatrix] = useState<PresenceMatrixData | null>(null);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [outpasses, setOutpasses] = useState<OutpassRow[] | null>(null);
  const [leaves, setLeaves] = useState<OutpassRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    clearCache();
    const [matR, outR, leaveR] = await Promise.all([
      fetchJson("/api/occupancy/presence-matrix"),
      fetchJson("/api/permissions?workflow_type=outpass&status=PENDING"),
      fetchJson("/api/permissions?workflow_type=staff_leave&status=PENDING"),
    ]);
    setMatrix(matR.success ? ((matR.data as PresenceMatrixData) ?? null) : null);
    setMatrixError(matR.success ? null : matR.error?.message ?? "Unknown error");
    setOutpasses(outR.success ? ((outR.data as OutpassRow[]) ?? []) : null);
    setLeaves(leaveR.success ? ((leaveR.data as OutpassRow[]) ?? []) : null);
    setLastRefresh(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const loading = matrix === null && !matrixError && refreshing;
  const pendingApprovals = (outpasses?.length ?? 0) + (leaves?.length ?? 0);

  /* Gate totals for the summary strip */
  const gateSummary = useMemo(() => {
    if (!matrix) return [];
    const gates = matrix.gates ?? [];
    const roles = matrix.roles ?? [];
    const m = matrix.matrix ?? {};
    return gates.map((g) => ({
      ...g,
      total: roles.reduce((s, r) => s + (m[g.id]?.[r] ?? 0), 0),
    }));
  }, [matrix]);

  const totalOnCampus = gateSummary.reduce((s, g) => s + g.total, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 px-4 sm:px-6 py-6 sm:py-8 min-w-0">
      {/* Back link */}
      <Link
        href="/principal"
        className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="w-3 h-3" /> Back to Overview
      </Link>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono">{role}</span> · tier {tier}
            {lastRefresh && (
              <span className="ml-2">· last refresh {new Date(lastRefresh).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </p>
        </div>
      </div>

      {/* Quick stat strip */}
      <WidgetBoundary title="Gate Summary">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
              <MapPin className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-semibold uppercase tracking-wide">Gates Registered</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              {gateSummary.length}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wide">On-Campus Now</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-400">{totalOnCampus}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-wide">Pending Approvals</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-amber-400">{pendingApprovals}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
              <MapPin className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold uppercase tracking-wide">Hostel Status</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-400">
              {(matrix?.roles?.length ?? 0) > 0 ? "Active" : "—"}
            </p>
          </div>
        </div>
      </WidgetBoundary>

      {/* Live matrix */}
      <PresenceMatrixPanel matrixData={matrix} loading={loading} error={matrixError} />

      {/* Gate-level summary table */}
      <WidgetBoundary title="Gate Activity Overview">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
            <MapPin className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold uppercase tracking-wide">Gate Activity Overview</span>
          </div>
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 w-1/3 bg-[var(--bg-elevated)] rounded" />
            </div>
          ) : matrixError ? (
            <p className="text-xs text-amber-300">{matrixError}</p>
          ) : gateSummary.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No gates registered.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-full">
                <thead>
                  <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                    <th className="py-2 pr-4 font-medium">Gate</th>
                    <th className="py-2 pr-4 font-medium">On Campus</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {gateSummary.map((g) => (
                    <tr key={g.id}>
                      <td className="py-2 pr-4">
                        <span className="text-[var(--text-primary)] font-medium">
                          {g.name || g.code || g.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`font-bold ${g.total > 0 ? "text-emerald-400" : "text-[var(--text-muted)]"}`}>
                          {g.total}
                        </span>
                      </td>
                      <td className="py-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
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
        </div>
      </WidgetBoundary>

      {/* Hostel overview */}
      <HostelOverviewPanel matrix={matrix} pendingApprovals={pendingApprovals} />

      {/* Hostel attendance */}
      <HostelAttendancePanel matrix={matrix} />

      {/* Outpass & leave */}
      <OutpassLeavePanel
        outpasses={outpasses}
        leaves={leaves}
        loading={outpasses === null && leaves === null}
        error={null}
      />

      <DevContactStrip />
    </div>
  );
}
export default function GateActivityPage() {
  return (
    <AuthGuard allowedRoles={['principal', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <GateActivityInner />
      </Suspense>
    </AuthGuard>
  );
}
