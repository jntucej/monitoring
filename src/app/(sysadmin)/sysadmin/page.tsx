"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData } from "@/hooks/useDashboardData";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { CommandCenterContent } from "@/components/sysadmin/domains/overview/CommandCenterContent";
import type { CommandCenterData } from "@/components/sysadmin/domains/overview/types";

/**
 * SysAdmin Command Center — the live operational-state cockpit.
 *
 * Reads `/api/admin/overview` through `useDashboardData` (cached + 10s poll)
 * and renders the KPI tiles, service topology, and attention queue. The body
 * is wrapped in a `WidgetBoundary` so a render-time failure in any section
 * degrades to a local error card rather than taking the whole shell down.
 */
export default function SysadminCommandCenterPage() {
  const { data, loading, error, refresh } = useDashboardData<CommandCenterData>(
    "/api/admin/overview",
    { ttlMs: 20_000, pollMs: 10_000 }
  );

  return (
    <>
      <PageHeader
        title="Command Center"
        subtitle="Live operational state"
        onRefresh={refresh}
        refreshing={loading && data != null}
      />

      {loading && data == null ? (
        <CommandCenterSkeleton />
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-[var(--action-danger)]/30 bg-[var(--action-danger)]/5 p-5 text-sm text-[var(--text-primary)]"
        >
          <p className="flex items-center gap-2 font-medium text-[var(--action-danger)]">
            <AlertTriangle className="h-4 w-4" />
            Failed to load command center
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--bg-elevated)]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : (
        data && (
          <WidgetBoundary title="Command Center">
            <CommandCenterContent data={data} onRefresh={refresh} />
          </WidgetBoundary>
        )
      )}
    </>
  );
}

function CommandCenterSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true" inert>
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </div>
  );
}
