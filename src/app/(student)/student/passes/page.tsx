"use client";

import { useEffect, useState } from "react";
import { QrCode, Plus, CheckCircle2, Clock, XCircle, ArrowLeft, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { useUIStore } from "@/stores/uiStore";
import type { GatePass } from "@/lib/types";
import { usePassTypes } from "@/hooks/usePassTypes";

export default function StudentPassesPage() {
  const { addToast } = useUIStore();
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const { passTypes, loading: loadingPassTypes } = usePassTypes();
  const [passType, setPassType] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getStudentRoll = (): string | null => {
    if (typeof window === "undefined") return null;
    const authRaw = localStorage.getItem("gate-monitor-auth");
    if (!authRaw) return null;
    try {
      const auth = JSON.parse(authRaw);
      return auth?.state?.user?.uniqueId ?? auth?.state?.user?.roll ?? auth?.state?.user?.studentRoll ?? auth?.user?.uniqueId ?? auth?.user?.roll ?? auth?.user?.studentRoll ?? null;
    } catch {
      return null;
    }
  };

  const loadPasses = async () => {
    try {
      setLoading(true);
      const roll = getStudentRoll();
      if (!roll) {
        setPasses([]);
        return;
      }
      const res = await fetch(`/api/passes?roll=${encodeURIComponent(roll)}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPasses(json.data);
      } else {
        setPasses([]);
      }
    } catch (e) {
      console.error(e);
      setPasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPasses();
  }, []);

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonText.trim()) return;

    setSubmitting(true);
    try {
      const roll = getStudentRoll();
      if (!roll) {
        addToast({
          title: "Session Error",
          message: "No student roll number found. Please log in again.",
          variant: "error",
        });
        setSubmitting(false);
        return;
      }
      const selectedType = passTypes.find((pt) => pt.code === passType);
      const durationHours = selectedType?.defaultDurationHours || 4;

      const res = await fetch("/api/passes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roll,
          reason: passType,
          from: new Date().toISOString(),
          to: new Date(Date.now() + durationHours * 3600 * 1000).toISOString(),
          description: reasonText,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        addToast({
          title: "Pass Request Submitted",
          message: "Pass request sent for Warden approval.",
          variant: "success",
        });
        setShowNewModal(false);
        setReasonText("");
        loadPasses();
      } else {
        addToast({
          title: "Submission Failed",
          message: json.error?.message || "Failed to submit request.",
          variant: "error",
        });
      }
    } catch (err: any) {
      addToast({
        title: "Error occurred",
        message: err.message || "Failed to submit request.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "APPROVED":
      case "COMPLETED":
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
          bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
          text: "Approved",
        };
      case "REJECTED":
        return {
          icon: <XCircle className="w-5 h-5 text-rose-400" />,
          bg: "bg-rose-500/10 border-rose-500/20 text-rose-300",
          text: "Rejected",
        };
      case "PENDING":
      default:
        return {
          icon: <Clock className="w-5 h-5 text-amber-400" />,
          bg: "bg-amber-500/10 border-amber-500/20 text-amber-300",
          text: "Pending Approval",
        };
    }
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

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[var(--action-primary)] animate-spin" />
        </div>
      ) : passes.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-12 text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-[var(--text-muted)] mx-auto" />
          <h3 className="text-base font-bold text-[var(--text-primary)]">No passes found</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            You haven't requested any gate passes yet. Tap "Apply Outing Pass" to create one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {passes.map((pass) => {
            const statusStyle = getStatusDisplay(pass.finalStatus || pass.status);
            return (
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
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        {pass.reason?.split(":")[0] || "Outing"} Pass
                      </h3>
                      <p className="text-[10px] font-mono text-[var(--text-muted)]">{pass.id}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${statusStyle.bg}`}>
                    {statusStyle.icon}
                    {statusStyle.text}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] font-semibold">Valid Period: </span>
                    <span className="font-medium text-[var(--text-secondary)]">
                      {new Date(pass.from).toLocaleString([], { dateStyle: "short", timeStyle: "short" })} to{" "}
                      {new Date(pass.to).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] font-semibold">Reason: </span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {pass.reason?.split(":").slice(1).join(":")?.trim() || pass.reason || pass.description || "N/A"}
                    </span>
                  </div>
                </div>

                {(pass.status === "ACTIVE" || pass.finalStatus === "APPROVED") && (
                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Ready to scan at campus gates
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
            );
          })}
        </div>
      )}

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
                  onChange={(e) => setPassType(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs font-semibold select-none"
                  disabled={submitting || loadingPassTypes}
                  required
                >
                  <option value="" disabled>Select pass type</option>
                  {passTypes.map((t) => (
                    <option key={t.code} value={t.code}>{t.name} ({t.description})</option>
                  ))}
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
                  disabled={submitting}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-semibold"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[var(--action-primary)] text-white font-bold text-xs shadow-md flex items-center justify-center gap-1"
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
