"use client";
// src/components/complaints/ComplaintConsole.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HoverPreview, MetricPreview } from "@/components/shared/HoverPreview";
import { getAuthHeaders, cn } from "@/lib/utils";
import { useExport } from "@/hooks/useExport";
import {
  FileDown,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  GitBranch,
} from "lucide-react";

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

type PeriodKey = "all" | "this-week" | "this-month" | "last-month";

function periodBounds(key: PeriodKey): { from?: string; to?: string } {
  const now = new Date();
  const d = (x: Date) => x.toISOString().slice(0, 10);
  switch (key) {
    case "this-week": {
      const start = new Date(now);
      start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return { from: d(start) };
    }
    case "this-month":
      return { from: d(new Date(now.getFullYear(), now.getMonth(), 1)) };
    case "last-month":
      return {
        from: d(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: d(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    default:
      return {};
  }
}

/** Seconds until SLA deadline; negative = overdue. */
function slaSecondsLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  return Math.floor((new Date(deadline).getTime() - Date.now()) / 1000);
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
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [mine, setMine] = useState(role === "student" ? "true" : "false");
  const { exportCSV } = useExport();

  const { from, to } = useMemo(() => periodBounds(period), [period]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (mine === "true") params.set("mine", "true");
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const r = await fetch(`/api/complaints?${params.toString()}`, { headers: getAuthHeaders() });
    const j = await r.json();
    setComplaints(j.data?.complaints ?? []);
    setLoading(false);
  }, [status, mine, from, to]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  // Resolution stats for the visible set
  const stats = useMemo(() => {
    const resolved = complaints.filter((c) => c.status === "resolved" || c.status === "closed");
    const overdue = complaints.filter(
      (c) => slaSecondsLeft(c.slaDeadline) !== null && slaSecondsLeft(c.slaDeadline)! < 0 && c.status !== "resolved" && c.status !== "closed"
    );
    return {
      total: complaints.length,
      resolved: resolved.length,
      resolutionRate: complaints.length > 0 ? Math.round((resolved.length / complaints.length) * 100) : 0,
      overdue: overdue.length,
    };
  }, [complaints]);

  const handleExport = () => {
    exportCSV(
      complaints.map((c) => ({
        ticket: c.complaintNumber,
        title: c.title,
        category: c.categoryLabel,
        status: c.status,
        owner: c.currentOwnerRole,
        createdAt: c.createdAt,
        sla: c.slaDeadline ?? "—",
      })),
      [
        { key: "ticket", header: "Ticket" },
        { key: "title", header: "Title" },
        { key: "category", header: "Category" },
        { key: "status", header: "Status" },
        { key: "owner", header: "Owner" },
        { key: "createdAt", header: "Raised" },
        { key: "sla", header: "SLA" },
      ],
      `complaints_${period}.csv`
    );
  };

  const PERIODS: Array<{ key: PeriodKey; label: string }> = [
    { key: "all", label: "All time" },
    { key: "this-week", label: "This week" },
    { key: "this-month", label: "This month" },
    { key: "last-month", label: "Last month" },
  ];

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="flex items-center gap-2">
          {role === "student" && (
            <Link href="/student/complaints/new" className="surface-card px-4 py-2 bg-bg-surface text-white text-sm">
              Raise complaint
            </Link>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={complaints.length === 0}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs text-text-muted hover:text-action-primary disabled:opacity-40"
          >
            <FileDown className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Period + status filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="inline-flex gap-0.5 bg-bg-elevated p-1">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                period === key ? "bg-action-primary text-white" : "text-text-secondary hover:bg-bg-surface"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="surface-card p-2 text-sm">
          <option value="">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        {role !== "student" && (
          <select value={mine} onChange={(e) => setMine(e.target.value)} className="surface-card p-2 text-sm">
            <option value="false">Queue ({role})</option>
            <option value="true">My filings</option>
          </select>
        )}
      </div>

      {/* Stats strip */}
      {complaints.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-bg-elevated p-2.5">
            <p className="text-xs text-text-muted">Resolution rate</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xl font-bold text-text-primary tabular-nums">{stats.resolutionRate}%</span>
              {stats.resolutionRate >= 50 ? (
                <TrendingUp className="h-4 w-4 text-action-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-action-danger" />
              )}
            </div>
            <p className="text-xs text-text-muted">{stats.resolved}/{stats.total} resolved</p>
          </div>
          <div className="bg-bg-elevated p-2.5">
            <p className="text-xs text-text-muted">Overdue SLA</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xl font-bold text-action-danger tabular-nums">{stats.overdue}</span>
              {stats.overdue > 0 && <AlertTriangle className="h-4 w-4 text-action-danger" />}
            </div>
            <p className="text-xs text-text-muted">past deadline, unresolved</p>
          </div>
          <div className="bg-bg-elevated p-2.5">
            <p className="text-xs text-text-muted">Total (period)</p>
            <span className="text-xl font-bold text-text-primary tabular-nums block mt-1">{stats.total}</span>
            <p className="text-xs text-text-muted">{period === "all" ? "all time" : period}</p>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : complaints.length === 0 ? (
        <p className="text-sm text-text-muted">No complaints found.</p>
      ) : (
        <div className="border rounded divide-y bg-white">
          {complaints.map((c) => {
            const slaLeft = slaSecondsLeft(c.slaDeadline);
            const isOverdue = slaLeft !== null && slaLeft < 0 && c.status !== "resolved" && c.status !== "closed";
            const slaHours = slaLeft !== null ? Math.abs(Math.round(slaLeft / 3600)) : null;
            return (
              <Link key={c.id} href={`${basePath}/${c.id}`} className="block p-2.5 hover:bg-bg-elevated transition">
                <HoverPreview
                  preview={
                    <MetricPreview
                      label={c.categoryLabel}
                      value={c.title}
                      hint={`Owner ${c.currentOwnerRole} · ${
                        c.slaDeadline && new Date(c.slaDeadline).getTime() < Date.now() && c.status !== "resolved" && c.status !== "closed"
                          ? "SLA breached"
                          : "within SLA"
                      }`}
                    />
                  }
                >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs text-text-muted">{c.complaintNumber}</span>
                    <h2 className="font-medium text-text-primary">{c.title}</h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      {c.categoryLabel} · Owner: <span className="font-mono">{c.currentOwnerRole}</span>
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded-full text-xs font-medium uppercase",
                        c.status === "resolved" || c.status === "closed"
                          ? "bg-action-success/10 text-action-success"
                          : isOverdue
                            ? "bg-action-danger/10 text-action-danger"
                            : "bg-action-warning/10 text-action-warning"
                      )}
                    >
                      {c.status}
                    </span>
                    {slaHours !== null && !isOverdue && c.status !== "resolved" && c.status !== "closed" && (
                      <p className="text-xs text-text-muted flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" /> SLA: {slaHours}h left
                      </p>
                    )}
                    {isOverdue && (
                      <div className="flex items-center gap-1 justify-end">
                        <AlertTriangle className="h-3 w-3 text-action-danger" />
                        <span className="text-xs font-medium text-action-danger">SLA breached — escalate</span>
                        <GitBranch className="h-3 w-3 text-action-danger/80" />
                      </div>
                    )}
                    <p className="text-xs text-text-muted">{new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                </HoverPreview>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
