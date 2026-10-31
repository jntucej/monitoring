"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { RoleAnalytics } from "@/components/retention/RoleAnalytics";
import Link from "next/link";
import { ShieldCheck, AlertTriangle, ArrowRight, FileBarChart } from "lucide-react";

/* response shapes */

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

function ExamSuperintendentReportsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_superintendent") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<DataResponse>("/api/permissions?workflow_type=exam", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const allExam: unknown[] = Array.isArray((data as DataResponse | null)?.data)
    ? ((data as DataResponse | null)?.data as unknown[])
    : [];

  /* Simple outcome breakdown */
  const byStatus: Record<string, number> = {};
  for (const row of allExam as Array<Record<string, unknown>>) {
    const s = String(row.status ?? "PENDING");
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }
  const approved = byStatus.APPROVED ?? 0;
  const pending = byStatus.PENDING ?? 0;
  const rejected = byStatus.REJECTED ?? 0;
  const escalated = byStatus.ESCALATED ?? 0;
  const total = allExam.length;
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/exam/superintendent"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Overview
      </Link>

      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Reports data unavailable: {error}</span>
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <WidgetBoundary title="Exam Reports">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <FileBarChart className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white">Examination Reports & Analytics</span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">{total} exam record(s)</span>
          </div>

          {/* Outcome breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 min-w-0">
            {busy ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-800/40" />
              ))
            ) : (
              <>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Approval Rate</p>
                  <p className="mt-1 text-lg font-bold text-emerald-400">{approvalRate}%</p>
                  <p className="text-xs text-slate-500">{approved} approved of {total}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Pending</p>
                  <p className="mt-1 text-lg font-bold text-sky-400">{pending}</p>
                  <p className="text-xs text-slate-500">Awaiting clearance</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Escalated</p>
                  <p className="mt-1 text-lg font-bold text-amber-400">{escalated}</p>
                  <p className="text-xs text-slate-500">Held for review</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Rejected</p>
                  <p className="mt-1 text-lg font-bold text-rose-400">{rejected}</p>
                  <p className="text-xs text-slate-500">Denied clearances</p>
                </div>
              </>
            )}
          </div>

          {/* Data availability note */}
          <div className="px-4 pb-4 min-w-0">
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              Outcome counts derived from the live exam workflow queue; auto-refreshes every 30 seconds.
            </p>
          </div>
        </div>
      </WidgetBoundary>

      {/* Role-scoped analytics (exam_superintendent fallback view) */}
      <RoleAnalytics />

      <DevContactStrip />
    </div>
  );
}

export default function ExamSuperintendentReportsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ExamSuperintendentReportsInner />
    </Suspense>
  );
}
