"use client";

import { Suspense, useCallback, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

import { PageLoading, TableSkeleton } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { buildOieDecisionHistoryInspection } from "@/lib/role-registers/oieInspections";
import {
  ArrowRight,
  History,
  AlertTriangle,
  Inbox,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { decisionRecordInspection } from "@/components/approver/wardenConsoleModels";
import {
  ApproverStageDrawer,
  type StagePivotItem,
} from "@/components/nav/level2/ApproverStageDrawer";

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
    <div className="surface-card bg-bg-base p-8 text-center min-w-0">
      <div className="flex flex-col items-center gap-2">
        <Inbox className="w-5 h-5 text-text-muted" />
        <p className="max-w-md text-sm text-text-muted">{message}</p>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
      <span className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="surface-card px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls: Record<string, string> = {
    COMPLETED: "border-emerald-400/30 bg-emerald-400/10 text-action-success",
    APPROVED: "border-emerald-400/30 bg-emerald-400/10 text-action-success",
    REJECTED: "border-rose-400/30 bg-rose-400/10 text-action-danger",
    ESCALATED: "border-purple-400/30 bg-purple-400/10 text-unit-c",
    CANCELLED: "border-border/30 bg-bg-elevated/10 text-text-muted",
    PENDING: "border-amber-400/30 bg-amber-400/10 text-action-warning",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
        cls[status] ?? "border-border/30 bg-bg-elevated/10 text-text-muted"
      }`}
    >
      {status}
    </span>
  );
}

function HistoryTable({
  rows,
  onInspect,
}: {
  rows: HistoryRow[];
  onInspect: (r: HistoryRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState message="No decision history records found. Completed exam approvals will appear here." />
    );
  }
  return (
    <div className="overflow-x-auto min-w-0">
      <table className="w-full text-sm min-w180">
        <thead>
          <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wide">
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
              <tr
                key={r.id}
                onClick={() => onInspect(r)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onInspect(r);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Inspect decision record ${r.ticket_number}`}
                className="hover:bg-bg-elevated/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
              >
                <td className="px-4 py-3">
                  <a
                    href={`/permissions/${r.ticket_number}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-white font-mono text-xs whitespace-nowrap hover:text-action-success"
                  >
                    {r.ticket_number}
                  </a>
                </td>
                <td className="px-4 py-3 text-text-secondary min-w-0">
                  {r.student?.name || "—"}
                  {r.student?.student_details?.roll ? (
                    <span className="ml-2 text-xs text-text-muted">
                      {r.student.student_details.roll}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={r.status} />
                </td>
                <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                  {r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
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
  const { inspection, inspect, closeInspection } = useEntityInspector();
  const [stageItem, setStageItem] = useState<StagePivotItem | null>(null);

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
    <div className="mx-auto max-w-7xl w-full min-w-0 overflow-x-hidden space-y-6 px-4 py-6 md:px-6">
      <Link
        href="/oie"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowRight className="size-3.5 rotate-180" /> Back to Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-text-muted">
            Signed in as <span className="font-medium capitalize text-text-secondary">{role.replace(/_/g, " ")}</span>
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      <ContextSituationBar
        roleLabel="Officer In-Charge of Examinations"
        purpose="Audit past clearance decisions, approval rationales, and timestamps."
        contextLabel="Decision Archive"
        statusTone="info"
        statusPill={`${allRows.length} decisions`}
        statusSummary={`Archive of ${allRows.length} exam clearance decisions and historical dispositions.`}
        primaryAction={{ label: "Pending Queue", href: "/oie/queue/pending" }}
        secondaryActions={[
          { label: "OIE Overview", href: "/oie" },
          { label: "Branch Coordination", href: "/oie/exam-branch-coordination" },
        ]}
      />

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
                  ? "border-emerald-500/40 bg-emerald-500/10 text-action-success"
                  : "border-border bg-bg-elevated/50 text-text-muted hover:bg-bg-elevated"
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
              {btn.label}
            </button>
          );
        })}
      </div>

      <WidgetBoundary title="Decision History">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3 flex items-center gap-2 min-w-0">
            <History className="w-4 h-4 text-action-info shrink-0" />
            <span className="text-sm font-semibold text-white truncate">
              Exam Approval Decisions
            </span>
            <span className="ml-auto text-xs text-text-muted shrink-0">
              {filteredRows.length} record(s)
            </span>
          </div>
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={4} />
            </div>
          ) : (
            <HistoryTable
              rows={filteredRows}
              onInspect={(r) => {
                inspect(buildOieDecisionHistoryInspection(r));
                setStageItem({
                  ticketId: r.id,
                  ticketNumber: r.ticket_number,
                  workflowType: r.workflow_type,
                  currentStage: r.current_stage,
                  status: r.status,
                  studentName: r.student?.name,
                  studentRoll: r.student?.student_details?.roll,
                  stages: ["student", "oie", "exam_branch", "vice_principal"],
                });
              }}
            />
          )}
          <div className="surface-card px-4 py-3 text-xs text-text-muted min-w-0">
            Records show the final disposition of exam permission tickets that passed
            through the OIE stage. Stage history is retained for audit purposes.
          </div>
        </div>
      </WidgetBoundary>

      <EntityInspectorPanel
        inspection={inspection}
        onClose={() => {
          closeInspection();
          setStageItem(null);
        }}
      />
      <ApproverStageDrawer item={stageItem} onClose={() => setStageItem(null)} />
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
