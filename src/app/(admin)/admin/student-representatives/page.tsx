"use client";
// src/app/(admin)/admin/student-representatives/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";

export default function RepsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const addToast = useUIStore((s) => s.addToast);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [form, setForm] = useState({
    studentId: "",
    scopeType: "class",
    scopeId: "",
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: new Date(Date.now() + 180 * 86_400_000).toISOString().slice(0, 10),
  });

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/student-representatives", { headers: getAuthHeaders() });
    const j = await r.json();
    setRows(j.data?.representatives ?? []);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/admin/student-representatives", {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await r.json();
    if (j.success) {
      setForm({ ...form, studentId: "", scopeId: "" });
      await load();
      addToast({ variant: "success", message: "Representative appointed successfully" });
    } else {
      addToast({ variant: "error", message: j.error?.message ?? "Failed" });
    }
  };

  const revoke = async (id: string) => {
    setRevokeId(null);
    await fetch(`/api/admin/student-representatives/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    await load();
    addToast({ variant: "success", message: "Representative revoked" });
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-semibold">Student representatives</h1>

      <form onSubmit={create} className="grid grid-cols-2 gap-3 border p-4 rounded bg-white shadow-sm">
        <input
          required
          placeholder="Student UUID"
          value={form.studentId}
          onChange={(e) => setForm({ ...form, studentId: e.target.value })}
          className="border rounded p-2 text-sm"
        />
        <select
          value={form.scopeType}
          onChange={(e) => setForm({ ...form, scopeType: e.target.value })}
          className="border rounded p-2 text-sm"
        >
          <option value="class">Class</option>
          <option value="department">Department</option>
          <option value="block">Block</option>
          <option value="hostel">Hostel</option>
          <option value="mess">Mess</option>
          <option value="girls">Girls</option>
        </select>
        <input
          required
          placeholder="Scope ID (e.g. CSE-3-A, BlockA)"
          value={form.scopeId}
          onChange={(e) => setForm({ ...form, scopeId: e.target.value })}
          className="border rounded p-2 text-sm"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={form.validFrom}
            onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
            className="border rounded p-2 text-sm flex-1"
          />
          <input
            type="date"
            required
            value={form.validTo}
            onChange={(e) => setForm({ ...form, validTo: e.target.value })}
            className="border rounded p-2 text-sm flex-1"
          />
        </div>
        <button type="submit" className="px-4 py-2 rounded bg-slate-900 text-white text-sm col-span-2 font-medium">
          Appoint representative
        </button>
      </form>

      <div className="border rounded bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b bg-slate-50">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Roll</th>
              <th className="p-3">Scope</th>
              <th className="p-3">Until</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="p-3 font-medium">{r.studentName}</td>
                <td className="p-3 font-mono">{r.studentRoll}</td>
                <td className="p-3">{r.scopeType}:{r.scopeId}</td>
                <td className="p-3">{r.validTo}</td>
                <td className="p-3 uppercase text-xs font-mono">{r.status}</td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => setRevokeId(r.id)}
                    className="text-xs text-rose-600 hover:underline font-medium"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">No student representatives appointed.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={revokeId !== null}
        onClose={() => setRevokeId(null)}
        title="Revoke representative?"
        body="This representative will immediately lose their scope authority. This action is audited."
        confirmText="Revoke"
        variant="destructive"
        onConfirm={() => { void revoke(revokeId ?? ""); }}
      />
    </div>
  );
}
