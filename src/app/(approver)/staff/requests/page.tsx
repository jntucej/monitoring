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
import { TaskRecordsList } from "@/components/shared/TaskRecordsList";
import { Loader2, AlertTriangle, ArrowRight, ListChecks, Inbox } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

function StaffRequestsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "staff") as Role;

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<DataResponse>("/api/permissions?workflow_type=staff_leave&status=PENDING", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const items: unknown[] = Array.isArray((data as DataResponse | null)?.data)
    ? ((data as DataResponse | null)!.data as unknown[])
    : [];
  const n = (data as DataResponse | null)?.total ?? items.length;

  const body = busy ? (
    <div className="p-4 flex items-center gap-2 text-sm text-text-muted min-w-0">
      <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading Requests…
    </div>
  ) : items.length === 0 ? (
    <div className="p-6 text-center min-w-0">
      <Inbox className="size-6 mx-auto text-text-muted mb-2" />
      <p className="text-sm text-text-muted">No pending leave requests.</p>
      <p className="text-xs text-text-muted mt-1">Requests appear here when staff submit leave via /staff/leaves.</p>
    </div>
  ) : (
    <TaskRecordsList
      title="Pending Leave Requests"
      records={items.map((raw, i) => {
        const rec = raw as Record<string, unknown>;
        return {
          id: (rec.id ?? String(i)) as string,
          identifier: (rec.ticket_number ?? rec.id ?? String(i)) as string,
          status: (rec.status ?? "PENDING") as string,
          created_at: (rec.created_at ?? rec.createdAt) as string | undefined,
          sla_deadline: (rec.sla_deadline) as string | undefined,
          meta: (rec.workflow_type ?? rec.current_stage) as string | undefined,
        };
      })}
    />
  );

  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 overflow-x-hidden space-y-6 px-4 py-6 md:px-6">
      <Link
        href="/staff"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowRight className="size-3.5 rotate-180" /> Back to Staff Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-white">Staff Requests</h1>
          <p className="mt-1 text-sm text-text-muted min-w-0">
            Signed in as <span className="font-medium capitalize text-text-secondary">{role.replace(/_/g, " ")}</span>
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      <ContextSituationBar
        roleLabel="Campus Staff"
        purpose="Monitor pending staff leave requests, approvals, and workflow routing."
        why="Overseeing leave requests maintains departmental operational coverage and tracks pending supervisor endorsements."
        contextLabel="Leave Request Management"
        statusTone={n > 0 ? "warn" : "ok"}
        statusPill={`${n} Pending`}
        statusSummary={
          n > 0
            ? `${n} staff leave request(s) are currently pending in the approval chain. Open a record to review the workflow state.`
            : "No pending staff leave requests in the queue right now."
        }
        primaryAction={{ label: "Submit Leave", href: "/staff/leaves" }}
        secondaryAction={{ label: "Request Status", href: "/staff/request-status" }}
      />

      {error && (
        <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Requests data unavailable: {error}</span>
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

      <WidgetBoundary title="Requests">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ListChecks className="w-4 h-4 text-action-success shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Pending Leave Requests</span>
            </div>
            <span className="text-xs text-text-muted shrink-0">{n} item(s)</span>
          </div>
          {body}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function StaffRequestsPage() {
  return (
    <AuthGuard allowedRoles={['staff', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <StaffRequestsInner />
      </Suspense>
    </AuthGuard>
  );
}
