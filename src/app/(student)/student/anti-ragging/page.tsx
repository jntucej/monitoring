"use client";
// src/app/(student)/student/anti-ragging/page.tsx
"use client";

import { useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

export default function AntiRaggingPage() {
  const [form, setForm] = useState({
    isAnonymous: true,
    category: "ragging",
    severity: "high",
    narrative: "",
    location: "",
    occurredAt: "",
    accusedInfo: "",
    witnessInfo: "",
  });
  const [busy, setBusy] = useState(false);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/anti-ragging/report", {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await r.json();
    setBusy(false);
    if (j.success) {
      setCaseNumber(j.data.caseNumber);
      addToast({ variant: "success", message: "Case filed successfully" });
    } else {
      addToast({ variant: "error", message: j.error?.message ?? "Failed" });
    }
  };

  if (caseNumber) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-4 bg-white border rounded shadow-sm mt-8">
        <h1 className="text-2xl font-semibold text-emerald-700">Case filed successfully</h1>
        <p className="text-sm">
          Your confidential case number is <strong className="font-mono">{caseNumber}</strong>.
        </p>
        <p className="text-sm text-slate-600">
          Only the Principal&apos;s office will see this report. You may be contacted via the secure channels you provided.
        </p>
        <div className="pt-4 border-t space-y-2">
          <p className="text-sm font-medium">Helpline references:</p>
          <ul className="text-sm list-disc pl-5 text-slate-700 space-y-1">
            <li>UGC Anti-Ragging Helpline: 1800-180-5522</li>
            <li>AICTE Anti-Ragging: 1800-425-2248</li>
            <li>Campus Security Desk: 24/7 Helpline</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-2xl mx-auto p-6 space-y-4 bg-white border rounded shadow-sm mt-8">
      <div>
        <h1 className="text-2xl font-semibold text-rose-600">Anti-Ragging / Harassment Report</h1>
        <p className="text-sm text-slate-600 mt-1">
          This is a confidential, restricted channel. Only the Principal&apos;s office will see this filing.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="category">Category</label>
        <select id="category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full border rounded p-2 text-sm"
        >
          <option value="ragging">Ragging</option>
          <option value="harassment">Harassment</option>
          <option value="bullying">Bullying</option>
          <option value="sexual_harassment">Sexual harassment</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="narrative">Narrative</label>
        <textarea id="narrative"
          required
          rows={6}
          placeholder="Describe what happened in detail…"
          value={form.narrative}
          onChange={(e) => setForm({ ...form, narrative: e.target.value })}
          className="w-full border rounded p-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="location-optional">Location (optional)</label>
        <input id="location-optional"
          placeholder="e.g. Hostel B Mess, Corridor 2"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          className="w-full border rounded p-2 text-sm"
        />
      </div>

      <button type="submit" disabled={busy} className="px-4 py-2 bg-rose-600 text-white rounded text-sm font-medium disabled:opacity-50">
        {busy ? "Filing confidential report..." : "Submit Confidential Report"}
      </button>
    </form>
  );
}
