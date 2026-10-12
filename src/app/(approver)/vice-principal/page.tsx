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
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Loader2,
  Inbox,
  Clock,
  ArrowRight,
} from "lucide-react";

/*
 * Vice Principal dedicated dashboard — shows ONLY VP-stage data:
 *   • pending approvals at the vice_principal stage (exam + memo + staff_leave)
 *   • SLA status of the escalation queue
 * No admin analytics / intelligence panels — admin API endpoints are never
 * fetched.
 * The full action desk (forward / reject with remarks / bulk ops) lives at
 * /exam/permissions for exam workflows.
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
    student_details?: { roll?: string } | null;
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

function VicePrincipalDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "vice_principal") as Role;
  const tier = getRoleTier(role);

  // The server scopes /api/permissions by the caller's own stage for the
  // vice_principal role — one fetch covers exam / memo / staff_leave
  // workflows currently sitting at the VP stage.
  const {
    data: vpQueue,
    loading,
    error,
    refresh,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?status=PENDING&stage=vice_principal",
    { ttlMs: 30_000 }
  );

  const rows = vpQueue?.data ?? [];
  const total = vpQueue?.total ?? rows.length;
  const slaBreached = rows.filter((r) => {
    if (!r.sla_deadline) return false;
    const ts = new Date(r.sla_deadline).getTime();
    return !Number.isNaN(ts) && ts < Date.now();
  }).length;

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const [activeTab, setActiveTab] = useState<"all" | "exam" | "memo" | "staff_leave">("all");
  const filtered =
    activeTab === "all" ? rows : rows.filter((r) => r.workflow_type === activeTab);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Page toolbar — global DynamicHeader already renders the app header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-sky-400 shrink-0" />
            <span className="truncate">Vice Principal Desk</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          onClick={() => void refreshAll()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <ErrorBanner
          message={`Escalation queue loading failed: ${error}`}
          onRetry={() => void refreshAll()}
        />
      )}

      {/* KPI row — VP-stage permission data only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
        <StatCard
          icon={Inbox}
          label="VP Pending"
          value={total}
          sub="Requests escalated to the Vice Principal stage"
          accent="text-sky-400"
          loading={loading && !vpQueue}
        />
        <StatCard
          icon={AlertTriangle}
          label="SLA Breached"
          value={slaBreached}
          sub="VP queue past their 48h deadline"
          accent="text-amber-400"
          loading={loading && !vpQueue}
        />
        <StatCard
          icon={ShieldCheck}
          label="Stage"
          value="vice_principal"
          sub="Examination, memo & staff-leave review"
          accent="text-white"
        />
      </div>

      {/* workflow filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar min-w-0">
        {(
          [
            { id: "all", label: "All Workflows" },
            { id: "exam", label: "Exam" },
            { id: "memo", label: "Memo" },
            { id: "staff_leave", label: "Staff Leave" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border shrink-0 ${
              activeTab === t.id
                ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            {t.label}
            {t.id !== "all" ? ` (${rows.filter((r) => r.workflow_type === t.id).length})` : ""}
          </button>
        ))}
      </div>

      {/* escalation queue */}
      <WidgetBoundary title="Escalation Queue">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          {loading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading queue…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState message="No pending items at the Vice Principal stage. The queue is clear." />
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Ticket</th>
                    <th className="text-left px-4 py-3">Student</th>
                    <th className="text-left px-4 py-3">Workflow</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.slice(0, 15).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-white font-mono text-xs whitespace-nowrap">{r.ticket_number}</td>
                      <td className="px-4 py-3 text-slate-300 min-w-0">
                        {r.student?.name || "—"}
                        {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
                      </td>
                      <td className="px-4 py-3 text-slate-400 capitalize whitespace-nowrap">{r.workflow_type.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-amber-400/30 bg-amber-400/10 text-amber-400 whitespace-nowrap">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {r.sla_deadline ? (
                          new Date(r.sla_deadline).getTime() < Date.now() ? (
                            <span className="text-rose-400">
                              Breached · {new Date(r.sla_deadline).toLocaleString()}
                            </span>
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

      {/* action desk link */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 text-sm text-slate-400 flex flex-wrap items-center justify-between gap-3 min-w-0">
        <p className="min-w-0">
          Approve, forward or reject with remarks — and run bulk operations — from the full
          approvals desk.
        </p>
        <a
          href="/exam/permissions"
          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-400 hover:bg-sky-500/20 shrink-0"
        >
          Open VP Approvals <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function VicePrincipalDashboardPage() {
  return (
    <GuardedPage allowedRoles={["vice_principal", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <VicePrincipalDashboardInner />
      </Suspense>
    </GuardedPage>
  );
}
