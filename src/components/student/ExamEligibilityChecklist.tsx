"use client";

import { CheckCircle2, XCircle, AlertCircle, ShieldAlert } from "lucide-react";

interface ExamEligibilityChecklistProps {
  attendancePct?: number;
  totalDue?: number;
  isDebarred?: boolean;
}

export function ExamEligibilityChecklist({
  attendancePct = 85,
  totalDue = 0,
  isDebarred = false,
}: ExamEligibilityChecklistProps) {
  const attendancePassed = attendancePct >= 75;
  const feesPassed = totalDue <= 0;
  const disciplinaryPassed = !isDebarred;

  const isEligible = attendancePassed && feesPassed && disciplinaryPassed;

  return (
    <div className="surface-card bg-bg-surface p-4 rounded-xl border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          Exam Eligibility Checklist
        </h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isEligible
              ? "bg-emerald-500/15 text-action-success"
              : "bg-rose-500/15 text-action-danger"
          }`}
        >
          {isEligible ? "Hall Ticket Ready" : "Clearance Required"}
        </span>
      </div>

      <div className="space-y-2 pt-1">
        {/* Attendance rule */}
        <div className="p-2.5 rounded-lg border border-border bg-bg-elevated flex items-center justify-between">
          <div className="flex items-center gap-2">
            {attendancePassed ? (
              <CheckCircle2 className="w-4 h-4 text-action-success shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-action-danger shrink-0" />
            )}
            <div>
              <p className="text-xs font-semibold text-text-primary">
                Class Attendance ≥ 75%
              </p>
              <p className="text-[11px] text-text-muted">
                Current Standing: <span className="font-mono tabular-nums font-bold">{attendancePct}%</span>
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-bold ${
              attendancePassed ? "text-action-success" : "text-action-danger"
            }`}
          >
            {attendancePassed ? "PASSED" : "DEFICIT"}
          </span>
        </div>

        {/* Fee dues clearance */}
        <div className="p-2.5 rounded-lg border border-border bg-bg-elevated flex items-center justify-between">
          <div className="flex items-center gap-2">
            {feesPassed ? (
              <CheckCircle2 className="w-4 h-4 text-action-success shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-action-danger shrink-0" />
            )}
            <div>
              <p className="text-xs font-semibold text-text-primary">
                Tuition & Hostel Fee Clearance
              </p>
              <p className="text-[11px] text-text-muted">
                Pending Balance: <span className="font-mono tabular-nums font-bold">₹{totalDue.toLocaleString("en-IN")}</span>
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-bold ${
              feesPassed ? "text-action-success" : "text-action-danger"
            }`}
          >
            {feesPassed ? "CLEARED" : "DUE"}
          </span>
        </div>

        {/* Academic status / Debarment */}
        <div className="p-2.5 rounded-lg border border-border bg-bg-elevated flex items-center justify-between">
          <div className="flex items-center gap-2">
            {disciplinaryPassed ? (
              <CheckCircle2 className="w-4 h-4 text-action-success shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-action-danger shrink-0" />
            )}
            <div>
              <p className="text-xs font-semibold text-text-primary">
                Disciplinary & Debarment Clearance
              </p>
              <p className="text-[11px] text-text-muted">
                Academic Standing: {isDebarred ? "Debarred by Committee" : "Active & Good Standing"}
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-bold ${
              disciplinaryPassed ? "text-action-success" : "text-action-danger"
            }`}
          >
            {disciplinaryPassed ? "NO RECORD" : "DEBARRED"}
          </span>
        </div>
      </div>

      {!isEligible && (
        <p className="text-[11px] text-action-danger flex items-center gap-1 font-medium pt-1">
          <ShieldAlert className="w-3.5 h-3.5" />
          Resolve all clearance deficits before examination branch manifests close.
        </p>
      )}
    </div>
  );
}

export default ExamEligibilityChecklist;
