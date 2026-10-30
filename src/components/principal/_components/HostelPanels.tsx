"use client";

/* ── Hostel panels: Occupancy, ResidentDirectory, Attendance, OutpassLeave ── */

import { memo } from "react";
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import type {
  OutpassRow,
  PresenceMatrixData,
} from "./types";

function PlaceholderBadge({ note }: { note: string }) {
  return (
    <span
      className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400"
      title={note}
    >
      Not connected
    </span>
  );
}

/* ── Hostel occupancy panel ── */
export const HostelOccupancyPanel = memo(function HostelOccupancyPanel() {
  return (
    <PrincipalWidgetBoundary title="Hostel Occupancy">
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
    </PrincipalWidgetBoundary>
  );
});

/* ── Resident directory panel ── */
export const ResidentDirectoryPanel = memo(function ResidentDirectoryPanel() {
  return (
    <PrincipalWidgetBoundary title="Resident Directory">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <Users className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">Resident Directory</span>
          <PlaceholderBadge note="No data source connected yet — wire to /api/students?hostel_block=… to enable" />
        </div>
        <div className="rounded-lg border border-slate-600/40 bg-slate-700/20 p-3 text-xs text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
          Resident lookup is an operator-facing tool. Block &amp; room occupancy is maintained by the hostel manager.
        </div>
      </div>
    </PrincipalWidgetBoundary>
  );
});

/* ── Hostel attendance panel ── */
export const HostelAttendancePanel = memo(function HostelAttendancePanel({ matrix }: { matrix: PresenceMatrixData | null }) {
  const gates = matrix?.gates ?? [];
  const m = matrix?.matrix ?? {};
  const roles = matrix?.roles ?? [];
  const rows = gates.map((g) => ({
    ...g,
    total: roles.reduce((s, r) => s + (m[g.id]?.[r] ?? 0), 0),
  }));
  const total = rows.reduce((s, r) => s + r.total, 0);
  return (
    <PrincipalWidgetBoundary title="Hostel Attendance">
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
    </PrincipalWidgetBoundary>
  );
});

/* ── Hostel overview panel ── */
export const HostelOverviewPanel = memo(function HostelOverviewPanel({
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
    <PrincipalWidgetBoundary title="Hostel Overview">
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
    </PrincipalWidgetBoundary>
  );
});

/* ── Outpass/Leave panel (re-export from OutpassPanel) ── */
import { OutpassLeavePanel as _OutpassLeavePanel } from "./OutpassPanel";
export const OutpassLeavePanel = _OutpassLeavePanel;
