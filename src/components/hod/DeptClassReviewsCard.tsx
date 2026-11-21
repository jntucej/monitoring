"use client";

/**
 * DeptClassReviewsCard — HOD/authority "Dept class reviews" card.
 *
 * Rolls up class-session reviews by faculty for the authority's department
 * (or campus-wide for a principal). Data: /api/class-sessions/reviews/summary
 * ?dept=me (the authority's own dept; campus-wide when the caller can). Shows
 * overall avg, review count, and the top faculties by volume.
 */

import { useApiResource } from "@/hooks/useApiResource";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { BarChart3, Star, Users } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

interface DeptSummary {
  data: {
    view: string;
    faculty: Array<{ facultyId: string; facultyName: string | null; total: number; avg: number | null }>;
    totals: { facultyCount: number; reviews: number; overallAvg: number | null };
  };
}

function DeptClassReviewsCardInner() {
  const user = useAuthStore((s) => s.user);
  const { data, error, loading } = useApiResource<DeptSummary>(
    "/api/class-sessions/reviews/summary?dept=me",
    { ttlMs: 300_000 },
  );
  const s = data?.data;

  if (loading) {
    return (
      <WidgetBoundary name="DeptClassReviewsCard" title="Dept class reviews" capability="class.review.view">
        <PageLoading />
      </WidgetBoundary>
    );
  }
  if (error || !s) {
    return (
      <WidgetBoundary name="DeptClassReviewsCard" title="Dept class reviews" capability="class.review.view">
        <div className="surface-card bg-bg-surface p-4 text-sm text-text-muted">
          Dept class reviews unavailable{error ? `: ${String(error)}` : ""}.
        </div>
      </WidgetBoundary>
    );
  }

  const top = [...s.faculty].sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <WidgetBoundary name="DeptClassReviewsCard" title="Dept class reviews" capability="class.review.view">
      <div className="surface-card bg-bg-surface p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-action-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Dept class reviews</h3>
          </div>
          <span className="text-xs text-text-muted">
            {s.totals.reviews} reviews · {s.totals.facultyCount} faculty
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          <span className="text-lg font-bold text-text-primary tabular-nums">
            {s.totals.overallAvg != null ? s.totals.overallAvg : "—"}
          </span>
          <span className="text-xs text-text-muted">overall avg</span>
        </div>

        {top.length === 0 ? (
          <p className="text-sm text-text-muted">No class reviews yet in your department.</p>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Users className="h-3.5 w-3.5" /> By faculty
            </div>
            {top.map((f) => (
              <div key={f.facultyId} className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">{f.facultyName ?? f.facultyId.slice(0, 8)}</span>
                <span className="flex items-center gap-2 text-text-muted">
                  <span className="tabular-nums">{f.total} reviews</span>
                  <span className="text-amber-500 tabular-nums">{f.avg ?? "—"}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

export function DeptClassReviewsCard() {
  return <DeptClassReviewsCardInner />;
}
