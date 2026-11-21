"use client";

/**
 * MessExclusionTrend — the admin "exclusion-reason trend" block (PR7).
 *
 * Reads /api/mess/analytics (extended with excludedByReasonTrend +
 * excludedByDay) and shows, over the last ~3 weeks, how many students were
 * excluded from token issuance by each reason. Reveals institutional patterns
 * (e.g. "on leave" spikes on weekends) from the stored finalize-time
 * decisions. Gated by the mess.analytics capability.
 */

import { useApiResource } from "@/hooks/useApiResource";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";
import { TrendingDown } from "lucide-react";

interface Resp {
  data: {
    excludedByReasonTrend?: Record<string, number>;
    excludedByDay?: Array<{ day: string; byReason: Record<string, number>; total: number }>;
  };
}

const REASON_LABEL: Record<string, string> = {
  HOSTELLER_ON_LEAVE: "On approved leave",
  HOSTELLER_OPTED_OUT: "Opted out",
  DAY_SCHOLAR: "Day scholar",
  NO_PREFERENCE: "No preference",
  SUSPENDED: "Suspended",
  GRADUATED: "Graduated",
};

function MessExclusionTrendInner() {
  const { data, error, loading } = useApiResource<Resp>("/api/mess/analytics", {
    ttlMs: 300_000,
  });
  if (loading) {
    return (
      <WidgetBoundary name="MessExclusionTrend" title="Exclusion reasons (3 weeks)">
        <PageLoading />
      </WidgetBoundary>
    );
  }
  const trend = data?.data?.excludedByReasonTrend;
  const byDay = data?.data?.excludedByDay;
  if (error || !trend || Object.keys(trend).length === 0) {
    return (
      <WidgetBoundary name="MessExclusionTrend" title="Exclusion reasons (3 weeks)">
        <div className="surface-card bg-bg-surface p-4 text-sm text-text-muted">
          No exclusions recorded in the last 3 weeks.
        </div>
      </WidgetBoundary>
    );
  }

  const totalExcluded = Object.values(trend).reduce((n, v) => n + v, 0);

  return (
    <WidgetBoundary name="MessExclusionTrend" title="Exclusion reasons (3 weeks)">
      <div className="surface-card bg-bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-action-warning" />
          <h3 className="text-sm font-semibold text-text-primary">Exclusion reasons</h3>
          <span className="text-xs text-text-muted">{totalExcluded} total (3 weeks)</span>
        </div>
        <div className="grid gap-1.5 text-xs">
          {Object.entries(trend)
            .sort((a, b) => b[1] - a[1])
            .map(([reason, n]) => (
              <div key={reason} className="flex items-center justify-between rounded bg-bg-elevated px-2 py-1.5">
                <span className="text-text-secondary">{REASON_LABEL[reason] ?? reason}</span>
                <span className="tabular-nums font-medium text-text-primary">{n}</span>
              </div>
            ))}
        </div>
        {byDay && byDay.length > 0 && (
          <div className="text-[11px] text-text-muted">
            {byDay.length} meal days with exclusions · most recent:{" "}
            {new Date(byDay[0].day).toLocaleDateString(undefined, { day: "numeric", month: "short" })} (
            {byDay[0].total} excluded)
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

export function MessExclusionTrend() {
  return <MessExclusionTrendInner />;
}
