"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Person, Role } from "@/lib/types";
import { usePolling } from "@/hooks/usePolling";
import { clearCache } from "@/hooks/useApiResource";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  TrendingUp,
} from "lucide-react";
import { fetchJson, StatCard, DepartmentRow } from "../_shared";
import { AuthGuard } from "@/components/shared/AuthGuard";

interface AnalyticsMetric {
  key: string;
  label: string;
  value: number;
  unit?: string;
}

function DepartmentAnalyticsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  const [departments, setDepartments] = useState<DepartmentRow[] | null>(null);
  const [students, setStudents] = useState<Person[] | null>(null);
  const [metrics, setMetrics] = useState<AnalyticsMetric[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    clearCache();
    setError(null);
    const [depR, stuR, anaR] = await Promise.all([
      fetchJson("/api/departments"),
      fetchJson("/api/students?scope=active"),
      fetchJson("/api/campus-extra/analytics?role=principal&date_range=30d"),
    ]);
    setDepartments(depR.success ? ((depR.data as DepartmentRow[]) ?? []) : null);
    setStudents(stuR.success ? ((stuR.data as Person[]) ?? []) : null);
    setMetrics(
      anaR.success
        ? (((anaR.data as { metrics?: AnalyticsMetric[] })?.metrics ?? null) as AnalyticsMetric[] | null)
        : null
    );
    setLastRefresh(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  usePolling(refresh, { intervalMs: 60_000, enabled: !!user });

  // Per-department headcount from the live roster
  const rows = useMemo(() => {
    const m = new Map<string, { code: string; name: string; count: number }>();
    (departments ?? []).forEach((d) => {
      const key = d.code || d.name;
      m.set(key, { code: d.code, name: d.name, count: 0 });
    });
    (students ?? []).forEach((s) => {
      const dep =
        (s as Person & { department_id?: string }).department_id || s.department || "Unassigned";
      if (!m.has(dep)) m.set(dep, { code: dep, name: dep, count: 0 });
      m.get(dep)!.count += 1;
    });
    return [...m.entries()].sort((a, b) => b[1].count - a[1].count).map(([key, d]) => ({ key, ...d }));
  }, [departments, students]);

  const maxCount = Math.max(1, ...rows.map((r) => r.count));
  const totalStudents = students?.length ?? 0;
  const processed = metrics?.find((m) => m.key === "total_processed");
  const turnaround = metrics?.find((m) => m.key === "avg_turnaround_hrs");

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
            Signed in as <span className="font-mono">{role}</span> · tier {tier} · department analytics
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
        <StatCard
          icon={Building2}
          label="Departments"
          value={departments === null ? "…" : rows.length}
          sub="Across the institution"
          accent="text-indigo-400"
        />
        <StatCard
          icon={Building2}
          label="Active Students"
          value={students === null ? "…" : totalStudents}
          sub="On-campus roster"
          accent="text-emerald-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Turnaround (30d)"
          value={turnaround ? `${turnaround.value}${turnaround.unit ?? ""}` : "—"}
          sub={processed ? `${processed.value} requests processed` : "From campus analytics"}
          accent="text-sky-400"
        />
      </div>

      {/* Per-department bar chart */}
      <WidgetBoundary title="Headcount by Department">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
          {rows.length === 0 ? (
            <EmptyState
              title="No department data"
              description="Department headcount will appear once the roster and department tables populate."
              icon={<Building2 className="w-6 h-6 text-[var(--text-muted)]" />}
              action={
                <Link
                  href="/principal/departments"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                >
                  Open Departments
                </Link>
              }
            />
          ) : (
            <div className="space-y-3 min-w-0">
              {rows.map((r) => {
                const pct = Math.round((r.count / maxCount) * 100);
                return (
                  <div key={r.key} className="min-w-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-semibold text-[var(--text-primary)] truncate">
                        {r.name}
                      </span>
                      <span className="text-[var(--text-muted)] ml-2 shrink-0">{r.count} students</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden border border-[var(--border)]">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all motion-reduce:transition-none"
                        style={{ width: `${Math.max(pct, r.count > 0 ? 4 : 0)}%` }}
                        role="progressbar"
                        aria-valuenow={r.count}
                        aria-valuemin={0}
                        aria-valuemax={maxCount}
                        aria-label={`${r.name}: ${r.count} students`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}
export default function DepartmentAnalyticsPage() {
  return (
    <AuthGuard allowedRoles={['principal', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <DepartmentAnalyticsInner />
      </Suspense>
    </AuthGuard>
  );
}
