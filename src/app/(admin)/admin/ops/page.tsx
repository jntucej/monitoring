"use client";

/**
 * /admin/ops — Board 3 (AI Command Center / DevOps) "System Health &
 * Automation" workspace.
 *
 * Independent panel loading: the KPI strip (real /api/admin/jobs/overview),
 * the activity feed (real /api/admin/audit-logs), and the existing
 * OpsCompliancePanel / SpatialPeopleMap each load in their own boundary, so a
 * single endpoint failure shows its own error banner and does not blank the
 * others. Row taps route through ONE page-level inspector (no stacked
 * overlays). No Math.random() / simulated telemetry — every value is a real
 * API result or an explicit empty/error state.
 */
import { Suspense, useCallback, useState } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { useApiResource } from "@/hooks/useApiResource";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import {
  SegmentedKpiStrip,
  type SegmentedKpi,
} from "@/components/dashboard/SegmentedKpiStrip";
import {
  StatusFilteredActivityFeed,
  type ActivityItem,
} from "@/components/dashboard/StatusFilteredActivityFeed";
import { OpsCompliancePanel } from "@/components/security/OpsCompliancePanel";
import { SpatialPeopleMapWorkspace } from "@/components/dashboard/SpatialPeopleMap";
import { AlertTriangle } from "lucide-react";

interface JobsOverview {
  healthy_pct: number;
  failed_24h: number;
  avg_duration_ms: number;
  dlq: number;
}
interface AuditLogItem {
  id: string;
  action: string;
  userName: string | null;
  userRole: string | null;
  timestamp: string;
  [k: string]: unknown;
}
interface AuditLogsResponse {
  success: boolean;
  data: { items: AuditLogItem[]; total: number };
}

function mapAuditToActivity(item: AuditLogItem): ActivityItem {
  const a = (item.action ?? "").toLowerCase();
  let status: ActivityItem["status"] = "running";
  if (a.includes("fail") || a.includes("reject") || a.includes("escalat") || a.includes("cancel")) status = "failed";
  else if (a.includes("approv") || a.includes("resolv") || a.includes("complete") || a.includes("create")) status = "completed";
  return {
    id: item.id,
    title: item.action,
    detail: item.userName ? `${item.userName} · ${item.userRole ?? ""}` : (item.userRole ?? "system"),
    status,
    at: item.timestamp,
  };
}

function OpsInner() {
  const { inspection, inspect, closeInspection } = useEntityInspector();

  // Independent panel 1: jobs/automation KPIs.
  const {
    data: jobsData,
    loading: jobsLoading,
    error: jobsError,
    refresh: jobsRefresh,
  } = useApiResource<{ success: boolean; data: JobsOverview }>("/api/admin/jobs/overview", {
    ttlMs: 90_000,
  });
  const jobs = jobsData?.data;

  // Independent panel 2: audit activity feed.
  const {
    data: auditData,
    loading: auditLoading,
    error: auditError,
    refresh: auditRefresh,
  } = useApiResource<AuditLogsResponse>("/api/admin/audit-logs?page=1&pageSize=50", {
    ttlMs: 60_000,
  });
  const activities = (auditData?.data?.items ?? []).map(mapAuditToActivity);

  const kpis: SegmentedKpi[] = jobs
    ? [
        {
          label: "Job Health (24h)",
          value: jobs.healthy_pct,
          maxValue: 100,
          status: jobs.healthy_pct >= 95 ? "ok" : jobs.healthy_pct >= 80 ? "warn" : "error",
          hint: "% of runs succeeded in the last 24h",
        },
        {
          label: "Failed Runs (24h)",
          value: jobs.failed_24h,
          maxValue: Math.max(1, jobs.failed_24h),
          status: jobs.failed_24h === 0 ? "ok" : jobs.failed_24h < 5 ? "warn" : "error",
          hint: jobs.dlq > 0 ? `${jobs.dlq} in dead-letter` : "no dead-letter",
        },
        {
          label: "Avg Duration",
          value: jobs.avg_duration_ms,
          maxValue: Math.max(1, jobs.avg_duration_ms),
          status: "info",
          hint: "ms across recent runs",
        },
        {
          label: "Active Nodes",
          // Real node count would come from the Prometheus fleet query; the
          // overview does not expose it, so report N/A rather than a fake 0.
          value: null,
          maxValue: null,
          status: "neutral",
          hint: "see Docker Fleet",
        },
      ]
    : [];

  const inspectActivity = useCallback(
    (item: ActivityItem) => {
      const src = activities.find((a) => a.id === item.id);
      inspect({
        kind: "activity",
        title: item.title,
        subtitle: item.detail,
        sections: [
          {
            title: "Event",
            content: (
              <div className="text-xs text-text-secondary space-y-1">
                <p>Action: {item.title}</p>
                <p>Actor: {item.detail}</p>
                {item.at ? <p>At: {item.at}</p> : null}
                {src ? null : null}
              </div>
            ),
          },
        ],
        detailHref: "/admin/audit",
        detailLabel: "Open audit trail",
      });
    },
    [inspect, activities],
  );

  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 overflow-x-hidden space-y-6 px-4 py-6 md:px-6">
      <h1 className="text-xl font-bold text-text-primary">Admin Operations, Drills & Compliance</h1>

      {/* Board 3 — System Health & Automation (independent panels) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WidgetBoundary name="SegmentedKpiStrip" title="System Health & Automation">
          {jobsLoading && !jobs ? (
            <div className="p-4 text-sm text-text-muted">Loading automation KPIs…</div>
          ) : jobsError && !jobs ? (
            <div className="p-4 text-sm text-action-danger flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 shrink-0" /> Automation data unavailable: {jobsError}
              </span>
              <button
                type="button"
                onClick={() => jobsRefresh()}
                className="surface-card px-2 py-1 text-xs hover:bg-amber-500/20 shrink-0"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="p-4">
              <SegmentedKpiStrip items={kpis} />
            </div>
          )}
        </WidgetBoundary>

        <WidgetBoundary name="StatusFilteredActivityFeed" title="Recent Activity">
          {auditLoading && !auditData ? (
            <div className="p-4 text-sm text-text-muted">Loading activity…</div>
          ) : auditError && !auditData ? (
            <div className="p-4 text-sm text-action-danger flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 shrink-0" /> Activity unavailable: {auditError}
              </span>
              <button
                type="button"
                onClick={() => auditRefresh()}
                className="surface-card px-2 py-1 text-xs hover:bg-amber-500/20 shrink-0"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="p-4">
              <StatusFilteredActivityFeed items={activities} onInspect={inspectActivity} />
            </div>
          )}
        </WidgetBoundary>
      </div>

      {/* Existing operational panels (unchanged, each in its own boundary) */}
      <WidgetBoundary name="OpsCompliancePanel" title="Operations & Compliance">
        <OpsCompliancePanel />
      </WidgetBoundary>

      <WidgetBoundary name="SpatialPeopleMap" title="Security Footprint">
        <SpatialPeopleMapWorkspace defaultArea="security" lockedArea compact />
      </WidgetBoundary>

      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}

export default function AdminOpsPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <OpsInner />
      </Suspense>
    </AuthGuard>
  );
}
