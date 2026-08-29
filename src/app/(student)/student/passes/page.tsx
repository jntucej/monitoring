"use client";

import { useEffect, useState } from "react";
import { QrCode, Plus, CheckCircle2, Clock, XCircle, ArrowLeft, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { useUIStore } from "@/stores/uiStore";
import type { GatePass } from "@/lib/types";
import { usePassTypes, getPassTypeName } from "@/hooks/usePassTypes";
import { getAuthHeaders } from "@/lib/utils";

export default function StudentPassesPage() {
  const { addToast } = useUIStore();
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const { passTypes, loading: loadingPassTypes } = usePassTypes();
  const [passType, setPassType] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const formatForDatetimeInput = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const getSameDayEveningTime = (fromDate: Date) => {
    const evening = new Date(fromDate);
    evening.setHours(21, 0, 0, 0); // 9:00 PM evening curfew
    if (evening.getTime() <= fromDate.getTime()) {
      evening.setHours(23, 59, 0, 0);
    }
    return evening;
  };

  useEffect(() => {
    if (!fromTime) {
      setFromTime(formatForDatetimeInput(new Date()));
    }
    if (passTypes.length > 0 && !passType) {
      const defaultCode = passTypes[0].code;
      setPassType(defaultCode);
      const baseDate = fromTime ? new Date(fromTime) : new Date();
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

  const handleFromTimeChange = (newFromIsoStr: string) => {
    setFromTime(newFromIsoStr);
    if (passType === "day_pass" && newFromIsoStr) {
      const newFromDate = new Date(newFromIsoStr);
      setToTime(formatForDatetimeInput(getSameDayEveningTime(newFromDate)));
    }
  };

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
      const res = await fetch(`/api/passes?roll=${encodeURIComponent(roll)}`, { 
        headers: getAuthHeaders(),
        cache: "no-store" 
      });
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
      const selectedTypeCode = passType || passTypes[0]?.code || "day_pass";
      const fromIso = fromTime ? new Date(fromTime).toISOString() : new Date().toISOString();
      const toIso = toTime ? new Date(toTime).toISOString() : new Date(Date.now() + 12 * 3600 * 1000).toISOString();

      if (selectedTypeCode === "day_pass") {
        const fDate = new Date(fromIso);
        const tDate = new Date(toIso);
        if (fDate.getFullYear() !== tDate.getFullYear() || fDate.getMonth() !== tDate.getMonth() || fDate.getDate() !== tDate.getDate()) {
          addToast({
            title: "Same-Day Return Required",
            message: "Day Pass requires returning on the same day. Select Home Out for overnight leave.",
            variant: "error",
          });
          setSubmitting(false);
          return;
        }
      }

      const res = await fetch("/api/passes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
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
          <span>Apply Gate Pass</span>
        </button>
      </div>

      <div className="p-3.5 rounded-xl bg-[var(--action-info)]/10 border border-[var(--action-info)]/20 text-xs text-[var(--action-info)] flex items-center gap-2">
        <Sparkles className="w-4 h-4 shrink-0 text-[var(--action-info)]" />
        <span>
          <strong>Daily Outing:</strong> Standard local outings do not require a gate pass. Apply for a pass only when requesting <strong>Day Pass</strong> or <strong>Home Out</strong> leave.
        </span>
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
            You haven't requested any gate passes yet. Tap "Apply Gate Pass" to create one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {passes.map((pass) => {
            const statusStyle = getStatusDisplay(pass.finalStatus || pass.status);
            const passTitle = getPassTypeName(pass.reason);
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
                        {passTitle}
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
                  {pass.description && (
                    <div>
                      <span className="text-[var(--text-muted)] font-semibold">Details: </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {pass.description}
                      </span>
                    </div>
                  )}
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
                  value={passType || passTypes[0]?.code || ""}
                  onChange={(e) => handlePassTypeChange(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)]"
                  disabled={submitting || loadingPassTypes}
                  required
                >
                  {passTypes.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {passType && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-1 italic">
                    {passTypes.find((pt) => pt.code === passType)?.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">From (Departure)</label>
                  <input
                    type="datetime-local"
                    value={fromTime}
                    onChange={(e) => handleFromTimeChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)]"
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">To (Return)</label>
                  <input
                    type="datetime-local"
                    value={toTime}
                    onChange={(e) => setToTime(e.target.value)}
                    max={passType === "day_pass" && fromTime ? `${fromTime.split("T")[0]}T23:59` : undefined}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)]"
                    disabled={submitting}
                    required
                  />
                </div>
              </div>
              {passType === "day_pass" && (
                <p className="text-[10px] text-[var(--action-warning)] font-medium">
                  * Day Pass requires returning on the same calendar day (by curfew/23:59).
                </p>
              )}

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
