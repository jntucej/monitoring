"use client";

/**
 * ClassReviewsWidget — a faculty "My class reviews" dashboard card.
 *
 * Shows the faculty's aggregate class-session review stats (total, average,
 * by-rating histogram, most recent sessions) + a link into the detail.
 * Gated by the `class.review.view` capability (the single resolver), so it
 * renders nothing unless the role grants it. Data comes from
 * /api/class-sessions/reviews/summary?facultyId=me (the mess-review shape).
 */

import { useEffect, useState } from "react";
import { Star, BarChart3, ListChecks, ArrowUpRight } from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { useApiResource } from "@/hooks/useApiResource";
import { PageLoading } from "@/components/shared/LoadingStates";
import Link from "next/link";

interface Summary {
  total: number;
  averageRating: number | null;
  byRating: Record<string, number>;
  bySession: Array<{ sessionId: string; sessionDate: string; period: number; count: number; avg: number }>;
}
interface SummaryResp {
  data: Summary & { facultyId: string };
}

function starBurst(avg: number | null): string {
  if (avg == null) return "—";
  return (Math.round(avg * 10) / 10).toString();
}

function ClassReviewsWidgetInner() {
  const { data, error, loading, refresh } = useApiResource<SummaryResp>(
    "/api/class-sessions/reviews/summary?facultyId=me",
    { ttlMs: 300_000 },
  );
  const s = data?.data;
  const [busy, setBusy] = useState(false);

  const ratings = s ? [5, 4, 3, 2, 1].map((r) => ({ star: r, n: s.byRating?.[String(r)] ?? 0 })) : [];
  const maxBar = Math.max(1, ...ratings.map((r) => r.n));

  if (loading) {
    return (
      <WidgetBoundary name="ClassReviewsWidget" title="My class reviews" capability="class.review.view">
        <PageLoading />
      </WidgetBoundary>
    );
  }
  if (error || !s) {
    return (
      <WidgetBoundary name="ClassReviewsWidget" title="My class reviews" capability="class.review.view">
        <div className="surface-card bg-bg-surface p-4 text-sm text-text-muted">
          Reviews unavailable{error ? `: ${String(error)}` : ""}.
          <button type="button" onClick={() => refresh?.()} className="ml-2 text-action-primary underline">
            retry
          </button>
        </div>
      </WidgetBoundary>
    );
  }

  return (
    <WidgetBoundary name="ClassReviewsWidget" title="My class reviews" capability="class.review.view">
      <div className="surface-card bg-bg-surface p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-text-primary">My class reviews</h3>
          </div>
          <span className="text-xs text-text-muted">{s.total} total</span>
        </div>

        {s.total === 0 ? (
          <p className="text-sm text-text-muted">
            No class reviews yet. When students review your sessions, their feedback lands here.
          </p>
        ) : (
          <>
            {/* Average + histogram */}
            <div className="flex items-center gap-4">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-text-primary tabular-nums">{starBurst(s.averageRating)}</span>
                <span className="text-xs text-text-muted">/ 5</span>
              </div>
              <div className="flex-1 space-y-1">
                {ratings.map((r) => (
                  <div key={r.star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-text-muted">{r.star}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${(r.n / maxBar) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-text-muted tabular-nums">{r.n}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Most recent sessions */}
            {s.bySession.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <ListChecks className="h-3.5 w-3.5" /> Recent sessions
                </div>
                {s.bySession.slice(0, 5).map((b) => (
                  <div key={b.sessionId} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">
                      {new Date(b.sessionDate).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                      {" · "}Period {b.period}
                    </span>
                    <span className="flex items-center gap-1 text-text-muted">
                      <BarChart3 className="h-3 w-3" />
                      {b.count} · avg {b.avg}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Link
                href="/faculty/reports"
                className="inline-flex items-center gap-1 text-xs text-action-primary hover:underline"
              >
                Open reports <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </>
        )}
      </div>
    </WidgetBoundary>
  );
}

export function ClassReviewsWidget() {
  return <ClassReviewsWidgetInner />;
}
