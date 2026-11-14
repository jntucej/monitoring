"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData } from "@/hooks/useDashboardData";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { CommandCenterContent } from "@/components/sysadmin/domains/overview/CommandCenterContent";
import type { CommandCenterData } from "@/components/sysadmin/domains/overview/types";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";

import { SysadminHealthPanel } from "@/components/approver/SysadminHealthPanel";
import { AdminAlertsPanel } from "@/components/approver/AdminAlertsPanel";
import { DevMessagesPanel } from "@/components/admin/DevMessagesPanel";

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
          className="surface-card bg-action-danger/5 p-5 text-sm text-text-primary"
        >
          <p className="flex items-center gap-2 font-medium text-action-danger">
            <AlertTriangle className="h-4 w-4" />
            Failed to load command center
          </p>
          <p className="mt-1 text-xs text-text-muted">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="surface-card mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 min-h11 text-xs hover:bg-bg-elevated"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : (
        data && (
          <WidgetBoundary name="CommandCenter" title="Command Center">
            <CommandCenterContent data={data} onRefresh={refresh} />
          </WidgetBoundary>
        )
      )}

      <WidgetBoundary name="PersonalizedCampusHome" title="Personalized Campus Home">
        <PersonalizedCampusHome />
      </WidgetBoundary>
      <WidgetBoundary name="TaskContinuity" title="Task Continuity">
        <TaskContinuity />
      </WidgetBoundary>
      <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar">
        <UnifiedCampusCalendar />
      </WidgetBoundary>

      <WidgetBoundary name="SysadminHealthPanel" title="Service Health">
        <SysadminHealthPanel />
      </WidgetBoundary>
      <WidgetBoundary name="AdminAlertsPanel" title="Alerts">
        <AdminAlertsPanel />
      </WidgetBoundary>
      <WidgetBoundary name="DevMessagesPanel" title="Dev Messages">
        <DevMessagesPanel />
      </WidgetBoundary>
      <WidgetBoundary name="QuickActions" title="Quick Actions">
        <QuickActions />
      </WidgetBoundary>
      <WidgetBoundary name="NotificationCenter" title="Notification Center">
        <NotificationCenter />
      </WidgetBoundary>

    </>
  );
}

function CommandCenterSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true" inert>
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
