"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, ShieldCheck, UserCheck, ArrowLeft, Filter, Search } from "lucide-react";
import Link from "next/link";
import { useUIStore } from "@/stores/uiStore";

interface PendingApproval {
  id: string;
  studentName: string;
  rollNumber: string;
  branch: string;
  passType: string;
  reason: string;
  requestedAt: string;
  parentConsent: "APPROVED" | "PENDING";
}

export default function SupervisorApprovalsPage() {
  const { addToast } = useUIStore();
  const [approvals, setApprovals] = useState<PendingApproval[]>([
    {
      id: "REQ-901",
      studentName: "K. Rajesh",
      rollNumber: "21001A0501",
      branch: "CSE - 4th Year",
      passType: "Home Leave",
      reason: "Visiting home for festival celebration",
      requestedAt: "10 mins ago",
      parentConsent: "APPROVED",
    },
    {
      id: "REQ-902",
      studentName: "P. Sai Kumar",
      rollNumber: "21001A0502",
      branch: "ECE - 4th Year",
      passType: "Outing",
      reason: "Medical appointment at Apollo Clinic",
      requestedAt: "25 mins ago",
      parentConsent: "APPROVED",
    },
    {
      id: "REQ-903",
      studentName: "M. Sneha",
      rollNumber: "22001A0412",
      branch: "EEE - 3rd Year",
      passType: "Emergency",
      reason: "Urgent family event",
      requestedAt: "1 hour ago",
      parentConsent: "PENDING",
    },
  ]);

  const handleApprove = (id: string, name: string) => {
    setApprovals(approvals.filter((a) => a.id !== id));
    addToast({
      title: "Gate Pass Approved",
      message: `Pass for ${name} has been authorized and issued.`,
      variant: "success",
    });
  };

  const handleReject = (id: string, name: string) => {
    setApprovals(approvals.filter((a) => a.id !== id));
    addToast({
      title: "Gate Pass Rejected",
      message: `Pass request for ${name} was denied.`,
      variant: "error",
    });
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/supervisor/live" className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Gate Pass Approvals Desk
            </h1>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Review pending student outing & leave requests requiring supervisor clearance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 text-xs font-bold">
            {approvals.length} Pending Approval{approvals.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {approvals.length === 0 ? (
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">All Approvals Cleared!</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              There are no pending gate pass requests in the supervisor queue at this moment.
            </p>
          </div>
        ) : (
          approvals.map((item) => (
            <div
              key={item.id}
              className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{item.studentName}</h3>
                    <span className="text-xs font-mono font-bold text-[var(--action-primary)]">
                      ({item.rollNumber})
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">{item.branch}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-[var(--action-primary)]/10 text-[var(--action-primary)] border border-[var(--action-primary)]/20 text-[10px] font-bold uppercase">
                    {item.passType}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border uppercase ${
                      item.parentConsent === "APPROVED"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    }`}
                  >
                    Parent: {item.parentConsent}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-[var(--text-secondary)]">
                  <span className="text-[var(--text-muted)] font-semibold">Stated Reason: </span>
                  {item.reason}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Requested {item.requestedAt}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleReject(item.id, item.studentName)}
                  className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>

                <button
                  onClick={() => handleApprove(item.id, item.studentName)}
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-md hover:bg-emerald-600 flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve Pass</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
