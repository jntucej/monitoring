"use client";

import { useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { clearCache } from "@/hooks/useApiResource";
import { FileQuestion, Send, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface AttendanceDisputeComposerProps {
  onSuccess?: () => void;
  subjects?: Array<{ code: string; label: string }>;
}

export function AttendanceDisputeComposer({
  onSuccess,
  subjects = [],
}: AttendanceDisputeComposerProps) {
  const { addToast } = useUIStore();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [subject, setSubject] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !reason.trim()) {
      addToast({
        variant: "warning",
        title: "Required fields missing",
        message: "Please enter date and reason for dispute.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const fullReason = subject ? `[${subject}] ${reason.trim()}` : reason.trim();
      const res = await fetch("/api/student/attendance/dispute", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date,
          reason: fullReason,
          evidence: evidence.trim() || undefined,
        }),
      });

      const body = await res.json().catch(() => null);
      if (res.ok && body?.success) {
        addToast({
          variant: "success",
          title: "Dispute submitted",
          message: "Your attendance dispute has been logged and sent to faculty.",
        });
        clearCache("/api/student/attendance");
        clearCache("/api/student/attendance/overview");
        clearCache("/api/student/attendance-calendar");
        setDate("");
        setSubject("");
        setReason("");
        setEvidence("");
        setOpen(false);
        onSuccess?.();
      } else {
        addToast({
          variant: "error",
          title: "Submission failed",
          message: body?.error?.message ?? "Failed to submit dispute.",
        });
      }
    } catch {
      addToast({
        variant: "error",
        title: "Network error",
        message: "Could not file attendance dispute. Please check your connection.",
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
          <FileQuestion className="w-4 h-4 text-action-primary" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Attendance Dispute Composer
            </h3>
            <p className="text-xs text-text-muted">
              Marked absent wrongly? Raise an official dispute with proof.
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
                Date of Class *
              </label>
              <input
                type="date"
                required
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Subject (Optional)
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-action-primary"
              >
                <option value="">Select subject…</option>
                {subjects.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} — {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Dispute Reason / Details *
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Attended period 2 with Prof. Sharma in Hall 102; biometric turnstile timed out."
              className="surface-card w-full bg-bg-base px-3 py-2 text-xs text-text-primary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-action-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Proof Link / Evidence Notes (Optional)
            </label>
            <input
              type="text"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="e.g. Turnstile gate scan ID or classroom verification note"
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
                  <Send className="w-3.5 h-3.5" /> Submit Dispute
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default AttendanceDisputeComposer;
