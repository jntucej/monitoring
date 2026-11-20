/**
 * shared/meals/MealDetailSheet.tsx — tap a meal in MyMealHistory to see
 * the full detail: menu items, allergens, my rating, and the one-tap
 * "something was wrong" complaint link. The "DETAIL" step of the meal
 * loop. Takes a meal row (from /api/mess/history) + optional menu.
 */

"use client";

import { useEffect, useState } from "react";
import { X, Star, AlertTriangle, Utensils, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/utils";

export interface MealDetailSheetProps {
  /** The meal row (from MyMealHistory). Null = closed. */
  meal: {
    id: string;
    meal_type: string;
    review_date: string;
    rating?: number | null;
    served?: boolean;
    menu?: string[];
    allergens?: string[];
  } | null;
  onClose: () => void;
  className?: string;
}

export function MealDetailSheet({ meal, onClose, className }: MealDetailSheetProps) {
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    setRating(meal?.rating ?? null);
  }, [meal?.id]);

  if (!meal) return null;

  const submitRating = async (stars: number) => {
    setRating(stars);
    try {
      await fetch("/api/mess/reviews", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ record_id: meal.id, rating: stars }),
      });
    } catch {
      // keep client-side state
    }
  };

  return (
    <div className={cn("fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center", className)}>
      <div className="w-full rounded-t-xl bg-bg-elevated p-4 sm:max-w-md sm:rounded-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-text-muted capitalize">{meal.meal_type}</p>
            <h3 className="text-base font-semibold text-text-primary">
              {new Date(meal.review_date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-muted hover:bg-bg"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Menu */}
        {meal.menu && meal.menu.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wide text-text-muted">Served</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {meal.menu.map((item) => (
                <span key={item} className="rounded bg-bg px-2 py-0.5 text-[11px] text-text-secondary">
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Allergens */}
        {meal.allergens && meal.allergens.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wide text-text-muted">Allergens</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {meal.allergens.map((a) => (
                <span
                  key={a}
                  className="rounded bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-400"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* My rating */}
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wide text-text-muted">My rating</p>
          <div className="mt-1 flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submitRating(s)}
                aria-label={`${s} stars`}
              >
                <Star
                  className={cn(
                    "h-5 w-5",
                    (rating ?? 0) >= s ? "fill-amber-400 text-amber-400" : "text-text-muted/40",
                  )}
                />
              </button>
            ))}
            {rating && <span className="ml-2 text-xs text-green-400">{rating}/5</span>}
          </div>
        </div>

        {/* Escalate: one-tap complaint for this meal */}
        {meal.served && (
          <button
            type="button"
            onClick={() => {
              window.location.href = `/student/complaints/new?category=meal&record_id=${meal.id}`;
            }}
            className="mt-4 flex items-center gap-1.5 text-xs text-text-muted underline hover:text-text"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Something was wrong with this meal — raise a complaint
          </button>
        )}
      </div>
    </div>
  );
}

export default MealDetailSheet;
