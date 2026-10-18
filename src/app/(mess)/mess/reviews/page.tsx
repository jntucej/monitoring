"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { SectionCard } from "@/components/admin/shared/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import {
  MEAL_TYPES, MEAL_LABEL, SATISFACTION_LEVELS,
  type MealType, type Satisfaction, satisfactionLabel,
} from "@/lib/mess-reviews";

interface DailyRow {
  date: string; mealType: MealType;
  distribution: Record<Satisfaction, number>;
  total: number; averageScore: number;
}
interface CommentRow {
  id: string; review_date: string; meal_type: MealType; satisfaction: Satisfaction;
  comment: string; user_name: string; unique_id: string; updated_at: string;
}
interface Summary {
  from: string; to: string;
  daily: DailyRow[];
  totalsByMeal: Record<string, { total: number; averageScore: number }>;
  recentComments: CommentRow[];
}

export default function MessReviewsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mess/reviews/summary", {
        headers: getAuthHeaders(), cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.data == null) throw new Error(body?.message ?? "Failed to load summary");
      setData(body.data as Summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load summary");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <PageHeader
        title="Meal Reviews"
        subtitle="Satisfaction distribution and recent student comments."
        actions={
          <button type="button" onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)]">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        }
      />
      <WidgetBoundary title="Meal Reviews">
        {loading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>}
        {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
        {data && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {MEAL_TYPES.map((m) => (
                <div key={m} className="rounded-xl border border-[var(--border)] p-3">
                  <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{MEAL_LABEL[m]}</div>
                  <div className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                    {data.totalsByMeal[m]?.averageScore?.toFixed(2) ?? "—"}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">{data.totalsByMeal[m]?.total ?? 0} reviews</div>
                </div>
              ))}
            </div>

            <SectionCard title="Daily distribution" description={`${data.from} → ${data.to}`}>
              <div className="space-y-2">
                {data.daily.length === 0 && <p className="text-sm text-[var(--text-muted)]">No reviews in this period.</p>}
                {data.daily.map((d) => (
                  <div key={`${d.date}|${d.mealType}`} className="rounded-lg border border-[var(--border)] p-2">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--text-secondary)]">{d.date} · {MEAL_LABEL[d.mealType]}</span>
                      <span className="text-[var(--text-muted)]">avg {d.averageScore} · {d.total} reviews</span>
                    </div>
                    <div className="flex h-3 overflow-hidden rounded-full">
                      {SATISFACTION_LEVELS.map((s) => {
                        const count = d.distribution[s.value] ?? 0;
                        const pct = d.total ? (count / d.total) * 100 : 0;
                        return (
                          <div
                            key={s.value}
                            title={`${s.label}: ${count}`}
                            style={{ width: `${pct}%` }}
                            className={
                              s.value === "VERY_GOOD" ? "bg-emerald-500"
                                : s.value === "GOOD" ? "bg-lime-500"
                                : s.value === "AVERAGE" ? "bg-amber-500"
                                : s.value === "BAD" ? "bg-orange-500"
                                : "bg-rose-500"
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Recent comments" description="Latest short comments from students.">
              <div className="space-y-2">
                {data.recentComments.length === 0 && <p className="text-sm text-[var(--text-muted)]">No comments yet.</p>}
                {data.recentComments.map((c) => (
                  <div key={c.id} className="rounded-lg border border-[var(--border)] p-2 text-sm">
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span>{c.user_name} ({c.unique_id}) · {c.review_date} · {MEAL_LABEL[c.meal_type]}</span>
                      <span>{satisfactionLabel(c.satisfaction)}</span>
                    </div>
                    <p className="mt-1 text-[var(--text-secondary)]">{c.comment}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}
      </WidgetBoundary>
    </div>
  );
}
