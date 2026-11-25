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

function CaretakerWorkersInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "caretaker") as Role;

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<DataResponse>("/api/workers/shifts", { ttlMs: 30_000 });

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
      <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading Workers…
    </div>
  ) : items.length === 0 ? (
    <div className="p-6 text-center min-w-0">
      <Inbox className="size-6 mx-auto text-text-muted mb-2" />
      <p className="text-sm text-text-muted">No worker shifts assigned yet.</p>
      <p className="text-xs text-text-muted mt-1">Shifts appear here once facility staff are assigned to shifts.</p>
    </div>
  ) : (
    <TaskRecordsList
      title="Shift Assignments"
      records={items.map((raw, i) => {
        const rec = raw as Record<string, unknown>;
        return {
          id: (rec.id ?? String(i)) as string,
          identifier: (rec.worker_name ?? rec.workerName ?? rec.ticket_number ?? rec.id ?? String(i)) as string,
          status: (rec.status ?? rec.shift_status) as string | undefined,
          created_at: (rec.created_at ?? rec.createdAt ?? rec.shift_from) as string | undefined,
          meta: (rec.position ?? rec.role ?? rec.building) as string | undefined,
        };
      })}
    />
  );

  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 overflow-x-hidden space-y-6 px-4 py-6 md:px-6">
      <Link
        href="/caretaker"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowRight className="size-3.5 rotate-180" /> Back to Facilities Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-white">Workers</h1>
          <p className="mt-1 text-sm text-text-muted min-w-0">
            Signed in as <span className="font-medium capitalize text-text-secondary">{role.replace(/_/g, " ")}</span>
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      <ContextSituationBar
        roleLabel="Caretaker"
        purpose="Monitor on-duty facility workers, track shift coverage, and audit gate-logged worker activity"
        why="Auditing shifts verifies active on-ground coverage across electrical, plumbing, and housekeeping roles."
        contextLabel="Facility Staff & Shifts"
        statusTone={n > 0 ? "ok" : "info"}
        statusPill={`${n} active`}
        statusSummary={
          n > 0
            ? `${n} worker shift assignment(s) in view.`
            : "No worker shifts assigned yet. Assign facility staff to shifts to begin monitoring."
        }
        primaryAction={{ label: "Maintenance Tasks", href: "/caretaker/maintenance" }}
        secondaryActions={[
          { label: "Facilities Overview", href: "/caretaker/home" },
          { label: "Complaint Console", href: "/caretaker" },
        ]}
      />

      {error && (
        <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Workers data unavailable: {error}</span>
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

      <WidgetBoundary title="Workers">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ListChecks className="w-4 h-4 text-action-success shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Shift Assignments</span>
            </div>
            <span className="text-xs text-text-muted shrink-0">{n} item(s)</span>
          </div>
          {body}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function CaretakerWorkersPage() {
  return (
    <AuthGuard allowedRoles={['caretaker', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <CaretakerWorkersInner />
      </Suspense>
    </AuthGuard>
  );
}
