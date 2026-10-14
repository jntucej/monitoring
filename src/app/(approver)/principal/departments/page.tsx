"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
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
  Building2,
} from "lucide-react";
import {
  fetchJson,
  DepartmentRow,
} from "../_shared";

function DepartmentContent({
  departments,
  students,
  loading,
  error,
}: {
  departments: DepartmentRow[] | null;
  students: Person[] | null;
  loading: boolean;
  error: string | null;
}) {
  const deptMap = useMemo(() => {
    const m = new Map<string, { code: string; name: string; count: number }>();
    (departments ?? []).forEach((d) => {
      const key = d.code || d.name;
      m.set(key, { code: d.code, name: d.name, count: 0 });
    });
    (students ?? []).forEach((s) => {
      const dep = (s as Person & { department_id?: string }).department_id || s.department || "Unassigned";
      if (!m.has(dep)) m.set(dep, { code: dep, name: dep, count: 0 });
      m.get(dep)!.count++;
    });
    return m;
  }, [departments, students]);

  const rows = [...deptMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([key, d]) => ({ key, ...d }));

  return (
    <WidgetBoundary title="Department Performance">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <Building2 className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Department Performance
          </span>
        </div>
        {loading && !departments && !students ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-1/3 bg-[var(--bg-elevated)] rounded" />
          </div>
        ) : error ? (
          <p className="text-xs text-amber-300">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No department data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-full">
              <thead>
                <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="py-2 pr-4 font-medium">Department</th>
                  <th className="py-2 pr-4 font-medium">Code</th>
                  <th className="py-2 font-medium">Active Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td className="py-2 pr-4">
                      <span className="text-[var(--text-primary)]">{r.name || r.key}</span>
                    </td>
                    <td className="py-2 pr-4 text-[var(--text-muted)] font-mono text-xs">{r.code}</td>
                    <td className="py-2">
                      <span className="font-bold text-[var(--text-primary)]">{r.count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

function DepartmentsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  const [departments, setDepartments] = useState<DepartmentRow[] | null>(null);
  const [students, setStudents] = useState<Person[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    clearCache();
    const [deptR, studentsR] = await Promise.all([
      fetchJson("/api/departments"),
      fetchJson("/api/students?scope=active"),
    ]);
    setDepartments(deptR.success ? ((deptR.data as DepartmentRow[]) ?? []) : null);
    setStudents(studentsR.success ? ((studentsR.data as Person[]) ?? []) : null);
    setError(
      deptR.success ? null : deptR.error?.message ?? "Unknown error",
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

      <DepartmentContent
        departments={departments}
        students={students}
        loading={departments === null && students === null && !error && refreshing}
        error={error}
      />

      <DevContactStrip />
    </div>
  );
}
export default function DepartmentsPage() {
  return (
    <AuthGuard allowedRoles={['principal', 'warden', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <DepartmentsInner />
      </Suspense>
    </AuthGuard>
  );
}
