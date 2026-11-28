"use client";

import { useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { clearCache } from "@/hooks/useApiResource";
import { AlertCircle, Send, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface FeeDisputeComposerProps {
  onSuccess?: () => void;
  feeItems?: Array<{ id: string; feeType: string; amount: number }>;
}

export function FeeDisputeComposer({
  onSuccess,
  feeItems = [],
}: FeeDisputeComposerProps) {
  const { addToast } = useUIStore();
  const [open, setOpen] = useState(false);
  const [feeType, setFeeType] = useState(feeItems[0]?.feeType || "Tuition Fee");
  const [amountDisputed, setAmountDisputed] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      addToast({
        variant: "warning",
        title: "Description required",
        message: "Please describe the fee discrepancy or challan issue.",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Route via universal grievance complaint engine
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryCode: "ADMIN_OFFICE",
          title: `Fee Dispute: ${feeType}`,
          description: `Disputed Amount: ${amountDisputed ? "₹" + amountDisputed : "Full"}\nDetails: ${description.trim()}`,
          priority: "high",
        }),
      });

      const body = await res.json().catch(() => null);
      if (res.ok && body?.success) {
        addToast({
          variant: "success",
          title: "Fee dispute ticket lodged",
          message: "Your inquiry has been routed to the Accounts & Finance Office.",
        });
        clearCache("/api/student/fees");
        clearCache("/api/student/dashboard");
        setAmountDisputed("");
        setDescription("");
        setOpen(false);
        onSuccess?.();
      } else {
        addToast({
          variant: "error",
          title: "Dispute failed",
          message: body?.error?.message ?? "Unable to log fee dispute.",
        });
      }
    } catch {
      addToast({
        variant: "error",
        title: "Network error",
        message: "Could not submit fee dispute. Please try again later.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="surface-card bg-bg-surface rounded-xl border border-border p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-action-primary" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Fee &amp; Payment Dispute Composer
            </h3>
            <p className="text-xs text-text-muted">
              Report incorrect challans, uncredited bank transfers, or scholarship deductions.
            </p>
          </div>
        </div>
        <span className="p-1 rounded-md text-text-muted hover:bg-bg-elevated transition-colors">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Fee Category *
              </label>
              <select
                value={feeType}
                onChange={(e) => setFeeType(e.target.value)}
                className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-action-primary"
              >
                <option value="Tuition Fee">Tuition Fee</option>
                <option value="Hostel & Mess Fee">Hostel &amp; Mess Fee</option>
                <option value="Examination Fee">Examination Fee</option>
                <option value="Laboratory / Library Deposit">Laboratory / Library Deposit</option>
                <option value="Other Dues">Other Dues</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Amount in Dispute (₹) (Optional)
              </label>
              <input
                type="number"
                placeholder="e.g. 15000"
                value={amountDisputed}
                onChange={(e) => setAmountDisputed(e.target.value)}
                className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Dispute Explanation / Bank UTR Reference *
            </label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Paid ₹45,000 via NEFT on 12-Nov with UTR #SBIN12345678, but portal still reflects pending status."
              className="surface-card w-full bg-bg-base px-3 py-2 text-xs text-text-primary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-action-primary resize-none"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-action-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50 transition-opacity"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Lodge Fee Dispute
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default FeeDisputeComposer;
