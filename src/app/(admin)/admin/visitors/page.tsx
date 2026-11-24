"use client";

import { useCallback, useEffect, useState } from "react";
import {UserCheck, UserX, Users, Clock, MapPin, Search}  from "lucide-react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { visitorInspection as visitorModel } from "@/components/shared/inspectionModels";
import { usePersistentQuery } from "@/hooks/usePersistentQuery";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

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
    return "bg-emerald-500/10 text-action-success";
  if (c.includes("OUT") || c === "CHECKED_OUT" || c === "COMPLETE")
    return "bg-sky-500/10 text-action-info";
  if (c === "PENDING") return "bg-amber-500/10 text-action-warning";
  return "bg-bg-elevated/10 text-text-muted";
}

/**
 * Admin Visitors — live visitor check-in/out board.
 * Backend: /api/visitors (operator|admin|sysadmin scope).
 */
function AdminVisitorsInner() {
  const [rows, setRows] = useState<VisitorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/visitors", { headers: getAuthHeaders(), cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const arr = (json?.data ?? json ?? []) as Array<Record<string, unknown>>;
      setRows(
        arr.map((v) => ({
          id: String(v.id ?? ""),
          name: (v.name ?? null) as string | null,
          purpose: (v.purpose ?? null) as string | null,
          host: (v.host ?? null) as string | null,
          gate: (v.gate ?? v.gate_id ?? null) as string | null,
          status: String(v.status ?? "UNKNOWN"),
          checkInAt: (v.checkedInAt ?? v.checkInAt ?? null) as string | null,
          checkOutAt: (v.checkedOutAt ?? v.checkOutAt ?? null) as string | null,
        })),
      );
    } catch {
      /* non-fatal */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const [query, setQuery] = usePersistentQuery("gate-admin-visitors-query");

  const [activeVisitor, setActiveVisitor] = useState<VisitorRow | null>(null);

  /** Standardized inspection model for a visitor (the registry). */
  const activeVisitorModel = activeVisitor ? visitorModel(activeVisitor) : null;

  const filtered = query.trim()
    ? rows.filter((r) =>
        `${r.name} ${r.purpose} ${r.host} ${r.status}`.toLowerCase().includes(query.toLowerCase()))
    : rows;

  const onCampus = rows.filter((r) => (r.status.toUpperCase().includes("IN") || r.status === "ACTIVE") && !r.checkOutAt).length;
  const pending = rows.filter((r) => r.status.toUpperCase() === "PENDING").length;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4 py-4 md:py-6">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Live check-in / check-out board and visit records"
        contextLabel="Live check-in / check-out board and visit records"
        statusSummary="Review current live check-in / check-out board and visit records state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-4 md:py-6">
      <PageHeader
        title="Visitors"
        subtitle="Live check-in / check-out board and visit records"
        onRefresh={load}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="surface-card p-4">
          <p className="text-xs text-text-muted flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Total</p>
          <p className="text-2xl font-bold text-text-primary tabular-nums">{rows.length}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-text-muted flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5 text-action-success" /> On campus</p>
          <p className="text-2xl font-bold text-action-success tabular-nums">{onCampus}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-text-muted flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-action-warning" /> Pending</p>
          <p className="text-2xl font-bold text-action-warning tabular-nums">{pending}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-text-muted flex items-center gap-1.5"><UserX className="w-3.5 h-3.5 text-action-info" /> Checked out</p>
          <p className="text-2xl font-bold text-action-info tabular-nums">{rows.length - onCampus - pending}</p>
        </div>
      </div>

      <WidgetBoundary title="Visitor log">
        <div className="glass-card">
          <div className="surface-card p-4 flex items-center gap-2 min-h-11">
            <Search className="w-4 h-4 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter visitors…"
              className="flex-1 min-h-11 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-text-muted border-b border-border">
                  <th className="p-3 text-left">Visitor</th>
                  <th className="p-3 text-left">Purpose</th>
                  <th className="p-3 text-left">Host</th>
                  <th className="p-3 text-left">Gate</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Checked in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-text-muted">No visitors found.</td></tr>
                )}
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-bg-elevated/40 cursor-pointer"
                    onClick={() => setActiveVisitor(r)}
                  >
                    <td className="p-3 text-text-primary">{r.name ?? "—"}</td>
                    <td className="p-3 text-text-muted">{r.purpose ?? "—"}</td>
                    <td className="p-3 text-text-muted">{r.host ?? "—"}</td>
                    <td className="p-3 text-text-muted flex items-center gap-1"><MapPin className="size-3.5" />{r.gate ?? "—"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(r.status)}`}>{r.status}</span>
                    </td>
                    <td className="p-3 text-xs text-text-muted">
                      {r.checkInAt ? new Date(r.checkInAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </WidgetBoundary>

      <EntityInspector inspection={activeVisitorModel} onClose={() => setActiveVisitor(null)} />
    </div>
  );
}

export default function AdminVisitorsPage() {
  return (
    
      <AdminVisitorsInner />
    
    

  );
}
