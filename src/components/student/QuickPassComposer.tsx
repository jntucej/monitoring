"use client";

import { useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { clearCache } from "@/hooks/useApiResource";
import { PlusCircle, Send, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface QuickPassComposerProps {
  studentRoll?: string;
  onSuccess?: () => void;
}

export function QuickPassComposer({ studentRoll = "", onSuccess }: QuickPassComposerProps) {
  const { addToast } = useUIStore();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("day_pass");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to) {
      addToast({
        variant: "warning",
        title: "Missing timestamps",
        message: "Please choose departure and expected return times.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/passes", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roll: studentRoll,
          reason,
          from,
          to,
          description: description.trim() || undefined,
        }),
      });

      const body = await res.json().catch(() => null);
      if (res.ok && body?.success) {
        addToast({
          variant: "success",
          title: "Pass created",
          message: "Gate pass request initiated successfully.",
        });
        clearCache("/api/passes");
        clearCache("/api/student/dashboard");
        setFrom("");
        setTo("");
        setDescription("");
        setOpen(false);
        onSuccess?.();
      } else {
        addToast({
          variant: "error",
          title: "Pass request failed",
          message: body?.error?.message ?? "Unable to create pass.",
        });
      }
    } catch {
      addToast({
        variant: "error",
        title: "Network error",
        message: "Could not submit pass request. Check your connection.",
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
          <PlusCircle className="w-4 h-4 text-action-primary" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Quick Pass Composer
            </h3>
            <p className="text-xs text-text-muted">
              Instantly draft a Day Pass or Outing request.
            </p>
          </div>
        </div>
        <span className="p-1 rounded-md text-text-muted hover:bg-bg-elevated transition-colors">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Pass Type *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-action-primary"
              >
                <option value="day_pass">Day Pass (Same Day Outing)</option>
                <option value="outing">General Outing</option>
                <option value="emergency">Emergency Outing</option>
                <option value="home_visit">Home Visit / Leave</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Departure Time *
              </label>
              <input
                type="datetime-local"
                required
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Expected Return *
              </label>
              <input
                type="datetime-local"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Purpose / Destination
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Bank visit / medical appointment / weekend home visit"
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
                  <Send className="w-3.5 h-3.5" /> Submit Pass Request
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default QuickPassComposer;
