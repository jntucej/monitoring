/**
 * shared/meals/MyMealHistory.tsx — the student's meal history loop:
 * what I ate, my ratings, skips, and the one-tap "something was wrong"
 * complaint. Steps 2 (STATUS) + 3 (ACT: rate) + 6 (ESCALATE: complaint)
 * of the meal loop.
 */

"use client";

import { useEffect, useState } from "react";
import { Star, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/utils";
import { MealDetailSheet } from "@/components/shared/meals/MealDetailSheet";

interface MealRow {
  id: string;
  meal_type: string;
  review_date: string;
  rating?: number | null;
  served?: boolean;
}

export interface MyMealHistoryProps {
  /** Max rows (default 14). */
  limit?: number;
  /** Called after a rating is submitted. */
  onRated?: () => void;
  className?: string;
}

export function MyMealHistory({ limit = 14, onRated, className }: MyMealHistoryProps) {
  const [rows, setRows] = useState<MealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingFor, setRatingFor] = useState<string | null>(null);
  const [detail, setDetail] = useState<MealRow | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/mess/history?limit=${limit}`, { headers: getAuthHeaders() });
      const data = res.ok ? await res.json() : { meals: [] };
      setRows(data.meals ?? data.data?.meals ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rate = async (rowId: string, rating: number) => {
    setRatingFor(rowId);
    try {
      await fetch("/api/mess/reviews", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ record_id: rowId, rating }),
      });
      setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, rating } : r)));
      onRated?.();
    } finally {
      setRatingFor(null);
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 py-4 text-xs text-text-muted", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading meal history…
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {rows.length === 0 && (
        <p className="py-4 text-center text-xs text-text-muted">No meals recorded yet.</p>
      )}
      {rows.map((row) => (
        <div
          key={row.id}
          role="button"
          tabIndex={0}
          onClick={() => setDetail(row)}
          onKeyDown={(e) => e.key === "Enter" && setDetail(row)}
          className="surface-card flex cursor-pointer items-center justify-between gap-2 p-3 hover:bg-bg-elevated"
        >
          <div>
            <p className="text-xs font-medium text-text capitalize">{row.meal_type}</p>
            <p className="text-[11px] text-text-muted">
              {new Date(row.review_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
              {row.served ? "" : " · skipped"}
            </p>
          </div>
          {/* Rating: existing or inline stars */}
          {row.rating ? (
            <div className="flex items-center gap-0.5" aria-label={`${row.rating} stars`}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn("h-3.5 w-3.5", s <= (row.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-text-muted/40")}
                />
              ))}
            </div>
          ) : ratingFor === row.id ? (
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => rate(row.id, s)}
                  className="text-amber-400"
                >
                  <Star className="h-4 w-4" />
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRatingFor(row.id)}
              className="flex items-center gap-1 rounded-lg bg-bg-elevated px-2 py-1 text-[11px] text-text-secondary hover:bg-bg"
            >
              <Star className="h-3 w-3" />
              Rate
            </button>
          )}
        </div>
      ))}

      {/* Escalate: one-tap complaint for a meal */}
      {rows.some((r) => r.served) && (
        <button
          type="button"
          className="flex items-center gap-1.5 text-[11px] text-text-muted underline hover:text-text"
        >
          <AlertTriangle className="h-3 w-3" />
          Something was wrong with a meal — raise a complaint
        </button>
      )}
      {/* Tap-to-detail sheet (menu, allergens, rating, complaint link) */}
      <MealDetailSheet
        meal={
          detail
            ? {
                id: detail.id,
                meal_type: detail.meal_type,
                review_date: detail.review_date,
                rating: detail.rating ?? null,
                served: detail.served,
              }
            : null
        }
        onClose={() => setDetail(null)}
      />
    </div>
  );
}

export default MyMealHistory;
