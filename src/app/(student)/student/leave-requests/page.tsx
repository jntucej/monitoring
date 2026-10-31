"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { usePassTypes, getPassTypeName } from "@/hooks/usePassTypes";
import { getAuthHeaders } from "@/lib/utils";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { extractStudentRoll } from "@/lib/student-utils";
import {
  Calendar, Clock, Loader2, CheckCircle2, XCircle, ArrowRight, FileText,
} from "lucide-react";

type LeaveKind = "outstation" | "illness" | "family" | "exam";

const LEAVE_KINDS: Array<{ kind: LeaveKind; label: string; hint: string; type: "outstation" | "illness" | "family" | "exam" | "day_pass" }> = [
  { kind: "outstation", label: "Outstation / Home Leave", hint: "Multi-day absence from campus", type: "outstation" },
  { kind: "illness", label: "Illness / Medical Leave", hint: "Sick leave with medical certificate", type: "illness" },
  { kind: "family", label: "Family Occasion", hint: "Family events or ceremonies", type: "family" },
  { kind: "exam", label: "Exam Absence", hint: "Official exam schedule conflict", type: "exam" },
];

function StudentLeaveRequestsInner() {
  const user = useAuthStore((s) => s.user);
  const { addToast } = useUIStore();
  const [selectedKind, setSelectedKind] = useState<LeaveKind>("outstation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);

  const handleLeaveTypeSelect = (k: LeaveKind) => {
    setSelectedKind(k);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const roll = extractStudentRoll(user);
    if (!roll) {
      addToast({ title: "Session Error", message: "No student roll found. Please log in again.", variant: "error" });
      return;
    }

    if (!startDate || !endDate) {
      addToast({ title: "Missing dates", message: "Please select both start and end dates.", variant: "error" });
      return;
    }

    const kindLabel = LEAVE_KINDS.find((k) => k.kind === selectedKind)?.label || "Leave";
    setSubmitting(true);
    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          workflow_type: "hostel",
          leave_kind: kindLabel,
          description: reason || kindLabel,
          from: new Date(startDate).toISOString(),
          to: new Date(endDate + "T23:59:59").toISOString(),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const ticket = json.data?.ticket_number || "submitted";
        setSubmitted(ticket);
        addToast({ title: "Leave Request Submitted", message: `Ticket ${ticket} created for review.`, variant: "success" });
        setReason("");
      } else {
        addToast({
          title: "Submission Failed",
          message: json.error?.message || json.error || "Failed to submit leave request.",
          variant: "error",
        });
      }
    } catch (err: any) {
      addToast({ title: "Error", message: err.message || "Failed to submit leave request.", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5 py-6 min-w-0">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-[var(--action-primary)]" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Leave Requests</p>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Apply for leave through the permission workflow. Each request goes to the principal
        relevant staff for approval before it is active.
      </p>

      {submitted && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-400 min-w-0">
              Request <span className="font-mono font-bold">{submitted}</span> submitted. Track it in Request Tracking.
            </p>
          </div>
          <Link
            href="/student/request-tracking"
            className="inline-flex min-h-[44px] items-center gap-1 text-xs font-bold text-emerald-400 hover:underline shrink-0"
          >
            Track <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 space-y-4 min-w-0">
        {/* Leave type */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-secondary)]">Leave Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {LEAVE_KINDS.map((k) => (
              <button
                key={k.kind}
                type="button"
                onClick={() => handleLeaveTypeSelect(k.kind)}
                className={`min-h-[44px] p-3 rounded-xl border text-left transition-colors ${
                  selectedKind === k.kind
                    ? "border-[var(--action-primary)] bg-[var(--action-primary)]/10"
                    : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--text-muted)]"
                }`}
              >
                <p className="text-xs font-bold text-[var(--text-primary)]">{k.label}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{k.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)]" htmlFor="start-date">Start Date</label>
            <input id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full min-h-[44px] p-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)]"
              required
              disabled={submitting}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)]" htmlFor="end-date">End Date</label>
            <input id="end-date"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full min-h-[44px] p-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)]"
              required
              disabled={submitting}
            />
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-[var(--text-secondary)]" htmlFor="reason-notes">Reason / Notes</label>
          <textarea id="reason-notes"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Brief description of the reason for leave…"
            className="w-full p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)]"
            disabled={submitting}
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[var(--action-primary)] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
            Submit Leave Request
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3 text-xs flex flex-wrap items-center justify-between gap-3 min-w-0">
        <span className="text-[var(--text-muted)]">All your leave and pass requests appear in one timeline.</span>
        <Link
          href="/student/request-tracking"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
        >
          Request Tracking <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function StudentLeaveRequestsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StudentLeaveRequestsInner />
    </Suspense>
  );
}
