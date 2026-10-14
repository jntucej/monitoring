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
  const absent = Math.max(0, total - present);
  const pct = s?.overallAttendanceRate ?? (total > 0 ? Math.round((present / total) * 100) : 0);

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
              <p className="text-2xl sm:text-3xl font-bold text-rose-400">{absent}</p>
              <p className="text-xs text-[var(--text-muted)]">Absent</p>
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-bold text-amber-400">{s?.currentlyOutside ?? 0}</p>
              <p className="text-xs text-[var(--text-muted)]">Currently Out</p>
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">{pct}%</p>
              <p className="text-xs text-[var(--text-muted)]">Attendance Rate</p>
            </div>
          </div>
        )}

        {data?.records && data.records.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
              Staff Breakdown
            </p>
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[320px]">
                <thead>
                  <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Designation</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium">First In</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.records.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-4 text-[var(--text-primary)]">{row.fullName}</td>
                      <td className="py-2 pr-4 text-[var(--text-muted)]">{row.designation}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            row.status !== "ABSENT"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-rose-500/15 text-rose-300"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2 text-[var(--text-muted)]">
                        {row.firstInTime
                          ? new Date(row.firstInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "—"}
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
    if (att.success) {
      // The staff attendance API returns summary/records at the top level of the
      // JSON body (not nested under a `data` key). Re-cast the raw payload.
      const raw = att as unknown as StaffAttendanceResp;
      setData(raw);
    } else {
      setData(null);
    }
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
