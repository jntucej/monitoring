"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { usePolling } from "@/hooks/usePolling";
import { clearCache } from "@/hooks/useApiResource";
import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { fetchJson, StatCard, OutpassRow } from "../_shared";
import { AuthGuard } from "@/components/shared/AuthGuard";

interface AnalyticsMetric {
  key: string;
  label: string;
  value: number;
  unit?: string;
}

function ExaminationOversightInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  const [examPending, setExamPending] = useState<OutpassRow[] | null>(null);
  const [examApproved, setExamApproved] = useState<OutpassRow[] | null>(null);
  const [metrics, setMetrics] = useState<AnalyticsMetric[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    clearCache();
    setError(null);
    const [pendingR, approvedR, analyticsR] = await Promise.all([
      fetchJson("/api/permissions?workflow_type=exam&status=PENDING&limit=100"),
      fetchJson("/api/permissions?workflow_type=exam&status=APPROVED&limit=50"),
      fetchJson("/api/campus-extra/analytics?role=principal"),
    ]);
    setExamPending(pendingR.success ? ((pendingR.data as OutpassRow[]) ?? []) : null);
    setExamApproved(approvedR.success ? ((approvedR.data as OutpassRow[]) ?? []) : null);
    setMetrics(
      analyticsR.success
        ? (((analyticsR.data as { metrics?: AnalyticsMetric[] })?.metrics ?? null) as AnalyticsMetric[] | null)
        : null
    );
    setLastRefresh(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  usePolling(refresh, { intervalMs: 60_000, enabled: !!user });

  const turnoverMetric = metrics?.find((m) => m.key === "avg_turnaround_hrs");
  const pendingMetric = metrics?.find((m) => m.key === "pending_requests");

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
            Signed in as <span className="font-mono">{role}</span> · tier {tier} · examination oversight
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
        <StatCard
          icon={GraduationCap}
          label="Exam Requests Pending"
          value={examPending === null ? "…" : (examPending.length ?? 0)}
          sub="Awaiting final sign-off"
          accent={(examPending?.length ?? 0) > 0 ? "text-amber-400" : "text-emerald-400"}
        />
        <StatCard
          icon={CheckCircle2}
          label="Recently Approved"
          value={examApproved === null ? "…" : (examApproved.length ?? 0)}
          sub="Last 50 exam approvals"
          accent="text-emerald-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Turnaround"
          value={turnoverMetric ? `${turnoverMetric.value}${turnoverMetric.unit ?? ""}` : "…"}
          sub={turnoverMetric ? "Approval cycle across workflows" : "Not available"}
          accent="text-sky-400"
        />
        <StatCard
          icon={GraduationCap}
          label="All Pending Requests"
          value={pendingMetric ? String(pendingMetric.value) : "…"}
          sub="Across every workflow type"
          accent="text-indigo-400"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Pending exam clearances */}
      <WidgetBoundary title="Exam Clearances — Principal Stage">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
          {examPending === null ? (
            <p className="text-sm text-[var(--text-muted)]">Loading…</p>
          ) : (examPending.length ?? 0) === 0 ? (
            <EmptyState
              title="Exam queue clear"
              description="No examination requests are awaiting your signature."
              icon={<GraduationCap className="w-6 h-6 text-emerald-400" />}
              action={
                <Link
                  href="/principal/approval-centre"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                >
                  Open Approval Centre
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="text-[var(--text-muted)] text-xs uppercase tracking-wide border-b border-[var(--border)]">
                    <th className="text-left px-3 py-2">Ticket</th>
                    <th className="text-left px-3 py-2">Student</th>
                    <th className="text-left px-3 py-2">Stage</th>
                    <th className="text-right px-3 py-2">Requested</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {(examPending ?? []).slice(0, 15).map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--bg-elevated)]">
                      <td className="px-3 py-2 font-mono text-xs text-[var(--text-primary)]">{r.ticket_number}</td>
                      <td className="px-3 py-2 text-[var(--text-primary)] min-w-0">
                        {r.student?.name || "—"}
                        {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
                      </td>
                      <td className="px-3 py-2 text-[var(--text-muted)] capitalize">{r.current_stage || "—"}</td>
                      <td className="px-3 py-2 text-right text-xs text-[var(--text-muted)] whitespace-nowrap">
                        {r.requested_at ? new Date(r.requested_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* Recently approved */}
      <WidgetBoundary title="Recently Approved Examinations">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
          {examApproved === null ? (
            <p className="text-sm text-[var(--text-muted)]">Loading…</p>
          ) : (examApproved.length ?? 0) === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">No recent exam approvals on record.</p>
          ) : (
            <ul className="space-y-2 min-w-0">
              {(examApproved ?? []).slice(0, 8).map((r) => (
                <li key={r.id} className="min-w-0 flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-mono text-xs text-[var(--text-primary)] shrink-0">{r.ticket_number}</span>
                  <span className="text-[var(--text-primary)] truncate min-w-0 flex-1">{r.student?.name || "—"}</span>
                  <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                    {(r.created_at ?? r.requested_at)
                      ? new Date(r.created_at ?? r.requested_at!).toLocaleDateString()
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}
export default function ExaminationOversightPage() {
  return (
    <AuthGuard allowedRoles={['principal', 'warden', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <ExaminationOversightInner />
      </Suspense>
    </AuthGuard>
  );
}
