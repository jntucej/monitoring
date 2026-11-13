"use client";

/* S8: PassCreateForm — the "Apply Gate Pass" modal form.
   Lives in its own file so the passes page stays a thin orchestrator. */

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { usePassTypes } from "@/hooks/usePassTypes";
import { useApi } from "@/hooks/useApi";
import { useAuthStore } from "@/stores/authStore";

export interface PassCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const formatForDatetimeInput = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getSameDayEveningTime = (fromDate: Date) => {
  const evening = new Date(fromDate);
  evening.setHours(21, 0, 0, 0);
  if (evening.getTime() <= fromDate.getTime()) {
    evening.setHours(23, 59, 0, 0);
  }
  return evening;
};

export function PassCreateForm({ isOpen, onClose, onCreated }: PassCreateFormProps) {
  if (!isOpen) return null;

  return <PassCreateFormInner onClose={onClose} onCreated={onCreated} />;
}

function PassCreateFormInner({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const api = useApi();
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
    const auth = useAuthStore.getState();
    return auth?.user?.uniqueId ?? null;
  };

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonText.trim()) return;

    setSubmitting(true);
    try {
      const roll = getStudentRoll();
      if (!roll) {
        addToast({ title: "Session Error", message: "No student roll number found. Please log in again.", variant: "error" });
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
          addToast({ title: "Same-Day Return Required", message: "Day Pass requires returning on the same day. Select Home Out for overnight leave.", variant: "error" });
          setSubmitting(false);
          return;
        }
      }

      const res = await fetch("/api/passes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...api.getHeaders() },
        body: JSON.stringify({ roll, reason: selectedTypeCode, from: fromIso, to: toIso, description: reasonText }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        addToast({ title: "Pass Request Submitted", message: "Pass request sent for Warden approval.", variant: "success" });
        onClose();
        onCreated();
      } else {
        addToast({ title: "Submission Failed", message: json.error?.message || "Failed to submit request.", variant: "error" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit request.";
      addToast({ title: "Error occurred", message: msg, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-bg-surface border border-border rounded-3xl p-6 space-y-4 shadow-2xl">
        <h2 className="text-lg font-bold text-text-primary">Apply Gate Pass</h2>
        <form onSubmit={handleCreatePass} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary" htmlFor="pass-category">Pass Category</label>
            <select id="pass-category"
              value={passType || passTypes[0]?.code || ""}
              onChange={(e) => handlePassTypeChange(e.target.value)}
              className="w-full p-3 rounded-xl bg-bg-base border border-border text-xs font-semibold text-text-primary"
              disabled={submitting || loadingPassTypes}
              required
            >
              {passTypes.map((t) => (
                <option key={t.code} value={t.code}>{t.name}</option>
              ))}
            </select>
            {passType && (
              <p className="text-[11px] text-text-muted mt-1 italic">
                {passTypes.find((pt) => pt.code === passType)?.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary" htmlFor="from-departure">From (Departure)</label>
              <input id="from-departure"
                type="datetime-local"
                value={fromTime}
                onChange={(e) => handleFromTimeChange(e.target.value)}
                className="w-full min-h-[44px] p-2.5 rounded-xl bg-bg-base border border-border text-xs font-semibold text-text-primary"
                disabled={submitting}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary" htmlFor="to-return">To (Return)</label>
              <input id="to-return"
                type="datetime-local"
                value={toTime}
                onChange={(e) => setToTime(e.target.value)}
                max={passType === "day_pass" && fromTime ? `${fromTime.split("T")[0]}T23:59` : undefined}
                className="w-full min-h-[44px] p-2.5 rounded-xl bg-bg-base border border-border text-xs font-semibold text-text-primary"
                disabled={submitting}
                required
              />
            </div>
          </div>
          {passType === "day_pass" && (
            <p className="text-[10px] text-action-warning font-medium">
              * Day Pass requires returning on the same calendar day (by curfew/23:59).
            </p>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary" htmlFor="reason-for-outing-pass">Reason for Outing / Pass</label>
            <textarea id="reason-for-outing-pass"
              required
              rows={3}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="State clear purpose for leaving campus..."
              className="w-full p-3 rounded-xl bg-bg-base border border-border text-xs font-semibold"
              disabled={submitting}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-bg-elevated border border-border text-xs font-semibold"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-action-primary text-white font-bold text-xs shadow-md flex items-center justify-center gap-1"
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
