"use client";

import { FileText, Download, CheckCircle2, AlertTriangle } from "lucide-react";

interface HallTicketStatusCardProps {
  isEligible?: boolean;
  examName?: string;
  examDate?: string;
  hallNumber?: string;
  seatNumber?: string;
}

export function HallTicketStatusCard({
  isEligible = true,
  examName = "End Semester Examinations",
  examDate = "Upcoming Session",
  hallNumber = "Hall 3B",
  seatNumber = "Seat #42",
}: HallTicketStatusCardProps) {
  return (
    <div className="surface-card bg-bg-surface p-4 rounded-xl border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-action-primary" />
          <h3 className="text-sm font-semibold text-text-primary">
            Hall Ticket Status
          </h3>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isEligible
              ? "bg-emerald-500/15 text-action-success"
              : "bg-rose-500/15 text-action-danger"
          }`}
        >
          {isEligible ? "Issued & Valid" : "Hold"}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <div>
          <h4 className="text-base font-bold text-text-primary">{examName}</h4>
          <p className="text-xs text-text-muted mt-0.5">{examDate}</p>
        </div>
        {isEligible ? (
          <span className="text-xs font-medium text-action-success flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Print
          </span>
        ) : (
          <span className="text-xs font-medium text-action-danger flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Clearance Deficit
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
        <div className="p-2 rounded bg-bg-elevated flex items-center justify-between">
          <span className="text-[11px] text-text-muted">Assigned Hall</span>
          <span className="text-xs font-bold font-mono text-text-primary">
            {isEligible ? hallNumber : "Pending"}
          </span>
        </div>
        <div className="p-2 rounded bg-bg-elevated flex items-center justify-between">
          <span className="text-[11px] text-text-muted">Desk Allocation</span>
          <span className="text-xs font-bold font-mono text-text-primary">
            {isEligible ? seatNumber : "Pending"}
          </span>
        </div>
      </div>

      {isEligible && (
        <button
          type="button"
          onClick={() => window.print()}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-action-primary hover:bg-bg-surface border border-border transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Download Hall Ticket PDF
        </button>
      )}
    </div>
  );
}

export default HallTicketStatusCard;
