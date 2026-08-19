"use client";

import { useState, useEffect } from "react";
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
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPendingPasses() {
      try {
        setLoading(true);
        const res = await fetch("/api/passes?status=PENDING", { cache: "no-store" });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setApprovals(
            json.data.map((p: any) => ({
              id: p.id,
              studentName: p.studentName || p.student_name || "Student",
              rollNumber: p.roll || p.roll_number || p.student_roll,
              branch: p.department || p.branch || p.dept || "Department",
              passType: p.reason || "Outing Pass",
              reason: p.description || p.reason || "Student Outing Request",
              requestedAt: new Date(p.requestedAt || p.requested_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              parentConsent: p.parentStatus === "APPROVED" || p.parent_status === "APPROVED" ? "APPROVED" : "PENDING",
            }))
          );
        } else {
          setApprovals([]);
        }
      } catch (err) {
        console.error("Failed to load pending passes:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPendingPasses();
  }, []);

  const handleApprove = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/passes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "approve", comment: "Approved by supervisor" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to approve pass");
      }
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      addToast({
        title: "Gate Pass Approved",
        message: `Pass for ${name} has been authorized and issued.`,
        variant: "success",
      });
    } catch (err: any) {
      addToast({
        title: "Approval Failed",
        message: err.message || "Failed to approve pass request.",
        variant: "error",
      });
    }
  };

  const handleReject = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/passes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "reject", comment: "Rejected by supervisor" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to reject pass");
      }
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      addToast({
        title: "Gate Pass Rejected",
        message: `Pass request for ${name} was denied.`,
        variant: "error",
      });
    } catch (err: any) {
      addToast({
        title: "Rejection Failed",
        message: err.message || "Failed to reject pass request.",
        variant: "error",
      });
    }
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
