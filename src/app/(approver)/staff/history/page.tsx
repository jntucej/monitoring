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

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

function StaffHistoryInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "staff") as Role;

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<DataResponse>("/api/staff/history", { ttlMs: 30_000 });

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
      <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading History…
    </div>
  ) : items.length === 0 ? (
    <div className="p-6 text-center min-w-0">
      <Inbox className="size-6 mx-auto text-text-muted mb-2" />
      <p className="text-sm text-text-muted">No previous staff movement records found.</p>
      <p className="text-xs text-text-muted mt-1">New gate activity will stream here.</p>
    </div>
  ) : (
    <TaskRecordsList
      title="Historical Movement Log"
      records={items.map((raw, i) => {
        const rec = raw as Record<string, unknown>;
        return {
          id: (rec.id ?? String(i)) as string,
          identifier: (rec.ticket_number ?? rec.id ?? String(i)) as string,
          status: (rec.status ?? rec.finalStatus) as string | undefined,
          created_at: (rec.created_at ?? rec.createdAt ?? rec.from) as string | undefined,
          meta: (rec.workflow_type ?? rec.type ?? rec.direction) as string | undefined,
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
          <h1 className="text-base font-semibold text-white">Staff History</h1>
          <p className="mt-1 text-sm text-text-muted min-w-0">
            Signed in as <span className="font-medium capitalize text-text-secondary">{role.replace(/_/g, " ")}</span>
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      <ContextSituationBar
        roleLabel="Campus Staff"
        purpose="Review past campus gate scans, shift check-ins, and leave history."
        contextLabel="Historical Movement Log"
        statusTone={n > 0 ? "ok" : "info"}
        statusPill={`${n} Records`}
        statusSummary={
          n > 0
            ? `Viewing ${n} historical staff movements recorded across campus gates.`
            : "No previous staff movement records found. New gate activity will stream here."
        }
        primaryAction={{ label: "My Day", href: "/staff/my-day" }}
        secondaryAction={{ label: "Assigned Tasks", href: "/staff/assigned-tasks" }}
      />

      {error && (
        <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">History data unavailable: {error}</span>
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

      <WidgetBoundary title="History">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ListChecks className="w-4 h-4 text-action-success shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Historical Movement Log</span>
            </div>
            <span className="text-xs text-text-muted shrink-0">{n} item(s)</span>
          </div>
          {body}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function StaffHistoryPage() {
  return (
    <AuthGuard allowedRoles={['staff', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <StaffHistoryInner />
      </Suspense>
    </AuthGuard>
  );
}
