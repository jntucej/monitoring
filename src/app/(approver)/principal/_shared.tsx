"use client";

/* Shared helpers for principal sub-pages — extracted from the monolith
   so that each sub-route stays self-contained while reusing the same
   utility functions and response types. */

import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { clearCache, cachedFetch } from "@/hooks/useApiResource";
import { getAuthHeaders } from "@/hooks/useAuthHeaders";
import type { Alert, Person } from "@/lib/types";
import { Building2, Users } from "lucide-react";

/* ── response types ── */

export interface StaffAttendanceResp {
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

export interface AuditRecord {
  id: string;
  action: string;
  user?: { name: string };
  userId?: string;
  details?: string;
  timestamp: string;
}

export interface DepartmentRow {
  code: string;
  name: string;
  hod?: string;
  staffCount?: number;
}

export interface AttendanceRecordRow {
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

import { useMemo } from "react";

export function HostelOccupancyPanel({ roster }: { roster: Person[] | null }) {
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

/* ── Alerts panel (reused on root + incidents page) ── */

import { Siren, AlertTriangle } from "lucide-react";

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

/* ── Presence matrix panel (reused on root + gate-activity page) ── */

import { MapPin, ShieldCheck } from "lucide-react";

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

export function ResidentDirectoryPanel({
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

/* ── Entry/Exit logs panel (restricted) ── */

export function EntryExitLogsPanel() {
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

/* ── Hostel incidents panel (restricted) ── */

export function HostelIncidentsPanel({
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
          Room-level occupancy data is managed by the hostel manager and not exposed at the principal tier.
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
