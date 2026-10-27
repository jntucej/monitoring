// src/components/complaints/ComplaintConsole.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/utils";

interface ComplaintItem {
  id: string;
  complaintNumber: string;
  categoryCode: string;
  categoryLabel: string;
  title: string;
  priority: string;
  status: string;
  currentOwnerRole: string;
  slaDeadline: string | null;
  createdAt: string;
  raisedByName: string | null;
}

export function ComplaintConsole({
  role,
  basePath,
  filterStatus,
  title = "Complaints",
}: {
  role: string;
  basePath: string;
  filterStatus?: string;
  title?: string;
}) {
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(filterStatus ?? "");
  const [mine, setMine] = useState(role === "student" ? "true" : "false");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (mine === "true") params.set("mine", "true");
    const r = await fetch(`/api/complaints?${params.toString()}`, { headers: getAuthHeaders() });
    const j = await r.json();
    setComplaints(j.data?.complaints ?? []);
    setLoading(false);
  }, [status, mine]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {role === "student" && (
          <Link href="/student/complaints/new" className="px-4 py-2 rounded bg-slate-900 text-white text-sm">
            Raise complaint
          </Link>
        )}
      </div>

      <div className="flex gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded p-2 text-sm">
          <option value="">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        {role !== "student" && (
          <select value={mine} onChange={(e) => setMine(e.target.value)} className="border rounded p-2 text-sm">
            <option value="false">Queue ({role})</option>
            <option value="true">My filings</option>
          </select>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : complaints.length === 0 ? (
        <p className="text-sm text-slate-500">No complaints found.</p>
      ) : (
        <div className="border rounded divide-y bg-white">
          {complaints.map((c) => (
            <Link key={c.id} href={`${basePath}/${c.id}`} className="block p-4 hover:bg-slate-50 transition">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs text-slate-500">{c.complaintNumber}</span>
                  <h2 className="font-medium text-slate-900">{c.title}</h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {c.categoryLabel} · Owner: <span className="font-mono">{c.currentOwnerRole}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium uppercase bg-slate-100 text-slate-800">
                    {c.status}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">{new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
