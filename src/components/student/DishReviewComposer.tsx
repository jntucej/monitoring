"use client";

import { useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { clearCache } from "@/hooks/useApiResource";
import { Star, Send, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface DishReviewComposerProps {
  onSuccess?: () => void;
}

export function DishReviewComposer({ onSuccess }: DishReviewComposerProps) {
  const { addToast } = useUIStore();
  const [open, setOpen] = useState(false);
  const [mealType, setMealType] = useState<"BREAKFAST" | "LUNCH" | "DINNER">("LUNCH");
  const [satisfaction, setSatisfaction] = useState<"GREAT" | "GOOD" | "OKAY" | "POOR">("GOOD");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().slice(0, 10);
    setSubmitting(true);
    try {
      const res = await fetch("/api/mess/reviews", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewDate: today,
          mealType,
          satisfaction,
          comment: comment.trim() || undefined,
        }),
      });

      const body = await res.json().catch(() => null);
      if (res.ok && body?.success) {
        addToast({
          variant: "success",
          title: "Meal rated",
          message: `Thank you for rating today's ${mealType.toLowerCase()}!`,
        });
        clearCache("/api/mess/reviews");
        setComment("");
        setOpen(false);
        onSuccess?.();
      } else {
        addToast({
          variant: "error",
          title: "Feedback failed",
          message: body?.error?.message ?? "Unable to submit meal review.",
        });
      }
    } catch {
      addToast({
        variant: "error",
        title: "Network error",
        message: "Could not submit review. Please try again later.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const satisfactionButtons: Array<{ key: "GREAT" | "GOOD" | "OKAY" | "POOR"; label: string; color: string }> = [
    { key: "GREAT", label: "Delicious", color: "text-emerald-500 border-emerald-500/40 bg-emerald-500/10" },
    { key: "GOOD", label: "Good", color: "text-blue-500 border-blue-500/40 bg-blue-500/10" },
    { key: "OKAY", label: "Average", color: "text-amber-500 border-amber-500/40 bg-amber-500/10" },
    { key: "POOR", label: "Needs Improvement", color: "text-rose-500 border-rose-500/40 bg-rose-500/10" },
  ];

  return (
    <div className="surface-card bg-bg-surface rounded-xl border border-border p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-action-primary" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              1-Tap Dish Review Composer
            </h3>
            <p className="text-xs text-text-muted">
              Rate today&apos;s food quality and menu items directly.
            </p>
          </div>
        </div>
        <span className="p-1 rounded-md text-text-muted hover:bg-bg-elevated transition-colors">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-border space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Select Meal
            </label>
            <div className="flex gap-2">
              {(["BREAKFAST", "LUNCH", "DINNER"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMealType(m)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                    mealType === m
                      ? "bg-action-primary text-white border-action-primary"
                      : "bg-bg-elevated text-text-secondary border-border hover:bg-bg-surface"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Food Quality Rating
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {satisfactionButtons.map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setSatisfaction(btn.key)}
                  className={`p-2 rounded-lg border text-xs font-semibold transition-all ${
                    satisfaction === btn.key
                      ? btn.color + " ring-1 ring-action-primary"
                      : "border-border bg-bg-elevated text-text-secondary hover:bg-bg-surface"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Comments / Dish Feedback (Optional)
            </label>
            <input
              type="text"
              value={comment}
              maxLength={280}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Rice was well-cooked, dal was hot and fresh"
              className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-action-primary"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-action-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50 transition-opacity"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Submit Review
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default DishReviewComposer;
