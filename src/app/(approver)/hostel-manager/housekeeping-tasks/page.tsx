"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import { TaskRecordsList } from "@/components/shared/TaskRecordsList";
import { Loader2, AlertTriangle, ArrowRight, ListChecks, Inbox } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

/* response shapes */

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

function HostelManagerHousekeepingInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "hostel_manager") as Role;

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<DataResponse>("/api/hostel-manager/housekeeping-tasks", { ttlMs: 30_000 });

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
      <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading Housekeeping…
    </div>
  ) : items.length === 0 ? (
    <div className="p-6 text-center min-w-0">
      <Inbox className="size-6 mx-auto text-text-muted mb-2" />
      <p className="text-sm text-text-muted">No housekeeping tasks yet.</p>
      <p className="text-xs text-text-muted mt-1">Tasks appear here once the housekeeping workflow starts.</p>
    </div>
  ) : (
    <TaskRecordsList
      title="Housekeeping Task Board"
      records={items.map((raw, i) => {
        const rec = raw as Record<string, unknown>;
        return {
          id: (rec.id ?? String(i)) as string,
          identifier: (rec.ticket_number ?? rec.id ?? rec.title ?? String(i)) as string,
          status: (rec.status ?? rec.task_status) as string | undefined,
          created_at: (rec.created_at ?? rec.createdAt) as string | undefined,
          sla_deadline: (rec.due_at ?? rec.deadline) as string | undefined,
          meta: (rec.block ?? rec.building ?? rec.assigned_to) as string | undefined,
        };
      })}
    />
  );

  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 overflow-x-hidden space-y-6 px-4 py-6 md:px-6">
      <Link
        href="/hostel-manager"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowRight className="size-3.5 rotate-180" /> Back to Operations Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-white">Housekeeping Tasks</h1>
          <p className="mt-1 text-sm text-text-muted min-w-0">
            Signed in as <span className="font-medium capitalize text-text-secondary">{role.replace(/_/g, " ")}</span>
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      <ContextSituationBar
        roleLabel="Hostel Manager"
        purpose="Monitor hostel block sanitation, assign housekeeping rosters, and verify completed cleaning rounds"
        contextLabel={`Housekeeping Operations · ${n} Item(s)`}
        statusTone={n > 0 ? "warn" : "ok"}
        statusPill={`${n} tasks`}
        statusSummary={
          n > 0
            ? `${n} housekeeping task(s) on the board. Open a record to review state or verify a round.`
            : "No housekeeping tasks yet. New rosters and cleaning rounds will appear here."
        }
        primaryAction={{ label: "Maintenance", href: "/hostel-manager/maintenance" }}
        secondaryActions={[
          { label: "Resource Management", href: "/hostel-manager/resource-management" },
          { label: "Resident Tickets", href: "/hostel-manager" },
        ]}
      />

      {error && (
        <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Housekeeping data unavailable: {error}</span>
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

      <WidgetBoundary title="Housekeeping Tasks">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ListChecks className="w-4 h-4 text-action-success shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Housekeeping Task Board</span>
            </div>
            <span className="text-xs text-text-muted shrink-0">{n} item(s)</span>
          </div>
          {body}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function HostelManagerHousekeepingPage() {
  return (
    <AuthGuard allowedRoles={['hostel_manager', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <HostelManagerHousekeepingInner />
      </Suspense>
    </AuthGuard>
  );
}
