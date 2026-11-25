"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

interface MessBillData {
  totalServed?: number;
  totalAmount?: number;
  mealRate?: number;
  cutoffTime?: string;
}

export default function MessBillPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<MessBillData | null>(null);
  const [optOutDate, setOptOutDate] = useState("");
  const [optOutType, setOptOutType] = useState("LUNCH");
  const [optOutReason, setOptOutReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optOutStatus, setOptOutStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/student/mess-bill?month=${month}`, { headers: getAuthHeaders() });
      const j = await r.json();
      setData(j.data);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const submitOptOut = async () => {
    if (isSubmitting || !optOutDate) return;
    setIsSubmitting(true);
    setOptOutStatus(null);
    try {
      const r = await fetch("/api/student/meal-opt-out", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ mealDate: optOutDate, mealType: optOutType, reason: optOutReason }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.success) {
        setOptOutStatus({
          ok: true,
          text: `Opted out of ${optOutType.toLowerCase()} on ${optOutDate}. Your monthly bill has been updated.`,
        });
        setOptOutDate("");
        setOptOutReason("");
        await load();
      } else {
        const msg = j.error?.message ?? "Failed to opt out";
        const isCutoff = /cutoff|deadline|past|closed/i.test(msg);
        setOptOutStatus({
          ok: false,
          text: isCutoff
            ? `${msg} (Opt-outs must be submitted before ${data?.cutoffTime ?? "the daily cutoff"}).`
            : msg,
        });
      }
    } catch {
      setOptOutStatus({
        ok: false,
        text: "Network error while submitting meal opt-out. Please retry.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const optOut = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitOptOut();
  };











  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl font-semibold">Mess Bill & Meal Opt-Outs</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="surface-card min-h-11 p-2 text-sm"
        />
      </div>

      <ContextSituationBar
        roleLabel="Hosteller"
        purpose="Track monthly dining costs, meal count, and submit timely meal opt-outs before cutoffs"
        contextLabel="Mess Billing & Opt-Outs"
        severity="info"
        statusPill={data ? `₹${data.totalAmount ?? 0} billed` : "Loading bill…"}
        statusSummary={
          data
            ? `${data.totalServed ?? 0} meals served this month at ₹${data.mealRate ?? 0}/meal. Opt out before ${data.cutoffTime ?? "cutoff"} to avoid billing.`
            : "Reviewing your monthly dining consumption, rates, and opt-out cutoffs."
        }
        why="Opting out before the daily cutoff credits your mess balance and prevents the mess team from billing unconsumed meals."
        primaryAction={{ label: "Meal Token", href: "/student/mess/token" }}
        secondaryAction={{ label: "Mess Landing", href: "/student/mess" }}
      />

      {loading ? (
        <p className="text-text-muted text-sm">Loading bill details…</p>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="surface-card p-4 space-y-1">
            <span className="text-xs font-medium uppercase text-text-muted">Meals Served</span>
            <p className="text-2xl font-bold text-text-primary">{data.totalServed}</p>
          </div>
          <div className="surface-card p-4 space-y-1">
            <span className="text-xs font-medium uppercase text-text-muted">Total Amount</span>
            <p className="text-2xl font-bold text-action-success">₹{data.totalAmount}</p>
            <p className="text-xs text-text-muted">@ ₹{data.mealRate} per meal</p>
          </div>
          <div className="surface-card p-4 space-y-1">
            <span className="text-xs font-medium uppercase text-text-muted">Daily Cutoff</span>
            <p className="text-sm font-medium text-text-primary mt-1">{data.cutoffTime}</p>
            <p className="text-xs text-text-muted">Opt out before cutoff to skip billing.</p>
          </div>
        </div>
      ) : null}

      <div className="surface-card p-6 space-y-4">
        <h2 className="font-semibold text-text-primary">Opt out of a upcoming meal</h2>
        <form onSubmit={optOut} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="date">Date</label>
            <input id="date"
              type="date"
              required
              value={optOutDate}
              onChange={(e) => setOptOutDate(e.target.value)}
              className="surface-card w-full min-h-11 p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="meal">Meal</label>
            <select id="meal"
              value={optOutType}
              onChange={(e) => setOptOutType(e.target.value)}
              className="surface-card w-full min-h-11 p-2 text-sm"
            >
              <option value="BREAKFAST">Breakfast</option>
              <option value="LUNCH">Lunch</option>
              <option value="DINNER">Dinner</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="reason-optional">Reason (optional)</label>
            <input id="reason-optional"
              placeholder="e.g. Going home"
              value={optOutReason}
              onChange={(e) => setOptOutReason(e.target.value)}
              className="surface-card w-full min-h-11 p-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="surface-card w-full min-h-11 inline-flex items-center justify-center px-4 py-2 bg-action-primary text-white text-sm font-medium disabled:opacity-50"
          >
            {isSubmitting ? "Submitting…" : "Confirm opt-out"}
          </button>
        </form>
        {optOutStatus && (
          <div
            role="alert"
            aria-live="polite"
            className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
              optOutStatus.ok
                ? "bg-emerald-500/10 text-action-success"
                : "bg-rose-500/10 text-action-danger"
            }`}
          >
            <span>{optOutStatus.text}</span>
            {!optOutStatus.ok && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void submitOptOut()}
                className="underline font-semibold disabled:opacity-50"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
