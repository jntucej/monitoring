// src/app/api/admin/complaints/categories/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";

export default function CategoriesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/complaint-categories", { headers: getAuthHeaders() });
    const j = await r.json();
    setRows(j.data?.categories ?? []);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const patch = async (code: string, field: string, value: unknown) => {
    setSaving(code);
    await fetch(`/api/admin/complaint-categories/${code}`, {
      method: "PATCH",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setSaving(null);
    await load();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Complaint categories</h1>
      <div className="border rounded bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b bg-slate-50">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Label</th>
              <th className="p-3">Owner</th>
              <th className="p-3">SLA (h)</th>
              <th className="p-3">Anon</th>
              <th className="p-3">Girls Cell</th>
              <th className="p-3">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((c) => (
              <tr key={c.code} className="hover:bg-slate-50">
                <td className="p-3 font-mono">{c.code}</td>
                <td className="p-3 font-medium">{c.label}</td>
                <td className="p-3 text-slate-500 font-mono">{c.ownerRole}</td>
                <td className="p-3">
                  <input
                    type="number"
                    defaultValue={c.slaHours}
                    disabled={saving === c.code}
                    onBlur={(e) => patch(c.code, "slaHours", Number(e.target.value))}
                    className="w-20 border rounded p-1 text-sm"
                  />
                </td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={c.anonymousAllowed}
                    disabled={saving === c.code}
                    onChange={(e) => patch(c.code, "anonymousAllowed", e.target.checked)}
                  />
                </td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={c.girlsCellEligible}
                    disabled={saving === c.code}
                    onChange={(e) => patch(c.code, "girlsCellEligible", e.target.checked)}
                  />
                </td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={c.isActive}
                    disabled={saving === c.code}
                    onChange={(e) => patch(c.code, "isActive", e.target.checked)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
