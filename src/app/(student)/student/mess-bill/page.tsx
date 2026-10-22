// src/app/(student)/student/mess-bill/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";

export default function MessBillPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<any>(null);
  const [optOutDate, setOptOutDate] = useState("");
  const [optOutType, setOptOutType] = useState("LUNCH");
  const [optOutReason, setOptOutReason] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/student/mess-bill?month=${month}`, { headers: getAuthHeaders() });
    const j = await r.json();
    setData(j.data);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const optOut = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/student/meal-opt-out", {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ mealDate: optOutDate, mealType: optOutType, reason: optOutReason }),
    });
    const j = await r.json();
    if (j.success) {
      setOptOutDate("");
      setOptOutReason("");
      await load();
    } else {
      alert(j.error?.message ?? "Failed to opt out");
    }
  };

  const cancelOptOut = async (id: string) => {
    const r = await fetch(`/api/student/meal-opt-out/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const j = await r.json();
    if (j.success) await load();
    else alert(j.error?.message ?? "Failed to cancel opt-out");
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Mess Bill & Meal Opt-Outs</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border rounded p-2 text-sm bg-white"
        />
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading bill details…</p>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded bg-white shadow-sm space-y-1">
            <span className="text-xs font-medium uppercase text-slate-500">Meals Served</span>
            <p className="text-2xl font-bold text-slate-900">{data.totalServed}</p>
          </div>
          <div className="p-4 border rounded bg-white shadow-sm space-y-1">
            <span className="text-xs font-medium uppercase text-slate-500">Total Amount</span>
            <p className="text-2xl font-bold text-emerald-600">₹{data.totalAmount}</p>
            <p className="text-xs text-slate-500">@ ₹{data.mealRate} per meal</p>
          </div>
          <div className="p-4 border rounded bg-white shadow-sm space-y-1">
            <span className="text-xs font-medium uppercase text-slate-500">Daily Cutoff</span>
            <p className="text-sm font-medium text-slate-900 mt-1">{data.cutoffTime}</p>
            <p className="text-xs text-slate-500">Opt out before cutoff to skip billing.</p>
          </div>
        </div>
      ) : null}

      <div className="border rounded bg-white p-6 space-y-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Opt out of a upcoming meal</h2>
        <form onSubmit={optOut} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={optOutDate}
              onChange={(e) => setOptOutDate(e.target.value)}
              className="w-full border rounded p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Meal</label>
            <select
              value={optOutType}
              onChange={(e) => setOptOutType(e.target.value)}
              className="w-full border rounded p-2 text-sm bg-white"
            >
              <option value="BREAKFAST">Breakfast</option>
              <option value="LUNCH">Lunch</option>
              <option value="DINNER">Dinner</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Reason (optional)</label>
            <input
              placeholder="e.g. Going home"
              value={optOutReason}
              onChange={(e) => setOptOutReason(e.target.value)}
              className="w-full border rounded p-2 text-sm"
            />
          </div>
          <button type="submit" className="px-4 py-2 rounded bg-slate-900 text-white text-sm font-medium">
            Confirm opt-out
          </button>
        </form>
      </div>
    </div>
  );
}
