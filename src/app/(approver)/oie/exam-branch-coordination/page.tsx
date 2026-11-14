"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

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
  GitMerge,
  AlertTriangle,
  Inbox,
  Users,
} from "lucide-react";

interface CoordinationRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  created_at?: string;
  student?: {
    name: string;
    student_details?: { roll?: string } | null;
  } | null;
}

interface PermissionsResponse {
  success: boolean;
  data: CoordinationRow[];
  total?: number;
}

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

function CoordinationTable({ rows }: { rows: CoordinationRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState message="No items awaiting coordination with the Exam Branch. The queue is clear." />
    );
  }
  return (
    <div className="overflow-x-auto min-w-0">
      <table className="w-full text-sm min-w160">
        <thead>
          <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wide">
            <th className="text-left px-4 py-3">Ticket</th>
            <th className="text-left px-4 py-3">Candidate</th>
            <th className="text-left px-4 py-3">Stage</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">SLA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {rows.slice(0, 20).map((r) => (
            <tr key={r.id} className="hover:bg-bg-elevated/30 transition-colors">
              <td className="px-4 py-3">
                <a
                  href={`/permissions/${r.ticket_number}`}
                  className="text-white font-mono text-xs whitespace-nowrap hover:text-action-success"
                >
                  {r.ticket_number}
                </a>
              </td>
              <td className="px-4 py-3 text-text-secondary min-w-0">
                {r.student?.name || "—"}
                {r.student?.student_details?.roll ? (
                  <span className="ml-2 text-xs text-text-muted">{r.student.student_details.roll}</span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-text-muted capitalize whitespace-nowrap">
                {r.current_stage?.replace(/_/g, " ")}
              </td>
              <td className="px-4 py-3">
                <span className="surface-card inline-block px-2 py-0.5 text-xs font-medium bg-purple-400/10 text-unit-c whitespace-nowrap">
                  {r.status}
                </span>
              </td>
              <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                {r.sla_deadline ? (
                  new Date(r.sla_deadline).getTime() < Date.now() ? (
                    <span className="text-action-danger">
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
      <div className="surface-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
        <p className="text-xs text-text-muted min-w-0">
          {rows.length} item(s) awaiting exam-branch coordination
        </p>
        <a
          href="/exam/permissions"
          className="surface-card inline-flex items-center gap-1.5 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-unit-c hover:bg-purple-500/20 shrink-0"
        >
          Open Exam Branch Desk <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

function ExamBranchCoordinationInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "oie") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh: refreshCoord,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflow_type=exam&stage=exam_branch&status=PENDING",
    { ttlMs: 30_000 }
  );

  const refresh = useCallback(async () => {
    clearCache();
    await refreshCoord();
  }, [refreshCoord]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const rows = data?.data ?? [];
  const total = data?.total ?? rows.length;

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
            Signed in as <span className="font-mono text-text-secondary">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <ErrorBanner
          message={`Exam-branch coordination data failed to load: ${error}`}
          onRetry={() => void refreshCoord()}
        />
      )}

      {/* KPI strip */}
      <WidgetBoundary title="Exam-Branch Coordination KPIs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <div className="surface-card bg-bg-base p-4 min-w-0">
            <div className="flex items-center gap-2 text-text-muted text-xs font-semibold uppercase tracking-wide">
              <Users className="w-4 h-4 shrink-0" />
              <span>Exam Branch Queue</span>
            </div>
            <p className="text-2xl font-bold text-unit-c mt-2">{total}</p>
          </div>
          <div className="surface-card bg-bg-base p-4 min-w-0">
            <div className="flex items-center gap-2 text-text-muted text-xs font-semibold uppercase tracking-wide">
              <Inbox className="w-4 h-4 shrink-0" />
              <span>Stage</span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">exam_branch</p>
          </div>
          <div className="surface-card bg-bg-base p-4 min-w-0">
            <div className="flex items-center gap-2 text-text-muted text-xs font-semibold uppercase tracking-wide">
              <GitMerge className="w-4 h-4 shrink-0" />
              <span>Workflow</span>
            </div>
            <p className="text-2xl font-bold text-action-info mt-2">exam</p>
          </div>
          <div className="surface-card bg-bg-base p-4 min-w-0">
            <div className="flex items-center gap-2 text-text-muted text-xs font-semibold uppercase tracking-wide">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Action Required</span>
            </div>
            <p className="text-2xl font-bold text-action-warning mt-2">{rows.length > 0 ? "Yes" : "No"}</p>
          </div>
        </div>
      </WidgetBoundary>

      <WidgetBoundary title="Exam-Branch Coordination Queue">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3 flex items-center gap-2 min-w-0">
            <GitMerge className="w-4 h-4 text-unit-c shrink-0" />
            <span className="text-sm font-semibold text-white truncate">
              Coordination Queue with Exam Branch
            </span>
          </div>
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={4} />
            </div>
          ) : (
            <CoordinationTable rows={rows} />
          )}
          <div className="surface-card px-4 py-3 text-xs text-text-muted min-w-0">
            OIE coordinates with the Exam Branch on candidate eligibility, scheduling, and
            access confirmation. Items here are pending exam-branch sign-off.
          </div>
        </div>
      </WidgetBoundary>

    </div>
  );
}
export default function ExamBranchCoordinationPage() {
  return (
    <AuthGuard allowedRoles={['oie', 'exam_branch', 'exam_superintendent', 'vice_principal', 'principal', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <ExamBranchCoordinationInner />
      </Suspense>
    </AuthGuard>
  );
}
