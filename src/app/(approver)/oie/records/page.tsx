"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import { ArrowRight, Loader2, FileText, AlertTriangle } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";

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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-bg-elevated/30 p-8 text-center text-sm text-text-muted">
      {message}
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
      <span className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      <button
        onClick={onRetry}
        className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

function TicketTable({ rows }: { rows: PermissionRequestRow[] }) {
  if (rows.length === 0) {
    return <EmptyState message="No pending items at the OIE examination stage. The queue is clear." />;
  }
  return (
    <div className="overflow-x-auto min-w-0">
      <table className="w-full text-sm min-w160">
        <thead>
          <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wide">
            <th className="text-left px-4 py-3">Ticket</th>
            <th className="text-left px-4 py-3">Student</th>
            <th className="text-left px-4 py-3">Workflow</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">SLA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {rows.slice(0, 15).map((r) => (
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
                {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
              </td>
              <td className="px-4 py-3 text-text-muted capitalize whitespace-nowrap">
                {r.workflow_type.replace(/_/g, " ")}
              </td>
              <td className="px-4 py-3">
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-amber-400/30 bg-amber-400/10 text-action-warning whitespace-nowrap">
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
      {rows.length > 0 && (
        <div className="px-4 py-3 border-t border-border flex flex-wrap items-center justify-between gap-2 min-w-0">
          <p className="text-xs text-text-muted min-w-0">
            {rows.length} pending at the OIE stage — all are actionable.
          </p>
          <a
            href="/exam/permissions"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-action-success hover:bg-emerald-500/20 shrink-0"
          >
            Open Approvals Desk <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}

function OieRecordsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "oie") as Role;
  const tier = getRoleTier(role);

  const {
    data: oieQueue,
    loading: queueLoading,
    error: queueError,
    refresh: refreshQueue,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflow_type=exam&stage=oie&status=PENDING",
    { ttlMs: 30_000 }
  );

  const refresh = useCallback(async () => {
    clearCache();
    await refreshQueue();
  }, [refreshQueue]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const oieRows = oieQueue?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 overflow-x-hidden space-y-6 px-4 py-6 md:px-6">
      {/* Back link */}
      <Link
        href="/oie"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Overview
      </Link>

      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-text-muted min-w-0">
            Signed in as <span className="font-mono text-text-secondary">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {queueError && (
        <ErrorBanner
          message={`OIE queue loading failed: ${queueError}`}
          onRetry={() => void refreshQueue()}
        />
      )}

      <WidgetBoundary title="Assigned Operational Records">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-action-success shrink-0" />
              <span className="text-sm font-semibold text-white truncate">
                OIE Examination-Stage Queue
              </span>
            </div>
            <span className="text-xs text-text-muted shrink-0">assigned duties only</span>
          </div>
          {queueLoading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-text-muted min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading OIE queue…
            </div>
          ) : (
            <TicketTable rows={oieRows} />
          )}
          <div className="px-4 py-3 border-t border-border text-xs text-text-muted min-w-0">
            Broader institutional records (staff attendance, attendance statistics) are
            restricted at this tier — this desk surfaces only the records assigned to the
            OIE examination duties.
          </div>
        </div>
      </WidgetBoundary>
    </div>
  );
}
export default function OieRecordsPage() {
  return (
    <AuthGuard allowedRoles={['oie', 'exam_branch', 'exam_superintendent', 'vice_principal', 'principal', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <OieRecordsInner />
      </Suspense>
    </AuthGuard>
  );
}
