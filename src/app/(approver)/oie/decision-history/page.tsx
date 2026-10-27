"use client";

import { Suspense, useCallback, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PageLoading, TableSkeleton } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  ArrowRight,
  History,
  AlertTriangle,
  Inbox,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface HistoryRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  created_at?: string;
  updated_at?: string;
  stage_history?: Array<Record<string, unknown>> | null;
  student?: {
    name: string;
    student_details?: { roll?: string } | null;
  } | null;
}

interface PermissionsResponse {
  success: boolean;
  data: HistoryRow[];
  total?: number;
}

type StatusFilter = "ALL" | "COMPLETED" | "APPROVED" | "REJECTED" | "ESCALATED";

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-8 text-center min-w-0">
      <div className="flex flex-col items-center gap-2">
        <Inbox className="w-5 h-5 text-slate-600" />
        <p className="max-w-md text-sm text-slate-400">{message}</p>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
      <span className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls: Record<string, string> = {
    COMPLETED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
    APPROVED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
    REJECTED: "border-rose-400/30 bg-rose-400/10 text-rose-400",
    ESCALATED: "border-purple-400/30 bg-purple-400/10 text-purple-400",
    CANCELLED: "border-slate-400/30 bg-slate-400/10 text-slate-400",
    PENDING: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
        cls[status] ?? "border-slate-400/30 bg-slate-400/10 text-slate-400"
      }`}
    >
      {status}
    </span>
  );
}

function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState message="No decision history records found. Completed exam approvals will appear here." />
    );
  }
  return (
    <div className="overflow-x-auto min-w-0">
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
            <th className="text-left px-4 py-3">Ticket</th>
            <th className="text-left px-4 py-3">Candidate</th>
            <th className="text-left px-4 py-3">Final Status</th>
            <th className="text-left px-4 py-3">Updated</th>
            <th className="text-left px-4 py-3">Stages</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {rows.slice(0, 20).map((r) => {
            const stageCount = Array.isArray(r.stage_history) ? r.stage_history.length : 0;
            return (
              <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3">
                  <a
                    href={`/permissions/${r.ticket_number}`}
                    className="text-white font-mono text-xs whitespace-nowrap hover:text-emerald-400"
                  >
                    {r.ticket_number}
                  </a>
                </td>
                <td className="px-4 py-3 text-slate-300 min-w-0">
                  {r.student?.name || "—"}
                  {r.student?.student_details?.roll ? (
                    <span className="ml-2 text-xs text-slate-500">
                      {r.student.student_details.roll}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={r.status} />
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                  {r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                  {stageCount > 0 ? `${stageCount} stage(s)` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DecisionHistoryInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "oie") as Role;
  const tier = getRoleTier(role);

  const [filter, setFilter] = useState<StatusFilter>("ALL");

  const filterParam = filter === "ALL" ? "" : `&status=${filter}`;
  const {
    data,
    loading,
    error,
    refresh: refreshHistory,
  } = useApiResource<PermissionsResponse>(
    `/api/permissions?workflow_type=exam${filterParam}`,
    { ttlMs: 60_000, deps: [filter] }
  );

  const refresh = useCallback(async () => {
    clearCache();
    await refreshHistory();
  }, [refreshHistory]);

  usePolling(refresh, { intervalMs: 60_000, enabled: !!user });

  const allRows = data?.data ?? [];
  const filteredRows =
    filter === "ALL" ? allRows : allRows.filter((r) => r.status === filter);

  const filterButtons: Array<{ value: StatusFilter; label: string; icon?: React.ComponentType<{ className?: string }> }> = [
    { value: "ALL", label: "All" },
    { value: "COMPLETED", label: "Completed", icon: CheckCircle },
    { value: "APPROVED", label: "Approved", icon: CheckCircle },
    { value: "REJECTED", label: "Rejected", icon: XCircle },
    { value: "ESCALATED", label: "Escalated", icon: AlertTriangle },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      <Link
        href="/oie"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <ErrorBanner
          message={`Decision history data failed to load: ${error}`}
          onRetry={() => void refreshHistory()}
        />
      )}

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 min-w-0" role="tablist" aria-label="Status filter">
        {filterButtons.map((btn) => {
          const isActive = filter === btn.value;
          const Icon = btn.icon;
          return (
            <button
              key={btn.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setFilter(btn.value)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                isActive
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-800"
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
              {btn.label}
            </button>
          );
        })}
      </div>

      <WidgetBoundary title="Decision History">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <History className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">
              Exam Approval Decisions
            </span>
            <span className="ml-auto text-xs text-slate-500 shrink-0">
              {filteredRows.length} record(s)
            </span>
          </div>
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={4} />
            </div>
          ) : (
            <HistoryTable rows={filteredRows} />
          )}
          <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500 min-w-0">
            Records show the final disposition of exam permission tickets that passed
            through the OIE stage. Stage history is retained for audit purposes.
          </div>
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}
export default function DecisionHistoryPage() {
  return (
    <AuthGuard allowedRoles={['oie', 'exam_branch', 'exam_superintendent', 'vice_principal', 'principal', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <DecisionHistoryInner />
      </Suspense>
    </AuthGuard>
  );
}
