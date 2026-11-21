"use client";

/**
 * OverallClassSatisfactionCard — the Principal/VP "overall class satisfaction"
 * card. Campus-wide roll-up of class-session reviews (reuses the dept
 * endpoint with dept=all). Reuses the mess-review satisfaction shape: one
 * overall average + total volume, no new metric.
 */

import { useApiResource } from "@/hooks/useApiResource";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { Star, BarChart3 } from "lucide-react";

interface OverallResp {
  data: {
    totals: { facultyCount: number; reviews: number; overallAvg: number | null };
  };
}

function OverallClassSatisfactionCardInner() {
  const { data, error, loading } = useApiResource<OverallResp>(
    "/api/class-sessions/reviews/summary?dept=all",
    { ttlMs: 300_000 },
  );
  const t = data?.data?.totals;

  if (loading) {
    return (
      <WidgetBoundary name="OverallClassSatisfactionCard" title="Overall class satisfaction" capability="class.review.view">
        <PageLoading />
      </WidgetBoundary>
    );
  }
  if (error || !t) {
    return (
      <WidgetBoundary name="OverallClassSatisfactionCard" title="Overall class satisfaction" capability="class.review.view">
        <div className="surface-card bg-bg-surface p-4 text-sm text-text-muted">
          Satisfaction unavailable{error ? `: ${String(error)}` : ""}.
        </div>
      </WidgetBoundary>
    );
  }

  return (
    <WidgetBoundary name="OverallClassSatisfactionCard" title="Overall class satisfaction" capability="class.review.view">
      <div className="surface-card bg-bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-text-primary">Overall class satisfaction</h3>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-text-primary tabular-nums">
            {t.overallAvg != null ? t.overallAvg : "—"}
          </span>
          <span className="text-xs text-text-muted">/ 5 · campus-wide</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <BarChart3 className="h-3.5 w-3.5" />
          {t.reviews} reviews across {t.facultyCount} faculty
        </div>
      </div>
    </WidgetBoundary>
  );
}

export function OverallClassSatisfactionCard() {
  return <OverallClassSatisfactionCardInner />;
}
