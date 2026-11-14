"use client";

import { Suspense, useCallback, useMemo } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import { UserCheck, AlertTriangle, ArrowRight, ClipboardList } from "lucide-react";

/* /api/permissions response shape */
interface PermissionRequest {
  id: string;
  ticket_number: string;
  workflow_type: string;
  student_user_id: string;
  status: string;
  current_stage: string;
  created_at: string;
  updated_at: string;
  hostel_scope?: string | null;
  [key: string]: unknown;
}

interface PermissionsResponse {
  success: boolean;
  data: PermissionRequest[] | null;
  total: number;
}

function statusBadge(status: string): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-500/15 text-action-warning";
    case "APPROVED":
    case "RESOLVED":
      return "bg-emerald-500/15 text-action-success";
    case "REJECTED":
    case "DENIED":
      return "bg-rose-500/15 text-action-danger";
    default:
      return "bg-bg-elevated/50 text-text-secondary";
  }
}

function ExamBranchRecordsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_branch") as Role;
  const tier = getRoleTier(role);

  /*
   * exam_branch participates in the exam permission workflow: it sits in
   * WORKFLOW_STAGES.exam (hod → oie → exam_branch → vice_principal →
   * principal) and /api/permissions exposes it in STAGES_BY_ROLE
   * (exam_branch: ["exam_branch", "exam_branch_forwarded"]). The records
   * view shows the full exam-request ledger; the actable subset for this
   * role is fetched via /api/permissions?assigned_to_me=true (which the
   * Approvals panel below uses).
   */
  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflow_type=exam",
    { ttlMs: 30_000 }
  );

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const requests = useMemo<PermissionRequest[]>(
    () => (data?.data as unknown as PermissionRequest[]) ?? [],
    [data]
  );
  const totalCount = data?.total ?? requests.length;
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const resolvedCount = requests.length - pendingCount;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/exam-branch"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowRight className="size-3.5 rotate-180" /> Back to Overview
      </Link>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-text-muted min-w-0">
            Signed in as <span className="font-mono text-text-secondary">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Records unavailable: {error}</span>
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="surface-card px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI cards */}
      <WidgetBoundary title="Records Summary">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
          <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
            <p className="text-xs text-text-muted uppercase tracking-wide">Total Records</p>
            <p className="mt-1 text-2xl font-bold text-white">{totalCount}</p>
            <p className="text-xs text-text-muted">All exam workflow requests</p>
          </div>
          <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
            <p className="text-xs text-text-muted uppercase tracking-wide">Pending</p>
            <p className="mt-1 text-2xl font-bold text-action-warning">{pendingCount}</p>
            <p className="text-xs text-text-muted">Awaiting stage action</p>
          </div>
          <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
            <p className="text-xs text-text-muted uppercase tracking-wide">Resolved</p>
            <p className="mt-1 text-2xl font-bold text-action-success">{resolvedCount}</p>
            <p className="text-xs text-text-muted">Approved or rejected</p>
          </div>
        </div>
      </WidgetBoundary>

      {/* Records list */}
      <WidgetBoundary title="Candidate & Examination Records">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ClipboardList className="w-4 h-4 text-action-success shrink-0" />
              <span className="text-sm font-semibold text-white truncate">
                Examination Records
              </span>
            </div>
            <span className="text-xs text-text-muted shrink-0">{requests.length} shown</span>
          </div>

          {busy ? (
            <div className="p-4 space-y-3 min-w-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-lg border border-border bg-bg-surface/40 animate-pulse motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <UserCheck className="size-6 mx-auto text-text-muted mb-2" />
              <p className="text-sm text-text-muted">No examination records yet.</p>
              <p className="text-xs text-text-muted mt-1">
                Records appear when exam workflow requests are created.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800 min-w-0">
              {requests.slice(0, 50).map((req) => (
                <li key={req.id} className="px-4 py-3 flex flex-col gap-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-text-secondary">
                      {req.ticket_number}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(req.status)}`}
                    >
                      {req.status}
                    </span>
                    <span className="text-xs text-text-muted">
                      stage: {req.current_stage}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted min-w-0">
                    {new Date(req.created_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {req.hostel_scope ? ` · scope: ${req.hostel_scope}` : ""}
                  </p>
                </li>
              ))}
              {requests.length > 50 && (
                <li className="px-4 py-2 text-xs text-text-muted text-center">
                  + {requests.length - 50} more records (refresh to see latest)
                </li>
              )}
            </ul>
          )}
        </div>
      </WidgetBoundary>

    </div>
  );
}

export default function ExamBranchRecordsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ExamBranchRecordsInner />
    </Suspense>
  );
}
