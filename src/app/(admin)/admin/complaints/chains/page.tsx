"use client";
// src/app/(admin)/admin/complaints/chains/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";

export default function ChainsPage() {
  const [rows, setRows] = useState<any[]>([]);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/complaint-categories", { headers: getAuthHeaders() });
    const j = await r.json();
    setRows(j.data?.categories ?? []);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Complaint escalation chains</h1>
      <p className="text-sm text-slate-600">
        Chains are seeded via migration. To modify, edit <code className="px-1 bg-slate-100 rounded">complaint_escalation_chains</code> directly.
      </p>
      <div className="border rounded bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b bg-slate-50">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Label</th>
              <th className="p-3">Primary Owner</th>
              <th className="p-3">SLA (h)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((c) => (
              <tr key={c.code} className="hover:bg-slate-50">
                <td className="p-3 font-mono">{c.code}</td>
                <td className="p-3 font-medium">{c.label}</td>
                <td className="p-3 font-mono text-slate-600">{c.ownerRole}</td>
                <td className="p-3">{c.slaHours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
