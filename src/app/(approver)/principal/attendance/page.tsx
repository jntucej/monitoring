"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { usePolling } from "@/hooks/usePolling";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { clearCache } from "@/hooks/useApiResource";
import Link from "next/link";
import {
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import {
  fetchJson,
  StaffAttendanceResp,
} from "../_shared";

interface AttendanceInnerProps {
  data: StaffAttendanceResp | null;
  loading: boolean;
  error: string | null;
}

function AttendanceContent({ data, loading, error }: AttendanceInnerProps) {
  const s = data?.summary;
  const total = s?.totalStaff ?? 0;
  const present = s?.presentToday ?? 0;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <WidgetBoundary title="Institutional Attendance">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Institutional Attendance
          </span>
        </div>
        {loading && !data ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-1/3 bg-[var(--bg-elevated)] rounded" />
            <div className="h-4 w-1/2 bg-[var(--bg-elevated)] rounded" />
          </div>
        ) : error ? (
          <p className="text-xs text-amber-300">{error}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-bold text-emerald-400">{present}</p>
              <p className="text-xs text-[var(--text-muted)]">Present</p>
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-bold text-rose-400">{s?.absentToday ?? 0}</p>
              <p className="text-xs text-[var(--text-muted)]">Absent</p>
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-bold text-amber-400">{s?.onLeave ?? 0}</p>
              <p className="text-xs text-[var(--text-muted)]">On Leave</p>
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">{pct}%</p>
              <p className="text-xs text-[var(--text-muted)]">Attendance Rate</p>
            </div>
          </div>
        )}

        {data?.data && data.data.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
              Staff Breakdown
            </p>
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[320px]">
                <thead>
                  <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Role</th>
                    <th className="py-2 pr-4 font-medium">Department</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.data.map((row, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-4 text-[var(--text-primary)]">{row.name}</td>
                      <td className="py-2 pr-4 text-[var(--text-muted)] capitalize">{row.role}</td>
                      <td className="py-2 pr-4 text-[var(--text-muted)]">{row.department ?? "—"}</td>
                      <td className="py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            row.present
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-rose-500/15 text-rose-300"
                          }`}
                        >
                          {row.present ? "Present" : "Absent"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

function AttendanceInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  const [data, setData] = useState<StaffAttendanceResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    clearCache();
    const [attR] = [fetchJson("/api/staff/attendance")];
    const att = await attR;
    setData(att.success ? ((att.data as StaffAttendanceResp) ?? null) : null);
    setError(att.success ? null : att.error?.message ?? "Unknown error");
    setLastRefresh(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const loading = data === null && !error && refreshing;

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
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-50 flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <AttendanceContent data={data} loading={loading} error={error} />

      <DevContactStrip />
    </div>
  );
}

export default function PrincipalAttendancePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AttendanceInner />
    </Suspense>
  );
}
