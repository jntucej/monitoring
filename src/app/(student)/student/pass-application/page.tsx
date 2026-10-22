"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePassTypes, getPassTypeName } from "@/hooks/usePassTypes";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { getAuthHeaders } from "@/lib/utils";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { extractStudentRoll } from "@/lib/student-utils";
import {
  Send, Calendar, Clock, Loader2, CheckCircle2, XCircle, ArrowRight, FileCheck,
} from "lucide-react";

function formatForDatetimeInput(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getSameDayEveningTime(fromDate: Date): Date {
  const evening = new Date(fromDate);
  evening.setHours(21, 0, 0, 0);
  if (evening.getTime() <= fromDate.getTime()) evening.setHours(23, 59, 0, 0);
  return evening;
}

/* ── Pass application form (reuses /api/passes POST pattern from passes sub-page) ── */

function PassApplicationForm() {
  const user = useAuthStore((s) => s.user);
  const { addToast } = useUIStore();
  const { passTypes, loading: loadingPassTypes } = usePassTypes();
  const [passType, setPassType] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!fromTime) setFromTime(formatForDatetimeInput(new Date()));
    if (passTypes.length > 0 && !passType) {
      const defaultCode = passTypes[0].code;
      setPassType(defaultCode);
      const baseDate = new Date();
      if (defaultCode === "day_pass") {
        setToTime(formatForDatetimeInput(getSameDayEveningTime(baseDate)));
      } else {
        const hours = passTypes[0].defaultDurationHours || 48;
        setToTime(formatForDatetimeInput(new Date(baseDate.getTime() + hours * 3600 * 1000)));
      }
    }
  }, [passTypes, passType, fromTime]);

  const handlePassTypeChange = (newCode: string) => {
    setPassType(newCode);
    const baseDate = fromTime ? new Date(fromTime) : new Date();
    if (newCode === "day_pass") {
      setToTime(formatForDatetimeInput(getSameDayEveningTime(baseDate)));
    } else {
      const selected = passTypes.find((pt) => pt.code === newCode);
      const hours = selected?.defaultDurationHours || 48;
      setToTime(formatForDatetimeInput(new Date(baseDate.getTime() + hours * 3600 * 1000)));
    }
  };

  const handleFromTimeChange = (newFromIso: string) => {
    setFromTime(newFromIso);
    if (passType === "day_pass" && newFromIso) {
      setToTime(formatForDatetimeInput(getSameDayEveningTime(new Date(newFromIso))));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const roll = extractStudentRoll(user);
    if (!roll) {
      addToast({ title: "Session Error", message: "No student roll number found. Please log in again.", variant: "error" });
      return;
    }

    const selectedTypeCode = passType || passTypes[0]?.code || "day_pass";
    const fromIso = fromTime ? new Date(fromTime).toISOString() : new Date().toISOString();
    const toIso = toTime ? new Date(toTime).toISOString() : new Date(Date.now() + 12 * 3600 * 1000).toISOString();

    if (selectedTypeCode === "day_pass") {
      const fDate = new Date(fromIso);
      const tDate = new Date(toIso);
      if (fDate.getDate() !== tDate.getDate() || fDate.getMonth() !== tDate.getMonth()) {
        addToast({
          title: "Same-Day Return Required",
          message: "Day Pass requires returning on the same day. Select Home Out for overnight leave.",
          variant: "error",
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/passes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          roll,
          reason: selectedTypeCode,
          from: fromIso,
          to: toIso,
          description: reasonText,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        addToast({ title: "Pass Request Submitted", message: "Pass request sent for Warden approval.", variant: "success" });
        setReasonText("");
      } else {
        addToast({ title: "Submission Failed", message: json.error?.message || "Failed to submit request.", variant: "error" });
      }
    } catch (err: any) {
      addToast({ title: "Error", message: err.message || "Failed to submit request.", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 space-y-4 min-w-0">
      {/* Pass type selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[var(--text-secondary)]">Pass Category</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {passTypes.map((pt) => (
            <button
              key={pt.code}
              type="button"
              onClick={() => handlePassTypeChange(pt.code)}
              className={`p-3 rounded-xl border text-left transition-colors ${
                passType === pt.code
                  ? "border-[var(--action-primary)] bg-[var(--action-primary)]/10"
                  : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--text-muted)]"
              }`}
            >
              <p className="text-xs font-bold text-[var(--text-primary)]">{pt.name}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-2">{pt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* From / To */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-[var(--text-secondary)]" htmlFor="from-departure">From (Departure)</label>
          <input id="from-departure"
            type="datetime-local"
            value={fromTime}
            onChange={(e) => handleFromTimeChange(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)]"
            required
            disabled={submitting}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-[var(--text-secondary)]" htmlFor="to-return">To (Return)</label>
          <input id="to-return"
            type="datetime-local"
            value={toTime}
            onChange={(e) => setToTime(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)]"
            required
            disabled={submitting}
          />
        </div>
      </div>
      {passType === "day_pass" && (
        <p className="text-[10px] text-amber-500 font-medium">
          * Day Pass requires returning on the same calendar day (by 23:59).
        </p>
      )}

      {/* Reason */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-[var(--text-secondary)]" htmlFor="reason-for-outing">Reason for Outing</label>
        <textarea id="reason-for-outing"
          required
          rows={3}
          value={reasonText}
          onChange={(e) => setReasonText(e.target.value)}
          placeholder="State the clear purpose for leaving campus…"
          className="w-full p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)]"
          disabled={submitting}
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting || !passType}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--action-primary)] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Submit Pass Request
        </button>
        <Link
          href="/student/request-tracking"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          View tracking <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </form>
  );
}

/* ── Main page ── */

function StudentPassApplicationInner() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <div className="flex items-center gap-2">
        <FileCheck className="w-5 h-5 text-[var(--action-primary)]" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Apply for a Gate Pass</p>
      </div>

      <div className="rounded-xl border border-[var(--action-info)]/20 bg-[var(--action-info)]/5 p-3 text-xs text-[var(--action-info)] flex items-start gap-2 min-w-0">
        <Send className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          <strong>Daily Outings:</strong> Standard short outings (2-4 hrs) do not require a gate pass.
          Apply here only for <strong>Day Pass</strong> or <strong>Home Out / Outstation Leave</strong>.
        </p>
      </div>

      <PassApplicationForm />

      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3 text-xs flex items-center justify-between gap-3 min-w-0">
        <span className="text-[var(--text-muted)]">Track your submitted requests in real time.</span>
        <Link
          href="/student/request-tracking"
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
        >
          Request Tracking <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function StudentPassApplicationPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StudentPassApplicationInner />
    </Suspense>
  );
}
