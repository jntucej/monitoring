"use client";

import { Suspense, useCallback, useState } from "react";
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
  UserCheck,
  AlertTriangle,
  Loader2,
  Inbox,
  Clock,
  ArrowRight,
} from "lucide-react";

/**
 * Exam Branch landing — the oie / exam_branch role has no admin workspace.
 * This dashboard shows ONLY exam-stage permission data:
 *   • OIE queue (exam clearances awaiting the examination officer)
 *   • Pending approvals at the exam stage
 *   • SLA status (48h deadline breaches)
 * No admin analytics, no intelligence panels — admin API endpoints are
 * never fetched.
 */

/* ── response shapes (mirror /api/permissions) ── */

interface PermissionRequestRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  student?: {
    name: string;
    student_details?: { roll?: string; hostel_block?: string } | null;
  } | null;
}

interface PermissionsResponse {
  success: boolean;
  data: PermissionRequestRow[];
  total?: number;
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

function ExamBranchLandingInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "oie") as Role;
  const tier = getRoleTier(role);

  // The server scopes /api/permissions by the caller's own stage for oie /
  // vice_principal / exam_branch (exam_branch is not in the role→stage map, so
  // an explicit stage param is used for it), therefore each queue below shows
  // ONLY its own pending data.
  const isExamBranchRole = role === "exam_branch";

  const {
    data: oieData,
    loading: oieLoading,
    error: oieError,
    refresh: refreshOie,
  } = useApiResource<PermissionsResponse>(
    `/api/permissions?workflowType=exam&status=PENDING${isExamBranchRole ? "&stage=oie" : ""}`,
    { ttlMs: 30_000 }
  );

  const {
    data: vpData,
    loading: vpLoading,
    refresh: refreshVp,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflowType=exam&status=PENDING&stage=vice_principal",
    { ttlMs: 30_000 }
  );

  const refresh = useCallback(async () => {
    clearCache();
    await Promise.all([refreshOie(), refreshVp()]);
  }, [refreshOie, refreshVp]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const oieRows = oieData?.data ?? [];
  const vpRows = vpData?.data ?? [];
  const oieTotal = oieData?.total ?? oieRows.length;
  const vpTotal = vpData?.total ?? vpRows.length;
  const oieSlaBreached = oieRows.filter((r) => {
    if (!r.sla_deadline) return false;
    const ts = new Date(r.sla_deadline).getTime();
    return !Number.isNaN(ts) && ts < Date.now();
  }).length;

  const [activeTab, setActiveTab] = useState<"oie" | "vp">("oie");

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Page toolbar — global DynamicHeader already renders the app header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <span className="truncate">Exam Branch Dashboard</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={oieLoading || vpLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          {oieLoading || vpLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {oieLoading || vpLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* error banner */}
      {(oieError || (!oieData && !oieLoading)) && (
        <ErrorBanner
          message={`Exam queue loading failed: ${oieError ?? "no data"}`}
          onRetry={() => void refreshOie()}
        />
      )}

      {/* KPI row — exam-stage permission data only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
        <StatCard
          icon={Inbox}
          label="OIE Pending"
          value={oieTotal}
          sub="Exam clearances awaiting OIE review"
          accent="text-emerald-400"
          loading={oieLoading && !oieData}
        />
        <StatCard
          icon={UserCheck}
          label="VP Escalations"
          value={vpTotal}
          sub="Exam requests escalated to Vice Principal"
          accent="text-sky-400"
          loading={vpLoading && !vpData}
        />
        <StatCard
          icon={AlertTriangle}
          label="SLA Breached"
          value={oieSlaBreached}
          sub="OIE queue past their 48h deadline"
          accent="text-amber-400"
          loading={oieLoading && !oieData}
        />
        <StatCard
          icon={ShieldCheck}
          label="Total Open"
          value={oieTotal + vpTotal}
          sub="All pending exam-stage approvals"
          accent="text-white"
          loading={(oieLoading && !oieData) || (vpLoading && !vpData)}
        />
      </div>

      {/* queue tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar min-w-0">
        <button
          onClick={() => setActiveTab("oie")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border shrink-0 ${
            activeTab === "oie"
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
          }`}
        >
          OIE Queue {oieTotal > 0 ? `(${oieTotal})` : ""}
        </button>
        <button
          onClick={() => setActiveTab("vp")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border shrink-0 ${
            activeTab === "vp"
              ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
              : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
          }`}
        >
          VP Queue {vpTotal > 0 ? `(${vpTotal})` : ""}
        </button>
      </div>

      {/* queue table */}
      {activeTab === "oie" ? (
        <WidgetBoundary title="OIE Queue">
          <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden">
            {oieLoading ? (
              <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading OIE queue…
              </div>
            ) : oieRows.length === 0 ? (
              <EmptyState message="No pending OIE exam clearances. The queue is clear." />
            ) : (
              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-sm min-w-[640px]">
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
                    {oieRows.slice(0, 10).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-white font-mono text-xs whitespace-nowrap">{r.ticket_number}</td>
                        <td className="px-4 py-3 text-slate-300 min-w-0">
                          {r.student?.name || "—"}
                          {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
                        </td>
                        <td className="px-4 py-3 text-slate-400 capitalize whitespace-nowrap">{r.current_stage.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-amber-400/30 bg-amber-400/10 text-amber-400 whitespace-nowrap">
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
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
      ) : (
        <WidgetBoundary title="VP Escalation Queue">
          <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden">
            {vpLoading ? (
              <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading VP queue…
              </div>
            ) : vpRows.length === 0 ? (
              <EmptyState message="No pending Vice Principal review items." />
            ) : (
              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-sm min-w-[640px]">
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
                    {vpRows.slice(0, 10).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-white font-mono text-xs whitespace-nowrap">{r.ticket_number}</td>
                        <td className="px-4 py-3 text-slate-300 min-w-0">
                          {r.student?.name || "—"}
                          {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
                        </td>
                        <td className="px-4 py-3 text-slate-400 capitalize whitespace-nowrap">{r.current_stage.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-sky-400/30 bg-sky-400/10 text-sky-400 whitespace-nowrap">
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
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
      )}

      {/* full action queue link */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 text-sm text-slate-400 flex flex-wrap items-center justify-between gap-3 min-w-0">
        <p className="min-w-0">
          Action tickets, forward / reject with remarks, and bulk operations are available in the
          full approvals desk.
        </p>
        <a
          href="/exam/permissions"
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
        >
          Open Exam Approvals <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function ExamBranchLandingPage() {
  return (
    <GuardedPage allowedRoles={["oie", "exam_branch", "vice_principal", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <ExamBranchLandingInner />
      </Suspense>
    </GuardedPage>
  );
}
