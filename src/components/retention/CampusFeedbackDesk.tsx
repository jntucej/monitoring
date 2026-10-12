"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageSquare,
  Clock,
  User,
  CheckCircle,
  AlertTriangle,
  Send,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import {
  getFeedbackReports,
  submitFeedbackReport,
  type FeedbackReport,
} from "@/lib/retention";

/* ------------------------------------------------------------------ */
/* Lifecycle steps                                                     */
/* ------------------------------------------------------------------ */

const STATUS_STEPS: Array<{ key: FeedbackReport["status"]; label: string }> = [
  { key: "submitted", label: "Submitted" },
  { key: "acknowledged", label: "Acknowledged" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
  { key: "feedback", label: "Feedback" },
];

const STATUS_ICONS: Record<string, React.ReactNode> = {
  submitted: <Clock className="h-3.5 w-3.5" />,
  acknowledged: <CheckCircle className="h-3.5 w-3.5" />,
  assigned: <User className="h-3.5 w-3.5" />,
  in_progress: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  resolved: <CheckCircle className="h-3.5 w-3.5" />,
  feedback: <MessageSquare className="h-3.5 w-3.5" />,
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "text-amber-400",
  acknowledged: "text-blue-400",
  assigned: "text-purple-400",
  in_progress: "text-cyan-400",
  resolved: "text-emerald-400",
  feedback: "text-indigo-400",
};

const FEEDBACK_CATEGORIES = [
  "facility_fault",
  "rfid_reader",
  "account_access",
  "hostel_maintenance",
  "admin_request",
  "suggestion",
  "general",
];

function getStepIndex(status: FeedbackReport["status"]): number {
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function CampusFeedbackDesk() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formCategory, setFormCategory] = useState("general");
  const [formSubject, setFormSubject] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await getFeedbackReports();
      if (result.success) {
        setReports(result.data.reports);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = useCallback(async () => {
    if (!user || !formSubject.trim()) return;
    setSubmitting(true);
    try {
      const result = await submitFeedbackReport({
        category: formCategory,
        subject: formSubject.trim(),
        description: formDescription.trim(),
      });
      if (result.success) {
        setFormSubject("");
        setFormDescription("");
        setFormCategory("general");
        setShowForm(false);
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
        load();
      }
    } catch {
      // Silently ignore
    } finally {
      setSubmitting(false);
    }
  }, [user, formCategory, formSubject, formDescription, load]);

  return (
    <WidgetBoundary title="Campus Feedback Desk">
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-medium text-slate-100">Feedback & Issues</h3>
            <span className="text-xs text-slate-500">
              {reports.length} report(s)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/20 transition-colors motion-reduce:transition-none"
          >
            <Send className="h-3.5 w-3.5" />
            {showForm ? "Cancel" : "New Report"}
          </button>
        </div>

        {submitSuccess && (
          <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
            Report submitted. You'll see status updates here.
          </div>
        )}

        {/* New Report Form */}
        {showForm && (
          <div className="mb-4 space-y-3 rounded-lg border border-slate-700/50 bg-slate-900/40 p-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-600/50 bg-slate-800/50 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              >
                {FEEDBACK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5">
                Subject <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="Brief description of the issue"
                className="w-full rounded-lg border border-slate-600/50 bg-slate-800/50 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5">Details</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                placeholder="Additional context (optional)"
                className="w-full rounded-lg border border-slate-600/50 bg-slate-800/50 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none"
              />
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!formSubject.trim() || submitting}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-500/80 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-40 transition-colors motion-reduce:transition-none"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Submit Report
            </button>
          </div>
        )}

        {/* Reports List */}
        {loading ? (
          <div className="h-24 animate-pulse rounded bg-slate-700/20" />
        ) : reports.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No reports yet. Be the first to flag an issue.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {reports.map((report) => {
              const stepIdx = getStepIndex(report.status);
              return (
                <div
                  key={report.id}
                  className="rounded-lg border border-slate-700/40 bg-slate-800/30 p-3"
                >
                  {/* Subject + Status Badge */}
                  <div className="flex items-start gap-2">
                    <div
                      className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${STATUS_COLORS[report.status] ?? ""} bg-slate-700/50 shrink-0`}
                    >
                      {STATUS_ICONS[report.status] ?? <AlertTriangle className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">
                        {report.subject}
                      </p>
                      <p className="text-[10px] text-slate-500 capitalize">
                        {report.category.replace(/_/g, " ")}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[report.status] ?? "text-slate-400"}`}
                    >
                      {report.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>

                  {/* Lifecycle Track */}
                  <div className="mt-3 flex items-center gap-0">
                    {STATUS_STEPS.map((step, i) => {
                      const done = i <= stepIdx;
                      const isCurrent = i === stepIdx;
                      return (
                        <React.Fragment key={step.key}>
                          <div className="flex flex-col items-center">
                            <div
                              className={`h-2 w-2 rounded-full ${
                                done
                                  ? "bg-cyan-400"
                                  : "bg-slate-600"
                              } ${isCurrent ? "ring-2 ring-cyan-400/40" : ""}`}
                            />
                            <span
                              className={`mt-1 text-[8px] ${
                                done ? "text-cyan-300" : "text-slate-600"
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                          {i < STATUS_STEPS.length - 1 && (
                            <div
                              className={`h-px flex-1 ${
                                i < stepIdx ? "bg-cyan-400/50" : "bg-slate-700"
                              }`}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Follow-through details */}
                  <div className="mt-3 space-y-1.5">
                    {report.assignedTo && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Assigned to: <span className="text-slate-300">{report.assignedTo}</span>
                      </p>
                    )}
                    {report.reviewerNote && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        <span className="line-clamp-2">{report.reviewerNote}</span>
                      </p>
                    )}
                    {report.notes && report.status === "in_progress" && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className="line-clamp-2">{report.notes}</span>
                      </p>
                    )}
                    <p className="text-[10px] text-slate-500">
                      {new Date(report.createdAt).toLocaleDateString()}
                      {report.resolvedAt
                        ? ` · Resolved ${new Date(report.resolvedAt).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default CampusFeedbackDesk;
