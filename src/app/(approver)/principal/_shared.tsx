"use client";

/* Shared helpers for principal sub-pages — extracted from the monolith
   so that each sub-route stays self-contained while reusing the same
   utility functions and response types. */

import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { clearCache, cachedFetch } from "@/hooks/useApiResource";
import { getAuthHeaders } from "@/hooks/useAuthHeaders";
import type { Alert } from "@/lib/types";
import { Building2, LogIn, ShieldCheck, MapPin, Users, AlertTriangle, Check, X, UserPlus, ExternalLink, Clock, ArrowRight, ArrowUpRight, ArrowDownRight, Minus, Siren } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, LineChart } from "recharts";
import { cn, getTimeAgo } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";

/* ── response types ── */

export interface StaffAttendanceResp {
  summary?: {
    totalStaff: number;
    presentToday: number;
    currentlyInside: number;
    currentlyOutside: number;
    warningCount: number;
    overallAttendanceRate: number;
  };
  records?: Array<{
    id: string;
    fullName: string;
    designation: string;
    status: string;
    firstInTime?: string | null;
  }>;
}

export interface AuditRecord {
  id: string;
  action: string;
  user_name?: string;
  user_role?: string;
  userId?: string;
  details?: Record<string, unknown> | string | null;
  timestamp: string;
}

export interface DepartmentRow {
  code: string;
  name: string;
  hod?: string;
  staffCount?: number;
}

export interface OutpassRow {
  id: string;
  ticket_number: string;
  status: string;
  workflow_type: string;
  current_stage?: string;
  student?: {
    name: string;
    student_details?: { roll?: string } | null;
  } | null;
  requested_at?: string;
  updated_at?: string;
  created_at?: string;
  expiry?: string | null;
}

export interface PresenceMatrixData {
  gates?: Array<{ id: string; name?: string; code?: string }>;
  roles?: string[];
  matrix?: Record<string, Record<string, number>>;
  lastUpdated?: string;
}

/* ── fetch helper ── */

export type Resp = { success: boolean; data?: unknown; error?: { message?: string } };

export async function fetchJson(url: string): Promise<Resp> {
  try {
    const d = await cachedFetch<Resp>(url, {
      ttlMs: 10_000,
      headers: getAuthHeaders(),
    });
    return d ?? { success: false, error: { message: "Empty response" } };
  } catch (e) {
    return { success: false, error: { message: e instanceof Error ? e.message : "Request failed" } };
  }
}

/* ── formatters ── */

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

/** Render an audit `details` field (JSONB object, string, or null) compactly. */
export function fmtDetails(details: AuditRecord["details"]): string {
  if (!details) return "";
  if (typeof details === "string") {
    try {
      const parsed = JSON.parse(details);
      if (parsed && typeof parsed === "object") return JSON.stringify(parsed);
      return String(parsed ?? details);
    } catch {
      return details;
    }
  }
  const summary = Object.values(details);
  if (summary.length === 0) return "";
  return JSON.stringify(details).slice(0, 120);
}

/* ── building blocks reused across pages ── */

export { WidgetBoundary, clearCache };

/* ── StatCard (shared KPI card) ── */

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-[var(--text-primary)]",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 flex flex-col gap-2.5">
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl sm:text-3xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)]">{sub}</p>}
    </div>
  );
}

/* ── Hostel constants & panels that appear in multiple places ── */

export interface HostelRow {
  hostel: string;
  count: number;
  capacity: number;
}

export const HOSTEL_CODES = ["CSE", "IT", "ECE", "EEE", "ME"] as const;
export const HOSTEL_CAPACITIES: Record<string, number> = {
  CSE: 500,
  IT: 450,
  ECE: 400,
  EEE: 350,
  ME: 400,
};

export function hostelRowFor(code: string, count: number): HostelRow {
  return { hostel: code, count, capacity: HOSTEL_CAPACITIES[code] ?? 0 };
}

/* ── Hostel occupancy panel (reused on root + attendance page) ── */


export function HostelOccupancyPanel() {
  return (
    <WidgetBoundary title="Hostel Occupancy">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-4">
          <Building2 className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Hostel Occupancy</span>
        </div>
        <div className="rounded-lg border border-slate-600/40 bg-slate-700/20 p-3 text-xs text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
          Block-level occupancy detail is maintained by the hostel manager.
          Gate-level presence is shown in the Live Gate Presence panel above.
        </div>
      </div>
    </WidgetBoundary>
  );
}

/* ── Alerts panel (reused on root + incidents page) ── */


export function AlertsPanel({
  alerts,
  loading,
  error,
}: {
  alerts: Alert[] | null;
  loading: boolean;
  error: string | null;
}) {
  const sevColor: Record<string, string> = {
    critical: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    medium: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };
  return (
    <WidgetBoundary title="Active Alerts">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Siren className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Active Alerts
            </span>
          </div>
          {alerts && <span className="text-xs text-[var(--text-muted)]">{alerts.length} open</span>}
        </div>
        {loading && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
        {error && !loading && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Could not load alerts: {error}
          </div>
        )}
        {alerts && alerts.length === 0 && !loading && !error && (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">No active alerts. All clear.</p>
        )}
        {alerts && alerts.length > 0 && (
          <ul className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {alerts.map((a) => (
              <li key={a.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 sm:p-4 flex items-start gap-3">
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                    sevColor[a.severity] ?? sevColor.low
                  }`}
                >
                  {a.severity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{a.title}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{a.message}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    {fmtTime(a.timestamp)} · {fmtDate(a.timestamp)}
                    {a.studentRoll ? ` · roll ${a.studentRoll}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </WidgetBoundary>
  );
}

/* ── Presence matrix panel (reused on root + gate-activity page) ── */


export function PresenceMatrixPanel({
  matrixData,
  loading,
  error,
}: {
  matrixData: PresenceMatrixData | null;
  loading: boolean;
  error: string | null;
}) {
  const gates = matrixData?.gates ?? [];
  const roles = matrixData?.roles ?? [];
  const matrix = matrixData?.matrix ?? {};

  return (
    <WidgetBoundary title="Live Gate Presence">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-4">
          <MapPin className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Live Gate Presence</span>
        </div>
        {loading && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
        {error && !loading && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Could not load presence matrix: {error}
          </div>
        )}
        {matrixData && !loading && !error && gates.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">No active gates configured.</p>
        )}
        {matrixData && !loading && !error && gates.length > 0 && (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr>
                  <th className="text-left text-[var(--text-muted)] font-semibold pr-3 pb-2">Gate</th>
                  {roles.map((r) => (
                    <th key={r} className="text-center text-[var(--text-muted)] font-semibold px-1.5 pb-2">
                      {r.length > 6 ? `${r.slice(0, 5)}…` : r}
                    </th>
                  ))}
                  <th className="text-right text-[var(--text-muted)] font-semibold pl-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {gates.map((g) => {
                  const row = matrix[g.id] ?? {};
                  const total = roles.reduce((acc, r) => acc + (Number(row[r]) || 0), 0);
                  return (
                    <tr key={g.id} className="border-t border-[var(--border)]">
                      <td className="py-2.5 pr-3 font-medium text-[var(--text-primary)]">
                        {g.name || g.code || g.id}
                      </td>
                      {roles.map((r) => {
                        const v = Number(row[r]) || 0;
                        return (
                          <td key={r} className="text-center px-1.5 py-2.5">
                            <span
                              className={`inline-block min-w-[1.5rem] rounded px-1 py-0.5 text-center font-mono ${
                                v > 0
                                  ? v >= 20
                                    ? "bg-emerald-500/30 text-emerald-300"
                                    : "bg-indigo-500/25 text-indigo-300"
                                  : "text-[var(--text-muted)]"
                              }`}
                            >
                              {v}
                            </span>
                          </td>
                        );
                      })}
                      <td className="text-right pl-2 font-mono text-[var(--text-primary)]">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {matrixData.lastUpdated && (
              <p className="text-[10px] text-[var(--text-muted)] mt-2">Updated {fmtTime(matrixData.lastUpdated)}</p>
            )}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

/* ── Hostel overview (used on root + gate-activity) ── */

export function HostelOverviewPanel({
  matrix,
  pendingApprovals,
}: {
  matrix: PresenceMatrixData | null;
  pendingApprovals: number;
}) {
  const gates = matrix?.gates ?? [];
  const m = matrix?.matrix ?? {};
  const roles = matrix?.roles ?? [];
  const onCampus = gates.reduce(
    (sum, g) => sum + roles.reduce((s, r) => s + (m[g.id]?.[r] ?? 0), 0),
    0
  );
  return (
    <WidgetBoundary title="Hostel Overview">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <Building2 className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">Hostel Overview</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-0">
          <div>
            <p className="text-2xl font-bold text-indigo-400">{matrix ? onCampus : "…"}</p>
            <p className="text-xs text-[var(--text-muted)]">On-Campus Now</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{gates.length}</p>
            <p className="text-xs text-[var(--text-muted)]">Active Gates</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-400">{pendingApprovals}</p>
            <p className="text-xs text-[var(--text-muted)]">Pending Hostel Approvals</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">{roles.length > 0 ? "Active" : "—"}</p>
            <p className="text-xs text-[var(--text-muted)]">Hostel Status</p>
          </div>
        </div>
      </div>
    </WidgetBoundary>
  );
}

/* ── Resident directory panel (used on root) ── */

export function ResidentDirectoryPanel() {
  return (
    <WidgetBoundary title="Resident Directory">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <Users className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">Resident Directory</span>
        </div>
        <div className="rounded-lg border border-slate-600/40 bg-slate-700/20 p-3 text-xs text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
          Resident lookup is an operator-facing tool. Block &amp; room occupancy is maintained by the hostel manager.
        </div>
      </div>
    </WidgetBoundary>
  );
}

/* ── Hostel attendance panel ── */

import { CheckCircle2 } from "lucide-react";

export function HostelAttendancePanel({ matrix }: { matrix: PresenceMatrixData | null }) {
  const gates = matrix?.gates ?? [];
  const m = matrix?.matrix ?? {};
  const roles = matrix?.roles ?? [];
  const rows = gates.map((g) => ({
    ...g,
    total: roles.reduce((s, r) => s + (m[g.id]?.[r] ?? 0), 0),
  }));
  const total = rows.reduce((s, r) => s + r.total, 0);
  return (
    <WidgetBoundary title="Hostel Attendance">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">Hostel Attendance</span>
        </div>
        {rows.length === 0 ? (
          <div className="rounded-lg border border-slate-600/40 bg-slate-700/20 p-3 text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
            Detailed hostel attendance is managed by the hostel manager. Gate-level presence is shown below.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[360px]">
                <thead>
                  <tr className="text-[var(--text-muted)] text-xs uppercase tracking-wide border-b border-[var(--border)]">
                    <th className="text-left px-3 py-2">Gate</th>
                    <th className="text-right px-3 py-2">On-Campus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--bg-elevated)]">
                      <td className="px-3 py-2 text-[var(--text-primary)]">{r.name || r.code || r.id.slice(0, 8)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-bold ${r.total > 0 ? "text-emerald-400" : "text-[var(--text-muted)]"}`}>{r.total}</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">TOTAL</td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-emerald-400">{total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-2">
              Presence-matrix signal. Staff-level attendance detail is admin-scoped.
            </p>
          </>
        )}
      </div>
    </WidgetBoundary>
  );
}

/* ── Outpass/Leave panel ── */

import { ClipboardCheck } from "lucide-react";

export function OutpassLeavePanel({
  outpasses,
  leaves,
  loading,
  error,
}: {
  outpasses: OutpassRow[] | null;
  leaves: OutpassRow[] | null;
  loading: boolean;
  error: string | null;
}) {
  const all = [...(outpasses ?? []), ...(leaves ?? [])];
  return (
    <WidgetBoundary title="Outpass and Leave Requests">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <ClipboardCheck className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">Outpass &amp; Leave Requests</span>
          {all.length > 0 && <span className="text-xs text-amber-400 ml-auto">{all.length} pending</span>}
        </div>
        {loading && !outpasses && !leaves ? (
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        ) : all.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">No pending outpass or leave requests.</p>
        ) : (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-[var(--text-muted)] text-xs uppercase tracking-wide border-b border-[var(--border)]">
                  <th className="text-left px-3 py-2">Ticket</th>
                  <th className="text-left px-3 py-2">Student</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Stage</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {all.slice(0, 15).map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--bg-elevated)]">
                    <td className="px-3 py-2 font-mono text-xs text-[var(--text-primary)] whitespace-nowrap">{r.ticket_number}</td>
                    <td className="px-3 py-2 text-[var(--text-primary)] min-w-0">
                      {r.student?.name || "—"}
                      {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)] capitalize whitespace-nowrap">{r.workflow_type.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2 text-[var(--text-muted)] whitespace-nowrap">{r.current_stage || "—"}</td>
                    <td className="px-3 py-2">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-amber-400/30 bg-amber-400/10 text-amber-400 whitespace-nowrap">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

/* ── Entry/Exit logs panel (restricted) ── */

export function EntryExitLogsPanel() {
  return (
    <WidgetBoundary title="Entry & Exit Log">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <LogIn className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">Entry &amp; Exit Log</span>
        </div>
        <div className="rounded-lg border border-slate-600/40 bg-slate-700/20 p-3 text-xs text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
          Gate-level presence is shown in the Live Gate Presence panel. Detailed scan logs are operator-scoped.
        </div>
      </div>
    </WidgetBoundary>
  );
}

/* ── Hostel incidents panel (restricted) ── */

export function HostelIncidentsPanel() {
  return (
    <WidgetBoundary title="Hostel Incidents">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <Siren className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">Hostel Incidents</span>
        </div>
        <div className="rounded-lg border border-slate-600/40 bg-slate-700/20 p-3 text-xs text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
          Incident feeds are admin-scoped. No hostel incidents are exposed at the principal tier.
        </div>
      </div>
    </WidgetBoundary>
  );
}

/* ── Room occupancy panel (restricted) ── */

export function RoomOccupancyPanel() {
  return (
    <WidgetBoundary title="Room Occupancy">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <Building2 className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">Room Occupancy</span>
        </div>
        <div className="rounded-lg border border-slate-600/40 bg-slate-700/20 p-3 text-xs text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
          Room-level occupancy is maintained by the hostel manager. Block-level
          occupancy is shown in the Hostel Occupancy panel above; per-room detail
          is not exposed at the principal tier.
        </div>
      </div>
    </WidgetBoundary>
  );
}

/* ── Hostel reports panel ── */

import { FileText } from "lucide-react";

export function HostelReportsPanel({
  auditRecords,
  loading,
  error,
}: {
  auditRecords: AuditRecord[] | null;
  loading: boolean;
  error: string | null;
}) {
  const recent = auditRecords?.slice(0, 6) ?? [];
  return (
    <WidgetBoundary title="Hostel Reports">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <FileText className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">Hostel Reports</span>
        </div>
        {loading && !auditRecords ? (
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        ) : error ? (
          <p className="text-xs text-amber-300">{error}</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">No recent hostel report activity.</p>
        ) : (
          <ul className="space-y-2 min-w-0">
            {recent.map((r) => (
              <li key={r.id} className="min-w-0 flex items-center gap-2">
                <FileText className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                <span className="text-xs text-[var(--text-primary)] font-medium truncate min-w-0 flex-1">{r.action}</span>
                <span className="text-[10px] text-[var(--text-muted)] shrink-0">{fmtDate(r.timestamp)} {fmtTime(r.timestamp)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-[var(--text-muted)] mt-3 pt-3 border-t border-[var(--border)]">
          Authority: Manage the assigned hostel, residents, and hostel-related incidents.
        </p>
        <a
          href="/hostel/permissions"
          className="inline-flex items-center gap-1.5 mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
        >
          Open Hostel Approvals Desk →
        </a>
      </div>
    </WidgetBoundary>
  );
}

/* ────────────────────────────────────────────────────────────────── *
 * Principal Command Center primitives (NEW — does not affect existing)
 * ────────────────────────────────────────────────────────────────── */

/* 1. PrincipalShell */
export function PrincipalShell({
  title, subtitle, actions, children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-fluid-2xl font-semibold tracking-tight text-[var(--text-primary)]">{title}</h1>
          {subtitle && <p className="mt-1 text-fluid-sm text-[var(--text-muted)]">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="space-y-8">{children}</div>
    </div>
  );
}

/* 2. PulseTile */
type PulseTone = "neutral" | "positive" | "warning" | "critical";
const PULSE_TONE: Record<PulseTone, { text: string; dot: string }> = {
  neutral:  { text: "text-[var(--text-primary)]", dot: "bg-slate-400" },
  positive: { text: "text-emerald-500",           dot: "bg-emerald-500" },
  warning:  { text: "text-amber-500",             dot: "bg-amber-500" },
  critical: { text: "text-rose-500",              dot: "bg-rose-500" },
};

export function PulseTile({
  label, value, delta, deltaLabel, tone = "neutral", href, spark, loading,
}: {
  label: string;
  value: string | number;
  delta?: number | null;
  deltaLabel?: string;
  tone?: PulseTone;
  href?: string;
  spark?: { v: number }[];
  loading?: boolean;
}) {
  const t = PULSE_TONE[tone];
  const body = (
    <div
      className={cn(
        "group relative flex h-full flex-col justify-between rounded-2xl border border-[var(--border)]",
        "bg-[var(--bg-surface)] p-5 transition-shadow hover:shadow-card-hover",
        href && "cursor-pointer",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
        {href && <ArrowUpRight className="h-4 w-4 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-24" />
      ) : (
        <div className={cn("mt-3 text-3xl font-semibold tabular-nums tracking-tight", t.text)}>{value}</div>
      )}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
          {delta == null ? <Minus className="h-3 w-3" /> : delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta != null && (
            <span className={delta >= 0 ? "text-emerald-500" : "text-rose-500"}>
              {delta >= 0 ? "+" : ""}{delta}%
            </span>
          )}
          {deltaLabel && <span className="ml-1">{deltaLabel}</span>}
        </span>
        {spark && spark.length > 1 && (
          <div className="h-6 w-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark}>
                <Line type="monotone" dataKey="v" stroke="currentColor" strokeWidth={1.5} dot={false} className={t.text} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}

/* 3. StoryChart */
export function StoryChart({
  title, description, data, series, height = 280, loading, error,
}: {
  title: string;
  description?: string;
  data: any[];
  series: { key: string; label: string; color: string }[];
  height?: number;
  loading?: boolean;
  error?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{description}</p>}
        </div>
        <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          vs last week
        </span>
      </div>
      <WidgetBoundary title={title}>
        {loading ? (
          <Skeleton className="w-full" style={{ height }} />
        ) : error ? (
          <EmptyState title="Couldn't load" description={error} />
        ) : (
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  {series.map((s) => (
                    <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {series.map((s) => (
                  <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} fill={`url(#grad-${s.key})`} strokeWidth={2} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </WidgetBoundary>
    </div>
  );
}

/* 4. DecisionCard */
export function DecisionCard({
  ticket, title, subtitle, reason, urgency = "due",
  slaDeadline, onApprove, onReject, onDelegate, onOpen, busy,
}: {
  ticket: string;
  title: string;
  subtitle?: string;
  reason?: string;
  urgency?: "overdue" | "due" | "info";
  slaDeadline?: string | null;
  onApprove?: () => void;
  onReject?: () => void;
  onDelegate?: () => void;
  onOpen?: () => void;
  busy?: boolean;
}) {
  const accent = { overdue: "border-l-rose-500", due: "border-l-amber-500", info: "border-l-slate-300" }[urgency];
  return (
    <div className={cn(
      "group flex items-start gap-4 rounded-xl border border-[var(--border)] border-l-4 bg-[var(--bg-surface)] p-4",
      "transition-shadow hover:shadow-card-hover", accent,
    )}>
      <div className="min-w-0 flex-1">
        <button onClick={onOpen} className="block w-full text-left">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[var(--text-muted)]">{ticket}</span>
            {urgency === "overdue" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-500">
                <AlertTriangle className="h-3 w-3" /> Overdue
              </span>
            )}
            {slaDeadline && urgency === "due" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                <Clock className="h-3 w-3" /> Due soon
              </span>
            )}
          </div>
          <div className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">{title}</div>
          {subtitle && <div className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{subtitle}</div>}
          {reason && <div className="mt-2 line-clamp-2 text-xs text-[var(--text-muted)]">{reason}</div>}
        </button>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onApprove && (
          <button onClick={onApprove} disabled={busy}
            className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500 transition-colors hover:bg-emerald-500/20 disabled:opacity-50">
            <Check className="h-4 w-4" />
          </button>
        )}
        {onReject && (
          <button onClick={onReject} disabled={busy}
            className="rounded-lg bg-rose-500/10 p-2 text-rose-500 transition-colors hover:bg-rose-500/20 disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
        )}
        {onDelegate && (
          <button onClick={onDelegate} disabled={busy}
            className="rounded-lg bg-[var(--bg-subtle)] p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle-hover)] disabled:opacity-50">
            <UserPlus className="h-4 w-4" />
          </button>
        )}
        {onOpen && (
          <button onClick={onOpen}
            className="rounded-lg bg-[var(--bg-subtle)] p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle-hover)]">
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/* 5. SectionHeader */
export function SectionHeader({
  title, description, href, hrefLabel = "View all",
}: {
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-fluid-md font-semibold tracking-tight text-[var(--text-primary)]">{title}</h2>
        {description && <p className="mt-0.5 text-fluid-sm text-[var(--text-muted)]">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--action-primary)] hover:underline">
          {hrefLabel} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/* 6. SinceLastVisitCard */
export function SinceLastVisitCard({ lastVisitAt }: { lastVisitAt: string }) {
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`/api/principal/audit?since=${encodeURIComponent(lastVisitAt)}&summary=1`, { headers: getAuthHeaders() })
      .then(r => r.json()).then(d => { setS(d?.data ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lastVisitAt]);
  if (loading || !s) return null;
  const lines: string[] = [];
  if (s.approvals_cleared) lines.push(`${s.approvals_cleared} approvals cleared`);
  if (s.emergencies)       lines.push(`${s.emergencies} emergencies`);
  if (s.new_incidents)     lines.push(`${s.new_incidents} new incidents`);
  if (s.delegations)       lines.push(`${s.delegations} delegation updates`);
  if (!lines.length) return null;
  return (
    <div className="rounded-2xl border border-[var(--action-primary)]/20 bg-[var(--action-primary)]/5 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--action-primary)]">Since your last visit</p>
      <p className="mt-1 text-sm text-[var(--text-primary)]">{lines.join(" · ")}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Last seen {getTimeAgo(lastVisitAt)}</p>
    </div>
  );
}
