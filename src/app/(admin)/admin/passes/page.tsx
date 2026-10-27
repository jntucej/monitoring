"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileBadge, Search, CheckCircle2, XCircle, Clock, QrCode,
} from "lucide-react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";

interface PassRow {
  id: string;
  type: string;
  status: string;
  roll: string | null;
  name: string | null;
  reason: string | null;
  createdAt: string | null;
  expiresAt: string | null;
}

async function fetchPasses(): Promise<PassRow[]> {
  const res = await fetch("/api/passes?limit=200", { headers: getAuthHeaders() });
  const body = await res.json();
  const raw = (body?.data ?? body ?? []) as any[];
  return raw.map((p) => ({
    id: p.id,
    type: p.type ?? p.passType ?? "UNKNOWN",
    status: p.finalStatus ?? p.status ?? "UNKNOWN",
    roll: p.roll ?? p.studentRoll ?? null,
    name: p.studentName ?? p.name ?? null,
    reason: p.reason ?? null,
    createdAt: p.createdAt ?? p.created_at ?? null,
    expiresAt: p.expiresAt ?? p.expiry ?? null,
  }));
}

function statusBadge(s: string) {
  const c = s.toUpperCase();
  if (c === "APPROVED" || c === "ACTIVE" || c === "GRANTED")
    return "bg-emerald-500/10 text-emerald-400";
  if (c === "PENDING" || c === "REQUESTED") return "bg-amber-500/10 text-amber-400";
  if (c === "REJECTED" || c === "DENIED" || c === "EXPIRED")
    return "bg-rose-500/10 text-rose-400";
  return "bg-slate-500/10 text-slate-400";
}

/**
 * Admin Passes — gate pass list + bulk status.
 * Backend: /api/passes (admin|sysadmin|operator|... scope).
 */
function AdminPassesInner() {
  const [rows, setRows] = useState<PassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchPasses()); }
    catch (e) { console.error("passes", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = query.trim()
    ? rows.filter((r) =>
        `${r.roll} ${r.name} ${r.type} ${r.status}`.toLowerCase().includes(query.toLowerCase()))
    : rows;

  const pending = rows.filter((r) => r.status.toUpperCase() === "PENDING" || r.status.toUpperCase() === "REQUESTED").length;
  const active = rows.filter((r) => ["APPROVED", "ACTIVE", "GRANTED"].includes(r.status.toUpperCase())).length;

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Gate Passes"
        subtitle="Outing, day-pass, and home-out pass records"
        onRefresh={load}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5"><QrCode className="w-3.5 h-3.5" /> Total</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{rows.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-400" /> Pending</p>
          <p className="text-2xl font-bold text-amber-400 tabular-nums">{pending}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Active</p>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums">{active}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-rose-400" /> Closed</p>
          <p className="text-2xl font-bold text-rose-400 tabular-nums">{rows.length - pending - active}</p>
        </div>
      </div>

      <WidgetBoundary title="Pass records">
        <div className="glass-card">
          <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
            <Search className="w-4 h-4 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by roll, name, type, or status…"
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="p-3 text-left">Student</th>
                  <th className="p-3 text-left">Roll</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Reason</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-[var(--text-muted)]">No passes found.</td></tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--bg-elevated)]/40">
                    <td className="p-3 text-[var(--text-primary)]">{r.name ?? "—"}</td>
                    <td className="p-3 font-mono text-xs text-[var(--text-muted)]">{r.roll ?? "—"}</td>
                    <td className="p-3 text-xs capitalize">{r.type.replace("_", " ")}</td>
                    <td className="p-3 text-xs text-[var(--text-muted)]">{r.reason ?? "—"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusBadge(r.status)}`}>{r.status}</span>
                    </td>
                    <td className="p-3 text-xs text-[var(--text-muted)]">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function AdminPassesPage() {
  return (
    
      <AdminPassesInner />
    
    

  );
}
