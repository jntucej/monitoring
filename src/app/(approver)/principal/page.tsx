"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PermissionList } from "@/components/approver/PermissionList";
import { cachedFetch, clearCache } from "@/hooks/useApiResource";
import { getAuthHeaders } from "@/hooks/useAuthHeaders";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role, GatePass, Alert, Person } from "@/lib/types";
import {
  ShieldCheck,
  Clock,
  Building2,
  MapPin,
  AlertTriangle,
  Users,
  RefreshCw,
  UserCheck,
  Inbox,
  Siren,
  ClipboardCheck,

  FileText,
  ScrollText,
  CheckCircle2,
  XCircle,
} from "lucide-react";

/* ── types for new panels ── */

interface StaffAttendanceResp {
  summary?: {
    totalStaff: number;
    presentToday: number;
    absentToday: number;
    onLeave: number;
  };
  data?: Array<{
    name: string;
    role: string;
    department?: string;
    present: boolean;
  }>;
}

interface AuditRecord {
  id: string;
  action: string;
  user?: { name: string };
  userId?: string;
  details?: string;
  timestamp: string;
}

interface DepartmentRow {
  code: string;
  name: string;
  hod?: string;
  staffCount?: number;
}

interface AttendanceRecordRow {
  user_id?: string;
  user_role?: string;
  gate_id?: string;
  gate_name?: string;
  direction?: string;
  first_in_time?: string | null;
  last_seen_at?: string | null;
  checked_in_at?: string | null;
  status?: string;
  student_name?: string;
  roll_no?: string;
  [key: string]: unknown;
}

interface OutpassRow {
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
  expiry?: string | null;
}

/* ── Institutional Attendance panel ── */

function AttendancePanel({
  data,
  loading,
  error,
}: {
  data: StaffAttendanceResp | null;
  loading: boolean;
  error: string | null;
}) {
  const s = data?.summary;
  const total = s?.totalStaff ?? 0;
  const present = s?.presentToday ?? 0;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
      <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-semibold uppercase tracking-wide">
          Institutional Attendance
        </span>
      </div>
      {loading && !data ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-1/3 bg-[var(--bg-elevated)] rounded" />
          <div className="h-4 w-1/2 bg-[var(--bg-elevated)] rounded" />
        </div>
      ) : error ? (
        <p className="text-xs text-amber-300">{error}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-2xl font-bold text-emerald-400">{present}</p>
            <p className="text-xs text-[var(--text-muted)]">Present</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-rose-400">{s?.absentToday ?? 0}</p>
            <p className="text-xs text-[var(--text-muted)]">Absent</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-400">{s?.onLeave ?? 0}</p>
            <p className="text-xs text-[var(--text-muted)]">On Leave</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{pct}%</p>
            <p className="text-xs text-[var(--text-muted)]">Attendance Rate</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Gate Activity Overview panel (reuses matrix data) ── */

function GateActivityPanel({
  matrix,
  loading,
  error,
}: {
  matrix: {
    gates?: Array<{ id: string; name?: string; code?: string }>;
    roles?: string[];
    matrix?: Record<string, Record<string, number>>;
  } | null;
  loading: boolean;
  error: string | null;
}) {
  const gates = matrix?.gates ?? [];
  const gmatrix = matrix?.matrix ?? {};
  const roles = matrix?.roles ?? [];

  const gateTotals = useMemo(() => {
    return gates.map((g) => {
      const roleCounts = roles.map((r) => ({
        role: r,
        count: gmatrix[g.id]?.[r] ?? 0,
      }));
      const total = roleCounts.reduce((a, b) => a + b.count, 0);
      return { ...g, total, roleCounts };
    });
  }, [gates, roles, gmatrix]);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
      <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
        <MapPin className="w-4 h-4 text-sky-400" />
        <span className="text-xs font-semibold uppercase tracking-wide">
          Gate Activity Overview
        </span>
      </div>
      {loading && !matrix ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-1/3 bg-[var(--bg-elevated)] rounded" />
        </div>
      ) : error ? (
        <p className="text-xs text-amber-300">{error}</p>
      ) : gateTotals.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">No gates registered.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-full">
            <thead>
              <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="py-2 pr-4 font-medium">Gate</th>
                <th className="py-2 pr-4 font-medium">On Campus</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {gateTotals.map((g) => (
                <tr key={g.id}>
                  <td className="py-2 pr-4">
                    <span className="text-[var(--text-primary)] font-medium">{g.name || g.code || g.id.slice(0, 8)}</span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`font-bold ${g.total > 0 ? "text-emerald-400" : "text-[var(--text-muted)]"}`}>
                      {g.total}
                    </span>
                  </td>
                  <td className="py-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        g.total > 0
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-slate-500/15 text-slate-400"
                      }`}
                    >
                      {g.total > 0 ? "Active" : "Clear"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Department Performance panel ── */

function DepartmentPerformancePanel({
  departments,
  students,
  loading,
  error,
}: {
  departments: DepartmentRow[] | null;
  students: Person[] | null;
  loading: boolean;
  error: string | null;
}) {
  const deptMap = useMemo(() => {
    const m = new Map<string, { code: string; name: string; count: number }>();
    (departments ?? []).forEach((d) => {
      const key = d.code || d.name;
      m.set(key, { code: d.code, name: d.name, count: 0 });
    });
    (students ?? []).forEach((s) => {
      const dep = (s as Person & { department_id?: string }).department_id || s.department || "Unassigned";
      const key = dep;
      if (!m.has(key)) m.set(key, { code: key, name: key, count: 0 });
      m.get(key)!.count++;
    });
    return m;
  }, [departments, students]);

  const rows = [...deptMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([key, d]) => ({ key, ...d }));

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
      <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
        <Building2 className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-semibold uppercase tracking-wide">
          Department Performance
        </span>
      </div>
      {loading && !departments && !students ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-1/3 bg-[var(--bg-elevated)] rounded" />
        </div>
      ) : error ? (
        <p className="text-xs text-amber-300">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">No department data available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-full">
            <thead>
              <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="py-2 pr-4 font-medium">Department</th>
                <th className="py-2 font-medium">Active Students</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="py-2 pr-4">
                    <span className="text-[var(--text-primary)]">{r.name || r.key}</span>
                  </td>
                  <td className="py-2">
                    <span className="font-bold text-[var(--text-primary)]">{r.count}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Incident Oversight panel ── */

function IncidentOversightPanel({
  alerts,
  loading,
  error,
}: {
  alerts: Alert[] | null;
  loading: boolean;
  error: string | null;
}) {
  const top = useMemo(() => {
    if (!alerts) return [];
    const sev = (a: Alert) => (a.severity === "critical" ? 0 : a.severity === "high" ? 1 : 2);
    return [...alerts].sort((a, b) => sev(a) - sev(b)).slice(0, 5);
  }, [alerts]);

  const sevColor = (s?: string) =>
    s === "critical" ? "text-rose-400" : s === "high" ? "text-amber-400" : "text-sky-400";

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
      <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
        <Siren className="w-4 h-4 text-rose-400" />
        <span className="text-xs font-semibold uppercase tracking-wide">
          Incident Oversight
        </span>
      </div>
      {loading && !alerts ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-1/2 bg-[var(--bg-elevated)] rounded" />
        </div>
      ) : error ? (
        <p className="text-xs text-amber-300">{error}</p>
      ) : top.length === 0 ? (
        <div className="flex items-center gap-2 text-emerald-400 text-xs">
          <XCircle className="w-3.5 h-3.5" />
          No open incidents. All clear.
        </div>
      ) : (
        <ul className="space-y-2.5 min-w-0">
          {top.map((a) => (
            <li key={a.id || a.title} className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xs font-bold ${sevColor(a.severity)} shrink-0`}>
                  {a.severity?.toUpperCase() || "INFO"}
                </span>
                <span className="text-xs text-[var(--text-primary)] truncate">{a.title}</span>
              </div>
              {a.message && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2 min-w-0">{a.message}</p>
              )}
              {a.timestamp && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{fmtTime(a.timestamp)}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Institutional Reports panel ── */

function InstitutionalReportsPanel({
  attendance,
  students,
  loading,
}: {
  attendance: StaffAttendanceResp | null;
  students: Person[] | null;
  loading: boolean;
}) {
  const s = attendance?.summary;
  const studentCount = students?.length ?? 0;
  const reports = [
    {
      label: "Staff Attendance Summary",
      value: s ? `${s.presentToday}/${s.totalStaff} present` : "—",
      sub: `${s?.onLeave ?? 0} on leave`,
    },
    {
      label: "Active Student Population",
      value: String(studentCount),
      sub: "On-campus roster",
    },
    {
      label: "Detailed Analytics",
      value: "Restricted",
      sub: "Available to admin/sysadmin only",
    },
  ];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
      <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
        <FileText className="w-4 h-4 text-sky-400" />
        <span className="text-xs font-semibold uppercase tracking-wide">
          Institutional Reports
        </span>
      </div>
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-1/2 bg-[var(--bg-elevated)] rounded" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {reports.map((r) => (
            <div key={r.label} className="rounded-xl bg-[var(--bg-elevated)] p-3 min-w-0">
              <p className="text-xs text-[var(--text-muted)]">{r.label}</p>
              <p className="text-lg font-bold text-[var(--text-primary)] mt-0.5">{r.value}</p>
              <p className="text-xs text-[var(--text-muted)]">{r.sub}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Audit & Compliance panel ── */

function AuditCompliancePanel({
  records,
  loading,
  error,
}: {
  records: AuditRecord[] | null;
  loading: boolean;
  error: string | null;
}) {
  const recent = (records ?? []).slice(0, 6);
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
      <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
        <ScrollText className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-semibold uppercase tracking-wide">
          Audit & Compliance
        </span>
      </div>
      {loading && !records ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-1/3 bg-[var(--bg-elevated)] rounded" />
        </div>
      ) : error ? (
        <p className="text-xs text-amber-300">{error}</p>
      ) : recent.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">No recent audit activity.</p>
      ) : (
        <ul className="space-y-2 min-w-0">
          {recent.map((r) => (
            <li key={r.id} className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <ClipboardCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-xs text-[var(--text-primary)] font-medium truncate">
                  {r.action}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 pl-5 min-w-0">
                {r.user?.name || "System"} · {fmtDate(r.timestamp)} {fmtTime(r.timestamp)}
                {r.details ? ` · ${r.details}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Resp = { success: boolean; data?: unknown; error?: { message?: string } };

async function fetchJson(url: string): Promise<Resp> {
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

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

function StatCard({
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

interface HostelRow {
  hostel: string;
  count: number;
  capacity: number;
}

const HOSTEL_CODES = ["CSE", "IT", "ECE", "EEE", "ME"] as const;
const HOSTEL_CAPACITIES: Record<string, number> = {
  CSE: 500,
  IT: 450,
  ECE: 400,
  EEE: 350,
  ME: 400,
};

function hostelRowFor(code: string, count: number): HostelRow {
  return { hostel: code, count, capacity: HOSTEL_CAPACITIES[code] ?? 0 };
}

function HostelOccupancyPanel({
  roster,
}: {
  roster: Person[] | null;
}) {
  // Derive per-hostel occupancy client-side from the single active roster
  // fetch (reuses the /api/students?scope=active data already loaded by the
  // page). No more 5 parallel per-hostel /api/students calls.
  const rows: HostelRow[] | null = useMemo(() => {
    if (!roster) return null;
    const counts: Record<string, number> = {};
    for (const code of HOSTEL_CODES) counts[code] = 0;
    for (const p of roster) {
      const block = (p.hostelBlock || p.studentDetails?.hostelBlock || "").toUpperCase();
      if (block in counts) counts[block] += 1;
    }
    return HOSTEL_CODES.map((code) => hostelRowFor(code, counts[code] ?? 0));
  }, [roster]);

  return (
    <WidgetBoundary title="Hostel Occupancy">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-4">
          <Building2 className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Hostel Occupancy</span>
        </div>
        {rows === null ? (
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        ) : (
          <ul className="space-y-4">
            {rows.map((r) => {
              const pct = r.capacity > 0 ? Math.min(100, Math.round((r.count / r.capacity) * 100)) : 0;
              const full = r.capacity > 0 && r.count >= r.capacity;
              return (
                <li key={r.hostel} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-[var(--text-primary)]">{r.hostel}</span>
                    <span className="text-[var(--text-muted)]">
                      {r.count} in / {r.capacity} · out of campus {Math.max(r.capacity - r.count, 0)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden border border-[var(--border)]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        full ? "bg-rose-500" : pct > 80 ? "bg-amber-400" : "bg-indigo-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </WidgetBoundary>
  );
}

function AlertsPanel({ alerts, loading, error }: { alerts: Alert[] | null; loading: boolean; error: string | null }) {
  const sevColor: Record<string, string> = {
    critical: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    medium: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };
  return (
    <WidgetBoundary title="Active Alerts">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
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

function PresenceMatrixPanel({
  matrixData,
  loading,
  error,
}: {
  matrixData:
    | { gates?: Array<{ id: string; name?: string; code?: string }>; roles?: string[]; matrix?: Record<string, Record<string, number>>; lastUpdated?: string }
    | null;
  loading: boolean;
  error: string | null;
}) {
  const gates = matrixData?.gates ?? [];
  const roles = matrixData?.roles ?? [];
  const matrix = matrixData?.matrix ?? {};

  return (
    <WidgetBoundary title="Live Gate Presence">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
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

/* ── Hostel & Residents cluster ── */

function HostelOverviewPanel({
  matrix,
  pendingApprovals,
}: {
  matrix: {
    gates?: Array<{ id: string; name?: string; code?: string }>;
    roles?: string[];
    matrix?: Record<string, Record<string, number>>;
  } | null;
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
            <p className="text-2xl font-bold text-emerald-400">
              {roles.length > 0 ? "Active" : "—"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Hostel Status</p>
          </div>
        </div>
      </div>
    </WidgetBoundary>
  );
}

function ResidentDirectoryPanel({
  records,
  loading,
  error,
}: {
  records: AttendanceRecordRow[] | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <WidgetBoundary title="Resident Directory">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <Users className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">Resident Directory</span>
        </div>
        {loading && !records ? (
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        ) : error ? (
          <div className="rounded-lg border border-slate-600/40 bg-slate-700/20 p-3 text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
            Resident directory is managed by the hostel manager. No dedicated resident feed is exposed at this tier.
          </div>
        ) : records && records.length > 0 ? (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="text-[var(--text-muted)] text-xs uppercase tracking-wide border-b border-[var(--border)]">
                  <th className="text-left px-3 py-2">Gate</th>
                  <th className="text-left px-3 py-2">Direction</th>
                  <th className="text-left px-3 py-2">First In</th>
                  <th className="text-left px-3 py-2">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {records.slice(0, 20).map((r, i) => (
                  <tr key={i} className="hover:bg-[var(--bg-elevated)]">
                    <td className="px-3 py-2 text-[var(--text-primary)]">{r.gate_name || r.gate_id?.slice(0, 8) || "—"}</td>
                    <td className="px-3 py-2 text-[var(--text-muted)] capitalize">{r.direction || "—"}</td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">{r.first_in_time ? fmtTime(r.first_in_time) : "—"}</td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">{r.last_seen_at ? fmtTime(r.last_seen_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length > 20 && (
              <p className="text-xs text-[var(--text-muted)] mt-2">Showing first 20 of {records.length} records.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">No attendance records on file.</p>
        )}
      </div>
    </WidgetBoundary>
  );
}

function HostelAttendancePanel({
  matrix,
}: {
  matrix: {
    gates?: Array<{ id: string; name?: string; code?: string }>;
    roles?: string[];
    matrix?: Record<string, Record<string, number>>;
  } | null;
}) {
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

function OutpassLeavePanel({
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
        ) : error ? (
          <p className="text-xs text-amber-300">{error}</p>
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

function EntryExitLogsPanel() {
  return (
    <WidgetBoundary title="Entry/Exit Logs">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <MapPin className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">Entry / Exit Logs</span>
        </div>
        <div className="rounded-lg border border-slate-600/40 bg-slate-700/20 p-3 text-xs text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
          Entry/exit detail is restricted at the principal tier. Gate-level presence is available in the Gate Activity panel above.
        </div>
      </div>
    </WidgetBoundary>
  );
}

function HostelIncidentsPanel({
  alerts,
  loading,
  error,
}: {
  alerts: Alert[] | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <WidgetBoundary title="Hostel Incidents">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <Siren className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">Hostel Incidents</span>
        </div>
        {loading && !alerts ? (
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        ) : error ? (
          <div className="rounded-lg border border-slate-600/40 bg-slate-700/20 p-3 text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
            Incident feeds are admin-scoped. No hostel incidents are exposed at the principal tier.
          </div>
        ) : alerts && alerts.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">No hostel incidents on record. All clear.</p>
        ) : alerts && alerts.length > 0 ? (
          <ul className="space-y-2 min-w-0 max-h-48 overflow-y-auto">
            {alerts.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center gap-2 min-w-0 text-sm hover:bg-[var(--bg-elevated)] rounded-lg px-2 py-1.5">
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  a.severity === "critical" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
                }`}>
                  {a.severity}
                </span>
                <span className="text-[var(--text-primary)] truncate min-w-0 flex-1">{a.title}</span>
                <span className="text-[10px] text-[var(--text-muted)] shrink-0">{fmtTime(a.timestamp)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">No hostel incidents on record.</p>
        )}
      </div>
    </WidgetBoundary>
  );
}

function RoomOccupancyPanel() {
  return (
    <WidgetBoundary title="Room Occupancy">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <Building2 className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">Room Occupancy</span>
        </div>
        <div className="rounded-lg border border-slate-600/40 bg-slate-700/20 p-3 text-xs text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
          Room-level occupancy data is managed by the hostel manager and not exposed at the principal tier.
        </div>
      </div>
    </WidgetBoundary>
  );
}

function HostelReportsPanel({
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

function PrincipalDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [passes, setPasses] = useState<GatePass[] | null>(null);
  const [passesError, setPassesError] = useState<string | null>(null);
  const [students, setStudents] = useState<Person[] | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<{
    gates?: Array<{ id: string; name?: string; code?: string }>;
    roles?: string[];
    matrix?: Record<string, Record<string, number>>;
    lastUpdated?: string;
  } | null>(null);
  const [matrixError, setMatrixError] = useState<string | null>(null);

  /* ── institution-level panel state ── */
  const [attendance, setAttendance] = useState<StaffAttendanceResp | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DepartmentRow[] | null>(null);
  const [departmentsError, setDepartmentsError] = useState<string | null>(null);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[] | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  /* ── hostel cluster state ── */
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecordRow[] | null>(null);
  const [attendanceRecordsError, setAttendanceRecordsError] = useState<string | null>(null);
  const [outpasses, setOutpasses] = useState<OutpassRow[] | null>(null);
  const [outpassesError, setOutpassesError] = useState<string | null>(null);
  const [leaves, setLeaves] = useState<OutpassRow[] | null>(null);
  const [leavesError, setLeavesError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    clearCache();
    const [passesR, studentsR, alertsR, matrixR, attR, deptR, auditR, attRecR, outR, leaveR] = await Promise.all([
      fetchJson("/api/passes?status=PENDING&limit=100"),
      fetchJson("/api/students?scope=active"),
      fetchJson("/api/alerts?resolved=false"),
      fetchJson("/api/occupancy/presence-matrix"),
      fetchJson("/api/staff/attendance"),
      fetchJson("/api/departments"),
      fetchJson("/api/principal/audit"),
      fetchJson("/api/attendance_records?limit=50"),
      fetchJson("/api/permissions?workflow_type=outpass&status=PENDING"),
      fetchJson("/api/permissions?workflow_type=staff_leave&status=PENDING"),
    ]);
    setPasses(passesR.success ? ((passesR.data as GatePass[]) ?? []) : null);
    setPassesError(passesR.success ? null : passesR.error?.message ?? "Unknown error");
    setStudents(studentsR.success ? ((studentsR.data as Person[]) ?? []) : null);
    setAlerts(alertsR.success ? ((alertsR.data as Alert[]) ?? []) : null);
    setAlertsError(alertsR.success ? null : alertsR.error?.message ?? "Unknown error");
    setMatrix(matrixR.success ? (matrixR.data ?? null) : null);
    setMatrixError(matrixR.success ? null : matrixR.error?.message ?? "Unknown error");
    setAttendance(attR.success ? ((attR.data as StaffAttendanceResp) ?? null) : null);
    setAttendanceError(attR.success ? null : attR.error?.message ?? "Unknown error");
    setDepartments(deptR.success ? ((deptR.data as DepartmentRow[]) ?? []) : null);
    setDepartmentsError(deptR.success ? null : deptR.error?.message ?? "Unknown error");
    setAuditRecords(auditR.success ? ((auditR.data as AuditRecord[]) ?? []) : null);
    setAuditError(auditR.success ? null : auditR.error?.message ?? "Unknown error");
    setAttendanceRecords(attRecR.success ? ((attRecR.data as AttendanceRecordRow[]) ?? []) : null);
    setAttendanceRecordsError(attRecR.success ? null : attRecR.error?.message ?? "Unknown error");
    setOutpasses(outR.success ? ((outR.data as OutpassRow[]) ?? []) : null);
    setOutpassesError(outR.success ? null : outR.error?.message ?? "Unknown error");
    setLeaves(leaveR.success ? ((leaveR.data as OutpassRow[]) ?? []) : null);
    setLeavesError(leaveR.success ? null : leaveR.error?.message ?? "Unknown error");
    setLastRefresh(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const onCampusNow = students?.length ?? 0;
  const pendingPasses = passes?.length ?? 0;
  const activeAlerts = alerts?.length ?? 0;

  const lastBreach = useMemo(() => {
    if (!alerts || alerts.length === 0) return null;
    const curfew = alerts.filter((a) => {
      const t = `${a.title} ${a.message}`.toLowerCase();
      return t.includes("curfew") || t.includes("late night") || a.severity === "critical";
    });
    const src = curfew.length > 0 ? curfew : alerts;
    const sorted = [...src].sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));
    return sorted[0] ?? null;
  }, [alerts]);

  const kpis: Array<{ icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; sub: string; accent: string }> = [
    {
      icon: UserCheck,
      label: "On-Campus Now",
      value: students === null ? "…" : onCampusNow,
      sub: "Active students not checked out",
      accent: "text-emerald-400",
    },
    {
      icon: Inbox,
      label: "Pending Passes",
      value: passes === null ? "…" : pendingPasses,
      sub: "Awaiting a decision",
      accent: pendingPasses > 0 ? "text-amber-400" : "text-emerald-400",
    },
    {
      icon: Siren,
      label: "Active Alerts",
      value: alerts === null ? "…" : activeAlerts,
      sub: "Unresolved campus alerts",
      accent: activeAlerts > 0 ? "text-rose-400" : "text-emerald-400",
    },
    {
      icon: Clock,
      label: "Last Curfew Breach",
      value: lastBreach ? fmtTime(lastBreach.timestamp) : "None",
      sub: lastBreach
        ? `${lastBreach.title}${lastBreach.studentRoll ? ` · ${lastBreach.studentRoll}` : ""}`
        : "No curfew alerts on record",
      accent: lastBreach ? "text-rose-400" : "text-emerald-400",
    },
  ];

  const anyError = passesError || alertsError || matrixError;

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 px-4 sm:px-6 py-6 sm:py-8 min-w-0">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono">{role}</span> · tier {tier} · campus-wide oversight
            {lastRefresh && <span className="ml-2">· last refresh {fmtTime(lastRefresh.toISOString())}</span>}
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={refreshing}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-50 flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {anyError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="min-w-0">
            Data fetch failed: {anyError}
            <button onClick={() => void refresh()} className="ml-2 underline text-amber-300 hover:text-amber-200">
              retry
            </button>
          </span>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
        {kpis.map((k) => (
          <StatCard key={k.label} icon={k.icon} label={k.label} value={k.value} sub={k.sub} accent={k.accent} />
        ))}
      </div>

      {/* ── Institution-level panels ── */}

      {/* 2. Institutional Attendance */}
      <WidgetBoundary title="Institutional Attendance">
        <AttendancePanel
          data={attendance}
          loading={attendance === null && !attendanceError}
          error={attendanceError}
        />
      </WidgetBoundary>

      {/* 3. Gate Activity Overview (reuses matrix data) */}
      <WidgetBoundary title="Gate Activity">
        <GateActivityPanel
          matrix={matrix}
          loading={matrix === null && !matrixError}
          error={matrixError}
        />
      </WidgetBoundary>

      {/* 4. Department Performance */}
      <WidgetBoundary title="Department Performance">
        <DepartmentPerformancePanel
          departments={departments}
          students={students}
          loading={departments === null && students === null}
          error={departmentsError}
        />
      </WidgetBoundary>

      {/* 5. Incident Oversight */}
      <WidgetBoundary title="Incident Oversight">
        <IncidentOversightPanel
          alerts={alerts}
          loading={alerts === null && !alertsError}
          error={alertsError}
        />
      </WidgetBoundary>

      {/* 6. Institutional Reports */}
      <WidgetBoundary title="Institutional Reports">
        <InstitutionalReportsPanel
          attendance={attendance}
          students={students}
          loading={attendance === null && students === null}
        />
      </WidgetBoundary>

      {/* 7. Approvals and Decisions — consolidated single PermissionList */}
      <WidgetBoundary title="Approvals and Decisions">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
            <Users className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Approvals &amp; Decisions — Principal Stage
            </span>
          </div>
          <PermissionList
            title="Pending Approvals"
            workflowType="exam"
            currentStage="principal"
            fetchUrl="/api/permissions?workflow_type=exam&stage=principal&status=PENDING"
            allowForward={false}
          />
        </div>
      </WidgetBoundary>

      {/* 8. Audit and Compliance */}
      <WidgetBoundary title="Audit and Compliance">
        <AuditCompliancePanel
          records={auditRecords}
          loading={auditRecords === null && !auditError}
          error={auditError}
        />
      </WidgetBoundary>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <HostelOccupancyPanel roster={students} />
        <AlertsPanel alerts={alerts} loading={alerts === null} error={alertsError} />
      </div>

      <PresenceMatrixPanel matrixData={matrix} loading={matrix === null} error={matrixError} />

      {/* ── Hostel & Residents cluster ── */}
      <div className="space-y-4 sm:space-y-5 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] pt-2">
          Hostel &amp; Residents
        </p>
        <HostelOverviewPanel
          matrix={matrix}
          pendingApprovals={(outpasses?.length ?? 0) + (leaves?.length ?? 0)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <ResidentDirectoryPanel
            records={attendanceRecords}
            loading={attendanceRecords === null && !attendanceRecordsError}
            error={attendanceRecordsError}
          />
          <HostelAttendancePanel matrix={matrix} />
        </div>
        <OutpassLeavePanel
          outpasses={outpasses}
          leaves={leaves}
          loading={outpasses === null && leaves === null}
          error={outpassesError || leavesError}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <EntryExitLogsPanel />
          <HostelIncidentsPanel alerts={alerts} loading={alerts === null} error={alertsError} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <RoomOccupancyPanel />
          <HostelReportsPanel
            auditRecords={auditRecords}
            loading={auditRecords === null && !auditError}
            error={auditError}
          />
        </div>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function PrincipalDashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PrincipalDashboardInner />
    </Suspense>
  );
}
