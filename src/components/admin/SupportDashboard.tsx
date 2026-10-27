"use client";

import { useEffect, useState, useCallback } from "react";
import { useUIStore } from "@/stores/uiStore";
import { getAuthHeaders } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";
import { WidgetLoading } from "@/components/admin/shared/LoadingStates";
import { LifeBuoy, Filter } from "lucide-react";
import type { BadgeVariant } from "@/components/ui/badge";

type Ticket = {
  id: string;
  ticket_number: string;
  user_name: string;
  user_role: string;
  category: string;
  priority: string;
  subject: string;
  status: string;
  assigned_name: string | null;
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function statusVariant(s: string): BadgeVariant {
  if (s === "open") return "entry";
  if (s === "in_progress") return "dayout";
  if (s === "resolved") return "success";
  if (s === "closed") return "offline";
  return "offline";
}

function priorityVariant(p: string): BadgeVariant {
  if (p === "critical" || p === "high") return "exit";
  if (p === "medium") return "success";
  return "offline";
}

export function SupportDashboard() {
  const { addToast } = useUIStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    body: string;
    action: () => Promise<void>;
  }>({ open: false, title: "", body: "", action: async () => {} });

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      const qs = params.toString();
      const res = await fetch(`/api/admin/support/tickets${qs ? `?${qs}` : ""}`, {
        headers: getAuthHeaders(),
      });
      const result = await res.json();
      setTickets((result.data ?? []) as Ticket[]);
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to load tickets." });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, addToast]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/support/metrics", { headers: getAuthHeaders() });
        const result = await res.json();
        if (result.success) setMetrics(result.data);
      } catch {}
    };
    load();
  }, []);

  const patchTicket = async (id: string, patch: Record<string, unknown>, ticketNumber?: string) => {
    const res = await fetch(`/api/support/tickets/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(patch),
    });
    const result = await res.json();
    if (!res.ok) {
      addToast({ variant: "error", title: "Error", message: result?.error?.message ?? "Failed to update ticket." });
      return;
    }
    addToast({ variant: "success", title: "Updated", message: `Ticket ${ticketNumber ?? id} status -> ${patch.status}` });
    fetchTickets();
  };

  const advanceStatus = (t: Ticket) => {
    const next = t.status === "open" ? "in_progress" : t.status === "in_progress" ? "resolved" : null;
    if (next) patchTicket(t.id, { status: next }, t.ticket_number);
  };

  const closeTicket = (t: Ticket) => {
    setConfirm({
      open: true,
      title: "Close ticket?",
      body: `Ticket ${t.ticket_number} (${t.subject}) will be closed. Use this only when the issue is fully resolved.`,
      action: () => patchTicket(t.id, { status: "closed" }, t.ticket_number),
    });
  };

  if (loading && tickets.length === 0) return <WidgetLoading />;

  const m = (metrics ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-2xl font-bold tracking-tight">Support Ticket Management</p>
        <p className="text-sm text-gray-500">Triage, assign, and resolve user feedback and gate issues.</p>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 border text-center">
            <div className="text-xs text-gray-500">Total Tickets</div>
            <div className="text-2xl font-bold">{String(m.totalTickets ?? 0)}</div>
          </Card>
          <Card className="p-4 border text-center">
            <div className="text-xs text-amber-500 font-medium">Open</div>
            <div className="text-2xl font-bold text-amber-600">{String(m.openTickets ?? 0)}</div>
          </Card>
          <Card className="p-4 border text-center">
            <div className="text-xs text-emerald-500 font-medium">Resolved</div>
            <div className="text-2xl font-bold text-emerald-600">{String(m.resolvedTickets ?? 0)}</div>
          </Card>
          <Card className="p-4 border text-center">
            <div className="text-xs text-blue-500 font-medium">Avg Resolution Time</div>
            <div className="text-2xl font-bold text-blue-600">{String(m.avgResolutionHours ?? "—")} hrs</div>
          </Card>
        </div>
      )}

      <Card className="border">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-blue-500" /> Tickets
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-1.5 border rounded text-xs">
                {STATUS_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="p-1.5 border rounded text-xs">
                {PRIORITY_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600">
                <tr>
                  <th className="p-3">Ticket #</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Assignee</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tickets.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-sm text-gray-500">No tickets found.</td></tr>
                )}
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="p-3 font-mono text-xs">{t.ticket_number}</td>
                    <td className="p-3">
                      <div>{t.user_name}</div>
                      <div className="text-xs text-gray-400 capitalize">{t.user_role}</div>
                    </td>
                    <td className="p-3 font-medium max-w-48 truncate" title={t.subject}>{t.subject}</td>
                    <td className="p-3 text-xs capitalize">{(t.category ?? "").replace("_", " ")}</td>
                    <td className="p-3"><Badge variant={priorityVariant(t.priority)} className="text-xs capitalize">{t.priority}</Badge></td>
                    <td className="p-3 text-xs">{t.assigned_name ?? "—"}</td>
                    <td className="p-3"><Badge variant={statusVariant(t.status)} className="capitalize text-xs">{t.status.replace("_", " ")}</Badge></td>
                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      {t.status === "open" && (
                        <Button size="sm" variant="secondary" className="text-xs" onClick={() => advanceStatus(t)}>Start</Button>
                      )}
                      {t.status === "in_progress" && (
                        <Button size="sm" variant="secondary" className="text-xs" onClick={() => advanceStatus(t)}>Resolve</Button>
                      )}
                      {t.status !== "closed" && (
                        <Button size="sm" variant="ghost" className="text-xs text-red-500" onClick={() => closeTicket(t)}>Close</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
        title={confirm.title}
        body={confirm.body}
        onConfirm={confirm.action}
        confirmText="Close ticket"
        variant="destructive"
      />
    </div>
  );
}
