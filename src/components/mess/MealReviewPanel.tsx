"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, UtensilsCrossed } from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { MEAL_TYPES, MEAL_LABEL, SATISFACTION_LEVELS, type MealType, type Satisfaction } from "@/lib/mess-reviews";

interface ReviewRow {
  id: string;
  review_date: string;
  meal_type: MealType;
  satisfaction: Satisfaction;
  comment: string | null;
}

function istDate(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function dayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00+05:30`);
  const today = istDate(0);
  if (iso === today) return "Today";
  if (iso === istDate(-1)) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });
}

const DAYS = 7;

export function MealReviewPanel() {
  const addToast = useUIStore((s) => s.addToast);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  const dates = useMemo(() => Array.from({ length: DAYS }, (_, i) => istDate(-i)), []);
  const reviewMap = useMemo(() => {
    const m = new Map<string, ReviewRow>();
    for (const r of reviews) m.set(`${r.review_date}|${r.meal_type}`, r);
    return m;
  }, [reviews]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = istDate(-(DAYS - 1));
      const to = istDate(0);
      const res = await fetch(`/api/mess/reviews?from=${from}&to=${to}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.data == null) throw new Error(body?.message ?? "Failed to load reviews");
      setReviews(body.data.reviews ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = useCallback(
    async (date: string, meal: MealType, satisfaction: Satisfaction) => {
      const key = `${date}|${meal}`;
      setSavingKey(key);
      try {
        const res = await fetch("/api/mess/reviews", {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewDate: date,
            mealType: meal,
            satisfaction,
            comment: commentDraft[key] ?? null,
          }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || body?.data == null) throw new Error(body?.message ?? "Save failed");
        const saved = body.data.review as ReviewRow;
        setReviews((prev) => {
          const next = prev.filter((r) => !(r.review_date === date && r.meal_type === meal));
          next.push(saved);
          return next;
        });
        addToast({ message: "Review saved", variant: "success" });
      } catch (e) {
        addToast({ message: e instanceof Error ? e.message : "Save failed", variant: "error" });
      } finally {
        setSavingKey(null);
      }
    },
    [addToast, commentDraft],
  );

  return (
    <WidgetBoundary title="Meal Reviews">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Meal Reviews</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Rate Breakfast, Lunch and Dinner for the last {DAYS} days. You can update any review.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            {error}
            <button type="button" onClick={() => void load()} className="ml-2 underline">Retry</button>
          </div>
        )}

        {!loading && !error && dates.map((date) => (
          <div key={date} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-4">
            <div className="mb-3 text-sm font-semibold text-[var(--text-primary)]">{dayLabel(date)}</div>
            <div className="grid gap-3 md:grid-cols-3">
              {MEAL_TYPES.map((meal) => {
                const key = `${date}|${meal}`;
                const existing = reviewMap.get(key);
                const selected = existing?.satisfaction ?? null;
                return (
                  <div key={meal} className="rounded-lg border border-[var(--border)] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--text-secondary)]">{MEAL_LABEL[meal]}</span>
                      {savingKey === key && <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {SATISFACTION_LEVELS.map((opt) => {
                        const active = selected === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={savingKey === key}
                            onClick={() => void submit(date, meal, opt.value)}
                            className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition ${
                              active ? opt.tone : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                            }`}
                            title={opt.label}
                          >
                            <span aria-hidden>{opt.emoji}</span>
                            <span className="hidden sm:inline">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      maxLength={280}
                      placeholder="Optional short comment (280 chars)"
                      defaultValue={existing?.comment ?? ""}
                      onChange={(e) => setCommentDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                      onBlur={(e) => {
                        const v = e.target.value;
                        setCommentDraft((prev) => ({ ...prev, [key]: v }));
                        if (selected && v !== (existing?.comment ?? "")) void submit(date, meal, selected);
                      }}
                      className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--action-primary)]"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {!loading && !error && reviews.length === 0 && (
          <EmptyState title="No reviews yet" description="Rate your first meal above to get started." icon={<UtensilsCrossed className="h-8 w-8" />} />
        )}
      </div>
    </WidgetBoundary>
  );
}
