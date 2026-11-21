"use client";
// src/components/complaints/ComplaintForm.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/utils";
import { useIsSakuga } from "@/components/student/useIsSakuga";

export function ComplaintForm() {
  const router = useRouter();
  const isSakuga = useIsSakuga();
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    priority: "medium",
    isAnonymous: false,
    girlsCell: false,
    respondentDetails: "",
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
    <form onSubmit={submit} className="surface-card max-w-2xl space-y-4 p-6 bg-white">
      <div>
        <label className="block text-sm font-medium text-text-muted mb-1" htmlFor="complaint-category">Complaint Category</label>
        <select id="complaint-category"
          required
          value={selectedCode}
          onChange={(e) => setSelectedCode(e.target.value)}
          className="surface-card w-full p-2 text-sm"
        >
          <option value="">Select category…</option>
          {categories.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.label}
            </option>
          ))}
        </select>
        {selected && (
          <p className="text-xs text-text-muted mt-1">
            Will route to: <strong className="font-mono">{selected.ownerRole}</strong> · SLA {selected.slaHours}h
            {selected.isStatutory && " · statutory category"}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-muted mb-1" htmlFor="title">Title</label>
        {isSakuga ? (
          <sakuga-input
            id="title"
            required
            placeholder="Brief summary of the issue"
            value={form.title}
            onChange={((e: unknown) => setForm({ ...form, title: (e as any).target?.value ?? '' })) as any}
            label="complaint title"
            className="w-full"
          />
        ) : (
          <input id="title"
            required
            placeholder="Brief summary of the issue"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="surface-card w-full p-2 text-sm"
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-muted mb-1" htmlFor="description">Description</label>
        <textarea id="description"
          required
          rows={5}
          placeholder="Provide detailed information…"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="surface-card w-full p-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-muted mb-1" htmlFor="location-optional">Location (optional)</label>
        <input id="location-optional"
          placeholder="e.g. Hostel A, Room 204"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          className="surface-card w-full p-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-muted mb-1" htmlFor="respondent-optional">
          This complaint is about (optional)
        </label>
        <input id="respondent-optional"
          placeholder="Who it concerns — a roll / employee ID, or details identifying the person (e.g. 'Physics faculty, Dr. X, office 204')"
          value={form.respondentDetails}
          onChange={(e) => setForm({ ...form, respondentDetails: e.target.value })}
          className="surface-card w-full p-2 text-sm"
        />
        <p className="mt-1 text-xs text-text-muted">
          Leave blank if the complaint is not about a specific person. Details you provide are
          shared with the reviewing authority only.
        </p>
      </div>

      <div className="surface-card space-y-2 pt-2">
        {selected?.anonymousAllowed && (
          isSakuga ? (
            <div className="flex gap-2 items-center text-sm">
              <sakuga-checkbox
                checked={form.isAnonymous}
                onChange={((e: unknown) => setForm({ ...form, isAnonymous: Boolean((e as any).target?.checked ?? (e as any)) })) as any}
                label="anonymous"
              >
                Submit anonymously
              </sakuga-checkbox>
            </div>
          ) : (
            <label className="flex gap-2 items-center text-sm">
              <input
                type="checkbox"
                checked={form.isAnonymous}
                onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
              />
              <span>Submit anonymously</span>
            </label>
          )
        )}
        {selected?.girlsCellEligible && (
          isSakuga ? (
            <div className="flex gap-2 items-center text-sm">
              <sakuga-checkbox
                checked={form.girlsCell}
                onChange={((e: unknown) => setForm({ ...form, girlsCell: Boolean((e as any).target?.checked ?? (e as any)) })) as any}
                label="girls-cell"
              >
                Route to Girls Grievance Cell
              </sakuga-checkbox>
            </div>
          ) : (
            <label className="flex gap-2 items-center text-sm">
              <input
                type="checkbox"
                checked={form.girlsCell}
                onChange={(e) => setForm({ ...form, girlsCell: e.target.checked })}
              />
              <span>Route to Girls Grievance Cell</span>
            </label>
          )
        )}
      </div>

      {isSakuga ? (
        <div className="flex justify-center">
          <sakuga-button
            type="submit"
            disabled={busy || !selectedCode}
            variant="primary"
            label={busy ? "Submitting…" : "Submit complaint"}
          >
            {busy ? "Submitting…" : "Submit complaint"}
          </sakuga-button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={busy || !selectedCode}
          className="surface-card px-4 py-2 bg-bg-surface text-white text-sm font-medium disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Submit complaint"}
        </button>
      )}
    </form>
  );
}
