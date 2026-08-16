"use client";

import { useState } from "react";
import { QrCode, Plus, CheckCircle, Clock, Calendar, ArrowLeft, AlertCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useUIStore } from "@/stores/uiStore";

interface GatePass {
  id: string;
  type: "Outing" | "Home Leave" | "Emergency";
  status: "ACTIVE" | "PENDING" | "EXPIRED" | "USED";
  validFrom: string;
  validTill: string;
  reason: string;
  qrCode: string;
}

export default function StudentPassesPage() {
  const { addToast } = useUIStore();
  const [passes, setPasses] = useState<GatePass[]>([
    {
      id: "PASS-2026-001",
      type: "Outing",
      status: "ACTIVE",
      validFrom: "Today, 4:00 PM",
      validTill: "Today, 8:30 PM",
      reason: "Library book research & groceries",
      qrCode: "21001A0501",
    },
    {
      id: "PASS-2026-002",
      type: "Home Leave",
      status: "PENDING",
      validFrom: "Tomorrow, 9:00 AM",
      validTill: "Sun, 7:00 PM",
      reason: "Weekend family visit",
      qrCode: "21001A0501-LEAVE",
    },
    {
      id: "PASS-2025-089",
      type: "Outing",
      status: "USED",
      validFrom: "14 Aug, 3:00 PM",
      validTill: "14 Aug, 8:00 PM",
      reason: "Medical consultation",
      qrCode: "21001A0501-OLD",
    },
  ]);

  const [showNewModal, setShowNewModal] = useState(false);
  const [passType, setPassType] = useState<"Outing" | "Home Leave" | "Emergency">("Outing");
  const [reasonText, setReasonText] = useState("");

  const handleCreatePass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonText.trim()) return;

    const newPass: GatePass = {
      id: `PASS-2026-${Math.floor(100 + Math.random() * 900)}`,
      type: passType,
      status: passType === "Emergency" ? "ACTIVE" : "PENDING",
      validFrom: "Today, Immediate",
      validTill: "Today, 9:00 PM",
      reason: reasonText,
      qrCode: "21001A0501",
    };

    setPasses([newPass, ...passes]);
    setShowNewModal(false);
    setReasonText("");

    addToast({
      title: "Pass Request Submitted",
      message: passType === "Emergency" ? "Emergency pass auto-approved!" : "Request sent to Chief Warden & Supervisor.",
      variant: "success",
    });
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/student" className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Digital Gate Passes
            </h1>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Apply, track and show QR passes at campus security gates
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[var(--action-primary)] text-white font-bold text-xs shadow-md hover:opacity-95 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Apply Outing Pass</span>
        </button>
      </div>

      {/* Pass Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {passes.map((pass) => (
          <div
            key={pass.id}
            className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[var(--action-primary)]/10 text-[var(--action-primary)] border border-[var(--action-primary)]/20">
                  <QrCode className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{pass.type} Pass</h3>
                  <p className="text-[10px] font-mono text-[var(--text-muted)]">{pass.id}</p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${
                  pass.status === "ACTIVE"
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : pass.status === "PENDING"
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                }`}
              >
                {pass.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border)]">
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block">Valid From:</span>
                <span className="font-semibold text-[var(--text-primary)]">{pass.validFrom}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block">Valid Until:</span>
                <span className="font-semibold text-[var(--text-primary)]">{pass.validTill}</span>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              <strong className="text-[var(--text-muted)] font-normal">Purpose: </strong>
              {pass.reason}
            </p>

            {pass.status === "ACTIVE" && (
              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Ready to scan at Gate 1 & 2
                </span>
                <Link
                  href="/student"
                  className="px-3 py-1.5 rounded-lg bg-[var(--action-primary)] text-white text-xs font-bold hover:opacity-95"
                >
                  View QR Badge
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New Pass Application Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Apply Gate Pass</h2>
            <form onSubmit={handleCreatePass} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Pass Category</label>
                <select
                  value={passType}
                  onChange={(e) => setPassType(e.target.value as "Outing" | "Home Leave" | "Emergency")}
                  className="w-full p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs font-semibold"
                >
                  <option value="Outing">Evening Outing (Local)</option>
                  <option value="Home Leave">Weekend Home Leave</option>
                  <option value="Emergency">Emergency Leave</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Reason for Outing / Pass</label>
                <textarea
                  required
                  rows={3}
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="State clear purpose for leaving campus..."
                  className="w-full p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs font-semibold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[var(--action-primary)] text-white font-bold text-xs shadow-md"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
