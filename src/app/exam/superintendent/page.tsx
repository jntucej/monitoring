"use client";

import { Suspense, useCallback } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import {
  ClipboardCheck,
  ShieldCheck,
  Users,
  FileText,
  AlertTriangle,
  Inbox,
  Clock,
  Loader2,
  Flag,
} from "lucide-react";

const MIN_TIER = 50; // exam_superintendent tier

/* ── response shapes ── */

interface ExamQueueRow {
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
  data: ExamQueueRow[];
  total?: number;
}

interface SecurityStats {
  [key: string]: number;
}

/* ── building blocks ── */

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-white",
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2">
      <span className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {message}
      </span>
      <button
        onClick={onRetry}
        className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20"
      >
        Retry
      </button>
    </div>
  );
}

/* ── main content ── */

function ExamSuperintendentDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_superintendent") as Role;
  const tier = getRoleTier(role);

  // Pending exam clearances awaiting the superintendent's desk (post OIE/VP review).
  const {
    data: examQueue,
    loading: queueLoading,
    error: queueError,
    refresh: refreshQueue,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflowType=exam&status=PENDING",
    { ttlMs: 30_000 }
  );

  // Gate-scan anomaly counters surfaced during exam windows.
  const {
    data: securityStats,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats,
  } = useApiResource<{ success: boolean; data: SecurityStats }>(
    "/api/admin/security/stats",
    { ttlMs: 30_000 }
  );

  const refresh = useCallback(async () => {
    clearCache();
    await Promise.all([refreshQueue(), refreshStats()]);
  }, [refreshQueue, refreshStats]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const queueRows = examQueue?.data ?? [];
  const pendingTotal = examQueue?.total ?? queueRows.length;
  const breachedCount = queueRows.filter(
    (r) => r.sla_deadline && new Date(r.sla_deadline).getTime() < Date.now()
  ).length;
  const anomalies = (securityStats?.data?.anomalies ?? 0) || 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 min-w-0">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-400" />
            Exam Superintendent Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={queueLoading || statsLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
        >
          {queueLoading || statsLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {queueLoading || statsLoading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {(queueError || statsError) && (
        <ErrorBanner
          message={`${queueError ? `Exam queue: ${queueError}` : ""}${queueError && statsError ? " · " : ""}${statsError ? `Security stats: ${statsError}` : ""}`}
          onRetry={() => void refresh()}
        />
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Inbox}
          label="Pending Exam Passes"
          value={pendingTotal}
          sub="Awaiting clearance at the superintendent desk"
          accent="text-emerald-400"
          loading={queueLoading && !examQueue}
        />
        <StatCard
          icon={Flag}
          label="SLA Breached"
          value={breachedCount}
          sub="Past their 48h approval deadline"
          accent="text-amber-400"
          loading={queueLoading && !examQueue}
        />
        <StatCard
          icon={ShieldCheck}
          label="Gate Anomalies"
          value={anomalies}
          sub="Scan anomalies in the security log"
          accent="text-sky-400"
          loading={statsLoading && !securityStats}
        />
        <StatCard
          icon={Users}
          label="Scope"
          value={user?.name || "Superintendent"}
          sub="Examination clearance &amp; escalation authority"
          accent="text-white"
        />
      </div>

      {/* exam pass queue */}
      <WidgetBoundary title="Exam Pass Queue">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-400" />
              Exam Pass Queue
            </h2>
            <span className="text-xs text-slate-500">
              {pendingTotal > 0 ? `${pendingTotal} pending` : "Clear"}
            </span>
          </div>
          {queueLoading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading queue…
            </div>
          ) : queueRows.length === 0 ? (
            <EmptyState message="No pending exam clearance requests. All exam passes have cleared the pipeline." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Ticket</th>
                    <th className="text-left px-4 py-3">Student</th>
                    <th className="text-left px-4 py-3">Stage</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {queueRows.slice(0, 10).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-white font-mono text-xs">{r.ticket_number}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {r.student?.name || "—"}
                        {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
                      </td>
                      <td className="px-4 py-3 text-slate-400 capitalize">{r.current_stage.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-amber-400/30 bg-amber-400/10 text-amber-400">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {r.sla_deadline ? (
                          new Date(r.sla_deadline).getTime() < Date.now() ? (
                            <span className="text-rose-400">Breached · {new Date(r.sla_deadline).toLocaleString()}</span>
                          ) : (
                            new Date(r.sla_deadline).toLocaleString()
                          )
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 text-sm text-slate-400 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          Exam clearance requests reach this desk after OIE and Vice Principal review.
          Use{" "}
          <a className="text-emerald-400 hover:underline" href="/exam/permissions">
            Exam Branch Permissions
          </a>{" "}
          to action the full queue.
        </p>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function ExamSuperintendentDashboardPage() {
  return (
    <GuardedPage minTier={MIN_TIER} allowedRoles={["exam_superintendent", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <ExamSuperintendentDashboardInner />
      </Suspense>
    </GuardedPage>
  );
}
