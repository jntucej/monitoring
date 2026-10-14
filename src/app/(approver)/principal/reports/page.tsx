"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Person, Role } from "@/lib/types";
import { usePolling } from "@/hooks/usePolling";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { clearCache } from "@/hooks/useApiResource";
import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  ArrowLeft,
  FileText,
} from "lucide-react";
import {
  fetchJson,
  fmtTime,
  fmtDate,
  StaffAttendanceResp,
} from "../_shared";

function ReportsContent({
  attendance,
  students,
  loading,
}: {
  attendance: StaffAttendanceResp | null;
  students: Person[] | null;
  loading: boolean;
}) {
    const s = attendance?.summary;
  const studentCount = students?.length ?? 0;
  const absent = s ? Math.max(0, s.totalStaff - s.presentToday) : 0;

  const reports = [
    {
      label: "Staff Attendance Summary",
      value: s ? `${s.presentToday}/${s.totalStaff} present` : "—",
      sub: `${absent} absent today`,
    },
    {
      label: "Active Student Population",
      value: String(studentCount),
      sub: "On-campus roster",
    },
    {
      label: "Detailed Analytics",
      value: "Restricted",
      sub: "Available to admin/sysadmin only",
    },
  ];

  return (
    <WidgetBoundary title="Institutional Reports">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <FileText className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Institutional Reports
          </span>
        </div>
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-1/2 bg-[var(--bg-elevated)] rounded" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
            {reports.map((r) => (
              <div key={r.label} className="rounded-xl bg-[var(--bg-elevated)] p-3 sm:p-4 min-w-0">
                <p className="text-xs text-[var(--text-muted)]">{r.label}</p>
                <p className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mt-1">{r.value}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{r.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Export note (spec: Reports & Exports) */}
        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <FileText className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Exports
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Institutional report exports (attendance registers, gate-movement logs, permission
            decision history) are generated on request by the system desk and issued as signed
            PDFs. To request an export, note the report type, date range, and purpose — exports
            are audit-logged against your identity. Detailed analytics charts are restricted to
            the admin tier; use the <span className="text-[var(--text-primary)]">Reports &amp;
            Exports</span> desk for anything not shown here.
          </p>
        </div>

        {/* Quick attendance breakdown when available */}
        {s && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-0">
            <div>
              <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">{s.totalStaff}</p>
              <p className="text-xs text-[var(--text-muted)]">Total Staff</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-emerald-400">{s.presentToday}</p>
              <p className="text-xs text-[var(--text-muted)]">Present Today</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-rose-400">{absent}</p>
              <p className="text-xs text-[var(--text-muted)]">Absent Today</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-amber-400">{s?.currentlyOutside ?? 0}</p>
              <p className="text-xs text-[var(--text-muted)]">Currently Out</p>
            </div>
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

function ReportsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  const [attendance, setAttendance] = useState<StaffAttendanceResp | null>(null);
  const [students, setStudents] = useState<Person[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    clearCache();
    const [attR, stuR] = await Promise.all([
      fetchJson("/api/staff/attendance"),
      fetchJson("/api/students?scope=active"),
    ]);
    setAttendance(attR.success ? ((attR as unknown as StaffAttendanceResp) ?? null) : null);
    setStudents(stuR.success ? ((stuR.data as Person[]) ?? []) : null);
    setError(
      attR.success ? null : attR.error?.message ?? "Unknown error",
    );
    setLastRefresh(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 px-4 sm:px-6 py-6 sm:py-8 min-w-0">
      <Link
        href="/principal"
        className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="w-3 h-3" /> Back to Overview
      </Link>

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

      {error && !refreshing && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex items-center gap-2">
          <FileText className="w-4 h-4 shrink-0" />
          <span className="min-w-0">Report data unavailable: {error}</span>
        </div>
      )}

      <ReportsContent
        attendance={attendance}
        students={students}
        loading={attendance === null && students === null && !error && refreshing}
      />

      <DevContactStrip />
    </div>
  );
}
export default function ReportsPage() {
  return (
    <AuthGuard allowedRoles={['principal', 'warden', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <ReportsInner />
      </Suspense>
    </AuthGuard>
  );
}
