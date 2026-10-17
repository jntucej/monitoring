"use client";

import { useCallback, useEffect, useState } from "react";
import {
  UserCheck, UserX, Users, Clock, MapPin, Search, RefreshCw,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";

interface VisitorRow {
  id: string;
  name: string | null;
  purpose: string | null;
  host: string | null;
  status: string;
  gate: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
}

async function fetchVisitors(): Promise<VisitorRow[]> {
  const res = await fetch("/api/visitors?limit=200", { headers: getAuthHeaders() });
  const body = await res.json();
  const raw = (body?.data ?? body ?? []) as any[];
  return raw.map((v) => ({
    id: v.id,
    name: v.fullName ?? v.name ?? v.visitorName ?? null,
    purpose: v.purpose ?? v.visitorPurpose ?? null,
    host: v.host?.fullName ?? v.host?.name ?? v.hostName ?? null,
    status: v.status ?? "UNKNOWN",
    gate: v.gateName ?? v.gate ?? null,
    checkInAt: v.checkedInAt ?? v.checkInAt ?? null,
    checkOutAt: v.checkedOutAt ?? v.checkOutAt ?? null,
  }));
}

function statusBadge(s: string) {
  const c = s.toUpperCase();
  if (c.includes("IN") || c === "ACTIVE" || c === "CHECKED_IN")
    return "bg-emerald-500/10 text-emerald-400";
  if (c.includes("OUT") || c === "CHECKED_OUT" || c === "COMPLETE")
    return "bg-sky-500/10 text-sky-400";
  if (c === "PENDING") return "bg-amber-500/10 text-amber-400";
  return "bg-slate-500/10 text-slate-400";
}

/**
 * Admin Visitors — live visitor check-in/out board.
 * Backend: /api/visitors (operator|admin|sysadmin scope).
 */
function AdminVisitorsInner() {
  const [rows, setRows] = useState<VisitorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchVisitors()); }
    catch (e) { console.error("visitors", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = query.trim()
    ? rows.filter((r) =>
        `${r.name} ${r.purpose} ${r.host} ${r.status}`.toLowerCase().includes(query.toLowerCase()))
    : rows;

  const onCampus = rows.filter((r) => (r.status.toUpperCase().includes("IN") || r.status === "ACTIVE") && !r.checkOutAt).length;
  const pending = rows.filter((r) => r.status.toUpperCase() === "PENDING").length;

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
        title="Visitors"
        subtitle="Live check-in / check-out board and visit records"
        onRefresh={load}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Total</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{rows.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5 text-emerald-400" /> On campus</p>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums">{onCampus}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-400" /> Pending</p>
          <p className="text-2xl font-bold text-amber-400 tabular-nums">{pending}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5"><UserX className="w-3.5 h-3.5 text-sky-400" /> Checked out</p>
          <p className="text-2xl font-bold text-sky-400 tabular-nums">{rows.length - onCampus - pending}</p>
        </div>
      </div>

      <WidgetBoundary title="Visitor log">
        <div className="glass-card">
          <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
            <Search className="w-4 h-4 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter visitors…"
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="p-3 text-left">Visitor</th>
                  <th className="p-3 text-left">Purpose</th>
                  <th className="p-3 text-left">Host</th>
                  <th className="p-3 text-left">Gate</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Checked in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-[var(--text-muted)]">No visitors found.</td></tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--bg-elevated)]/40">
                    <td className="p-3 text-[var(--text-primary)]">{r.name ?? "—"}</td>
                    <td className="p-3 text-[var(--text-muted)]">{r.purpose ?? "—"}</td>
                    <td className="p-3 text-[var(--text-muted)]">{r.host ?? "—"}</td>
                    <td className="p-3 text-[var(--text-muted)] flex items-center gap-1"><MapPin className="w-3 h-3" />{r.gate ?? "—"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusBadge(r.status)}`}>{r.status}</span>
                    </td>
                    <td className="p-3 text-xs text-[var(--text-muted)]">
                      {r.checkInAt ? new Date(r.checkInAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
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

export default function AdminVisitorsPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <AdminVisitorsInner />
    </AuthGuard>
  );
}
