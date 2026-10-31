"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WeekBar } from "../_shared/WeekBar";
import {
  Loader2,
  Inbox,
  CalendarCheck,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
} from "lucide-react";

interface PermissionRequestRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  student?: {
    name: string;
    student_details?: { roll?: string } | null;
  } | null;
}

interface PermissionsResponse {
  success: boolean;
  data: PermissionRequestRow[];
  total?: number;
}

interface CampusAnalyticsResponse {
  success: boolean;
  data?: {
    role?: string;
    metrics?: Array<{ key: string; label: string; value: number; unit?: string }>;
  };
}

function VpExaminationInner() {
  const {
    data: examQueue,
    loading: examLoading,
    error: examError,
    refresh: refreshExam,
  } = useApiResource<PermissionsResponse>("/api/permissions?workflow_type=exam", {
    ttlMs: 30_000,
  });

  const { data: analytics, refresh: refreshAnalytics } =
    useApiResource<CampusAnalyticsResponse>(
      "/api/campus-extra/analytics?role=vice_principal",
      { ttlMs: 30_000 }
    );

  const refreshAll = useMemo(
    () => async () => {
      clearCache();
      await Promise.all([refreshExam(), refreshAnalytics()]);
    },
    [refreshExam, refreshAnalytics]
  );

  usePolling(refreshAll, { intervalMs: 30_000, enabled: true });

  const examRows = (examQueue?.data ?? []) as PermissionRequestRow[];
  const pendingExam = examRows.filter((r) => r.status === "PENDING");
  const decided = examRows.filter(
    (r) => r.status === "APPROVED" || r.status === "COMPLETED"
  );

  const slaAtRisk = pendingExam.filter((r) => {
    if (!r.sla_deadline) return false;
    const ts = new Date(r.sla_deadline).getTime();
    return !Number.isNaN(ts) && ts < Date.now();
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8 py-6 min-w-0">
      <WeekBar />
      <WidgetBoundary title="Examination Operations">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex items-center gap-2 text-slate-400 mb-3 min-w-0">
            <CalendarCheck className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Exam Workflow Coordination
            </span>
          </div>

          {examError && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              Exam queue unavailable: {examError}
            </div>
          )}

          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 min-w-0">
            <div className="rounded-lg bg-slate-800/40 p-3 min-w-0">
              <div className="flex items-center gap-2 text-slate-400">
                <Inbox className="w-4 h-4 text-sky-400" />
                <span className="text-xs uppercase tracking-wide">Exam Requests</span>
              </div>
              <p className="text-xl font-bold text-white">{examLoading && !examQueue ? "…" : examRows.length}</p>
            </div>
            <div className="rounded-lg bg-slate-800/40 p-3 min-w-0">
              <div className="flex items-center gap-2 text-slate-400">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs uppercase tracking-wide">SLA At Risk</span>
              </div>
              <p className="text-xl font-bold text-amber-400">
                {examLoading && !examQueue ? "…" : slaAtRisk.length}
              </p>
            </div>
            <div className="rounded-lg bg-slate-800/40 p-3 min-w-0">
              <div className="flex items-center gap-2 text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs uppercase tracking-wide">Cleared</span>
              </div>
              <p className="text-xl font-bold text-emerald-400">
                {examLoading && !examQueue ? "…" : decided.length}
              </p>
            </div>
          </div>

          {examLoading && !examQueue ? (
            <div className="space-y-2 min-w-0">
              {[0, 1].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-slate-800/60 animate-pulse" />
              ))}
            </div>
          ) : pendingExam.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-center min-w-0">
              <FileCheck2 className="w-5 h-5 text-emerald-500/60 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                No pending exam requests in your scope. Exam coordination is nominal.
              </p>
              <Link
                href="/vice-principal/pending-approvals"
                className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-400 hover:bg-sky-500/20 transition-colors"
              >
                Open Pending Approvals <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <ul className="space-y-2 min-w-0">
              {pendingExam.slice(0, 8).map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 min-w-0 flex flex-wrap items-center gap-2"
                >
                  <span className="font-mono text-xs text-sky-400 shrink-0">{r.ticket_number}</span>
                  <span className="text-sm text-slate-300 truncate min-w-0 flex-1">
                    {r.student?.name || "—"}
                    {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
                  </span>
                  <span className="text-xs text-slate-500 capitalize shrink-0">
                    stage: {r.current_stage}
                  </span>
                  {slaAtRisk.some((x) => x.id === r.id) && (
                    <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-full px-2 py-0.5 shrink-0">
                      SLA breached
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </WidgetBoundary>

      <WidgetBoundary title="Ops Signals">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex items-center gap-2 text-slate-400 mb-3 min-w-0">
            <Loader2 className="w-4 h-4 shrink-0 hidden" />
            <FileCheck2 className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Campus Ops Signal (VP scope)
            </span>
          </div>
          {analytics?.data?.metrics && analytics.data.metrics.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
              {analytics.data.metrics.map((m) => (
                <div key={m.key} className="rounded-lg bg-slate-800/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 truncate">{m.label}</p>
                  <p className="text-lg font-bold text-white">
                    {m.value}
                    {m.unit ? <span className="text-xs text-slate-400 ml-1">{m.unit}</span> : null}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No ops signals for this period. Signals surface once exam workflows are in flight.
            </p>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}
export default function VpExaminationPage() {
  return (
    <AuthGuard allowedRoles={['vice_principal', 'exam_branch', 'oie', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <VpExaminationInner />
      </Suspense>
    </AuthGuard>
  );
}
