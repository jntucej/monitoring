"use client";

import { useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { clearCache } from "@/hooks/useApiResource";
import { Utensils, Send, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface MealOptOutComposerProps {
  onSuccess?: () => void;
}

export function MealOptOutComposer({ onSuccess }: MealOptOutComposerProps) {
  const { addToast } = useUIStore();
  const [open, setOpen] = useState(false);
  const [mealDate, setMealDate] = useState("");
  const [mealType, setMealType] = useState("BREAKFAST");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealDate) {
      addToast({
        variant: "warning",
        title: "Date required",
        message: "Please choose a meal date.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/student/meal-opt-out", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mealDate,
          mealType,
          reason: reason.trim() || undefined,
        }),
      });

      const body = await res.json().catch(() => null);
      if (res.ok && body?.success) {
        addToast({
          variant: "success",
          title: "Meal Opt-Out recorded",
          message: `Successfully cancelled ${mealType} for ${mealDate}.`,
        });
        clearCache("/api/student/meal-opt-out");
        clearCache("/api/student/mess-bill");
        setMealDate("");
        setReason("");
        setOpen(false);
        onSuccess?.();
      } else {
        addToast({
          variant: "error",
          title: "Opt-Out failed",
          message: body?.error?.message ?? "Unable to record meal opt-out.",
        });
      }
    } catch {
      addToast({
        variant: "error",
        title: "Network error",
        message: "Could not submit opt-out. Please check connection.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="surface-card bg-bg-surface rounded-xl border border-border p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Utensils className="w-4 h-4 text-action-primary" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Meal Opt-Out Composer
            </h3>
            <p className="text-xs text-text-muted">
              Cancel upcoming meals before 6:00 AM cutoff to earn monthly rebates.
            </p>
          </div>
        </div>
        <span className="p-1 rounded-md text-text-muted hover:bg-bg-elevated transition-colors">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Meal Date *
              </label>
              <input
                type="date"
                required
                value={mealDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setMealDate(e.target.value)}
                className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Meal Type *
              </label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-action-primary"
              >
                <option value="BREAKFAST">Breakfast</option>
                <option value="LUNCH">Lunch</option>
                <option value="DINNER">Dinner</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Reason (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Outing / fast / home visit"
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
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Recording…
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Submit Opt-Out
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default MealOptOutComposer;
