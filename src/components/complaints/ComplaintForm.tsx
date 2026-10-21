// src/components/complaints/ComplaintForm.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/utils";

export function ComplaintForm() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    priority: "medium",
    isAnonymous: false,
    girlsCell: false,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/complaints/categories", { headers: getAuthHeaders() });
      const j = await r.json();
      setCategories(j.data?.categories ?? []);
    })();
  }, []);

  const selected = categories.find((c) => c.code === selectedCode);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/complaints", {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ categoryCode: selectedCode, ...form }),
    });
    const j = await r.json();
    setBusy(false);
    if (j.success) router.push(`/student/complaints/${j.data.complaintId}`);
    else alert(j.error?.message ?? "Failed");
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4 p-6 bg-white border rounded shadow-sm">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Complaint Category</label>
        <select
          required
          value={selectedCode}
          onChange={(e) => setSelectedCode(e.target.value)}
          className="w-full border rounded p-2 text-sm"
        >
          <option value="">Select category…</option>
          {categories.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.label}
            </option>
          ))}
        </select>
        {selected && (
          <p className="text-xs text-slate-500 mt-1">
            Will route to: <strong className="font-mono">{selected.ownerRole}</strong> · SLA {selected.slaHours}h
            {selected.isStatutory && " · statutory category"}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
        <input
          required
          placeholder="Brief summary of the issue"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full border rounded p-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea
          required
          rows={5}
          placeholder="Provide detailed information…"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full border rounded p-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Location (optional)</label>
        <input
          placeholder="e.g. Hostel A, Room 204"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          className="w-full border rounded p-2 text-sm"
        />
      </div>

      <div className="space-y-2 pt-2 border-t">
        {selected?.anonymousAllowed && (
          <label className="flex gap-2 items-center text-sm">
            <input
              type="checkbox"
              checked={form.isAnonymous}
              onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
            />
            <span>Submit anonymously</span>
          </label>
        )}
        {selected?.girlsCellEligible && (
          <label className="flex gap-2 items-center text-sm">
            <input
              type="checkbox"
              checked={form.girlsCell}
              onChange={(e) => setForm({ ...form, girlsCell: e.target.checked })}
            />
            <span>Route to Girls Grievance Cell</span>
          </label>
        )}
      </div>

      <button
        type="submit"
        disabled={busy || !selectedCode}
        className="px-4 py-2 rounded bg-slate-900 text-white text-sm font-medium disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Submit complaint"}
      </button>
    </form>
  );
}
