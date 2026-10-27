<<<<<<< HEAD
"use client";

export const dynamic = "force-dynamic";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  AlertTriangle,
  Users,
  CheckSquare,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  UserCheck,
  DoorOpen,
  Home,
  ShieldAlert,
  Lock,
  Download,
  Zap,
  Grid,
  List,
  MapPin,
  Loader2,
  Inbox,
  ScrollText,
  BellOff,
  ArrowRight,
  FileText,
  KeySquare,
  HandHelping,
  ClipboardCheck,
} from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
=======
import { Suspense } from "react";
import { ShieldAlert } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { RoleDashboardPanel } from "@/components/approver/RoleDashboardPanel";

export default function SupervisorPage() {
  return (
<<<<<<< HEAD
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 text-slate-400 min-w-0">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide truncate">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-slate-500 min-w-0">{sub}</p>}
    </div>
  );
}

function EmptyState({ message, restricted }: { message: string; restricted?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-8 text-center text-sm min-w-0 ${
        restricted
          ? "border-dashed border-slate-700 bg-slate-800/30 text-slate-500"
          : "border border-slate-800 bg-[#111827] text-slate-400"
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        {restricted ? <Lock className="w-5 h-5 text-slate-600" /> : <Inbox className="w-5 h-5 text-slate-600" />}
        <p className="max-w-md">{message}</p>
      </div>
    </div>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
      <Loader2 className="w-4 h-4 animate-spin shrink-0" /> {label}
    </div>
  );
}

/** Panel chrome for the 8 security sections: header + body with loading / error / empty handling. */
function SectionPanel({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
      <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm font-semibold text-white truncate">{title}</span>
        </div>
        {subtitle && <span className="text-xs text-slate-500 shrink-0">{subtitle}</span>}
      </div>
      <div className="p-4 min-w-0">{children}</div>
    </section>
  );
}

function PanelError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
      <span className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      <button
        onClick={onRetry}
        className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

/* ── 8 named security sections ── */

function SecurityOverviewSection({
  lockdown,
  lockdownLoading,
  lockdownError,
  onRetryLockdown,
  presence,
  presenceLoading,
  presenceError,
  onRetryPresence,
  alerts,
  alertsLoading,
  alertsError,
  onRetryAlerts,
  staff,
  staffLoading,
  staffError,
  onRetryStaff,
}: {
  lockdown: LockdownResponse | null;
  lockdownLoading: boolean;
  lockdownError: string | null;
  onRetryLockdown: () => void;
  presence: PresenceMatrixResponse | null;
  presenceLoading: boolean;
  presenceError: string | null;
  onRetryPresence: () => void;
  alerts: Alert[];
  alertsLoading: boolean;
  alertsError: string | null;
  onRetryAlerts: () => void;
  staff: StaffAttendanceResponse | null;
  staffLoading: boolean;
  staffError: string | null;
  onRetryStaff: () => void;
}) {
  const matrix = presence?.data?.matrix ?? {};
  const gates = presence?.data?.gates ?? [];
  const onCampusTotal = gates.reduce(
    (sum, g) => sum + Object.values(matrix[g.id] ?? {}).reduce((a, b) => a + b, 0),
    0
  );
  const lockdownActive = Boolean(lockdown?.data);
  const summary = staff?.summary;

  return (
    <SectionPanel icon={ShieldCheck} title="Security Overview" subtitle="live KPIs">
      {(lockdownError || presenceError || alertsError || staffError) && (
        <div className="space-y-2 mb-3">
          {lockdownError && <PanelError message={`Lockdown state unavailable: ${lockdownError}`} onRetry={onRetryLockdown} />}
          {presenceError && <PanelError message={`Live campus presence unavailable: ${presenceError}`} onRetry={onRetryPresence} />}
          {alertsError && <PanelError message={`Alert feed unavailable: ${alertsError}`} onRetry={onRetryAlerts} />}
          {staffError && <PanelError message={`Staff attendance unavailable: ${staffError}`} onRetry={onRetryStaff} />}
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
        <StatCard
          icon={Lock}
          label="Lockdown"
          value={lockdownActive ? "Active" : "None"}
          sub={lockdownActive ? safeText(lockdown?.data?.reason, "Raised") : "No active lockdown"}
          accent={lockdownActive ? "text-rose-400" : "text-emerald-400"}
          loading={lockdownLoading && !lockdown}
        />
        <StatCard
          icon={DoorOpen}
          label="On Campus"
          value={onCampusTotal}
          sub={`${gates.length || "…"} active gates in live presence matrix`}
          accent="text-sky-400"
          loading={presenceLoading && !presence}
        />
        <StatCard
          icon={AlertTriangle}
          label="Active Alerts"
          value={alertsLoading && !alerts ? "…" : alerts.length}
          sub="Incidents currently unacknowledged"
          accent={alerts.length > 0 ? "text-rose-400" : "text-emerald-400"}
          loading={alertsLoading && !alerts}
        />
        <StatCard
          icon={Users}
          label="Staff Present / Absent"
          value={staffLoading && !staff ? "…" : `${summary?.presentToday ?? 0} / ${summary ? (summary.totalStaff ?? 0) - (summary.presentToday ?? 0) : "…"}`}
          sub={`Today's staff check-ins (${summary?.overallAttendanceRate ?? "…"}% attendance rate)`}
          accent="text-amber-400"
          loading={staffLoading && !staff}
        />
      </div>
    </SectionPanel>
  );
}

function GateStatusSection({
  presence,
  presenceLoading,
  presenceError,
  onRetryPresence,
  lockdown,
  lockdownError,
}: {
  presence: PresenceMatrixResponse | null;
  presenceLoading: boolean;
  presenceError: string | null;
  onRetryPresence: () => void;
  lockdown: LockdownResponse | null;
  lockdownError: string | null;
}) {
  const gates = presence?.data?.gates ?? [];
  const matrix = presence?.data?.matrix ?? {};
  const activeLockdown = Boolean(lockdown?.data);

  return (
    <SectionPanel icon={DoorOpen} title="Gate Status" subtitle="live presence by gate">
      {presenceError ? (
        <PanelError message={`Live gate presence unavailable: ${presenceError}`} onRetry={onRetryPresence} />
      ) : presenceLoading && !presence ? (
        <LoadingRow label="Loading gate presence…" />
      ) : (
        <div className="space-y-3 min-w-0">
          {activeLockdown && !lockdownError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-center gap-2 min-w-0">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span className="min-w-0">
                <span className="font-semibold">Active lockdown in effect</span>
                {lockdown?.data?.reason ? ` — ${safeText(lockdown.data.reason)}` : ""}
              </span>
            </div>
          )}
          {gates.length === 0 ? (
            <EmptyState message="No active gates in the live presence matrix." />
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-3 py-2">Gate</th>
                    <th className="text-left px-3 py-2">Audience</th>
                    <th className="text-left px-3 py-2">On Campus</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {gates.map((g) => {
                    const inside = Object.values(matrix[g.id] ?? {}).reduce((a, b) => a + b, 0);
                    const status = activeLockdown ? "LOCKDOWN" : inside > 0 ? "CLEAR" : "IDLE";
                    return (
                      <tr key={g.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-3 py-2.5 text-slate-200 font-medium min-w-0">
                          {g.name}
                          <span className="ml-2 font-mono text-[10px] text-slate-500">{g.code}</span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 capitalize">{g.audience}</td>
                        <td className="px-3 py-2.5 font-mono text-sky-400">{inside}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              status === "LOCKDOWN"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                : status === "CLEAR"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-slate-500/10 text-slate-400 border-slate-600/40"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </SectionPanel>
  );
}

function AssignedGateActivitySection({
  presence,
  presenceLoading,
  presenceError,
  onRetryPresence,
}: {
  presence: PresenceMatrixResponse | null;
  presenceLoading: boolean;
  presenceError: string | null;
  onRetryPresence: () => void;
}) {
  const gates = presence?.data?.gates ?? [];
  const matrix = presence?.data?.matrix ?? {};

  return (
    <SectionPanel icon={MapPin} title="Assigned Gate Activity" subtitle="per-gate live presence">
      {presenceError ? (
        <PanelError message={`Live gate presence unavailable: ${presenceError}`} onRetry={onRetryPresence} />
      ) : presenceLoading && !presence ? (
        <LoadingRow label="Loading gate presence…" />
      ) : gates.length === 0 ? (
        <EmptyState message="No active gates in the live presence matrix." />
      ) : (
        <div className="space-y-3 min-w-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 min-w-0">
            {gates.map((g) => {
              const inside = Object.values(matrix[g.id] ?? {}).reduce((a, b) => a + b, 0);
              return (
                <div key={g.id} className="rounded-xl border border-slate-800 bg-slate-800/40 p-3 min-w-0">
                  <p className="text-xs font-semibold text-slate-300 truncate">{g.name}</p>
                  <p className="text-[10px] font-mono text-slate-500">{g.code}</p>
                  <p className="text-lg font-bold text-sky-400 mt-1">{inside} <span className="text-xs font-normal text-slate-500">on campus</span></p>
                </div>
              );
            })}
          </div>
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-3 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <span>Assigned-gate detail (duty rosters per gate) is not exposed at this tier.</span>
            <a href="/gates" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 shrink-0">
              Gate desk <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </SectionPanel>
  );
}

function GuardShiftSection({
  staff,
  staffLoading,
  staffError,
  onRetryStaff,
}: {
  staff: StaffAttendanceResponse | null;
  staffLoading: boolean;
  staffError: string | null;
  onRetryStaff: () => void;
}) {
  const summary = staff?.summary;
  const records = staff?.records ?? [];

  return (
    <SectionPanel icon={UserCheck} title="Guard and Shift Management" subtitle="today's staff / security attendance">
      {staffError ? (
        <PanelError message={`Attendance feed unavailable: ${staffError}`} onRetry={onRetryStaff} />
      ) : staffLoading && !staff ? (
        <LoadingRow label="Loading attendance…" />
      ) : (
        <div className="space-y-3 min-w-0">
          <div className="grid grid-cols-3 gap-2 min-w-0">
            <StatCard
              icon={CheckCircle}
              label="Present Today"
              value={summary?.presentToday ?? 0}
              sub="Checked in today"
              accent="text-emerald-400"
            />
            <StatCard
              icon={XCircle}
              label="Absent Today"
              value={summary ? (summary.totalStaff ?? 0) - (summary.presentToday ?? 0) : 0}
              sub="No check-in today"
              accent="text-rose-400"
            />
            <StatCard
              icon={Clock}
              label="Attendance Rate"
              value={`${summary?.overallAttendanceRate ?? 0}%`}
              sub={`${summary?.totalStaff ?? 0} staff on the roll`}
              accent="text-amber-400"
            />
          </div>
          {records.length > 0 && (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-3 py-2">Staff</th>
                    <th className="text-left px-3 py-2">Designation</th>
                    <th className="text-left px-3 py-2">First In</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {records.slice(0, 8).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-2.5 text-slate-200 min-w-0">
                        <span className="truncate font-medium">{r.fullName}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">{safeText(r.designation)}</td>
                      <td className="px-3 py-2.5 text-slate-400 font-mono text-xs">{r.firstInTime ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                            r.status === "ABSENT"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-3 text-xs text-slate-500 min-w-0">
            Guard rosters and shift assignments are not exposed at this tier — no dedicated
            guard/shift feed is available. Attendance above is the only staff signal this
            dashboard surfaces.
          </div>
        </div>
      )}
    </SectionPanel>
  );
}

function AccessExceptionsSection({
  staffLeave,
  staffLeaveLoading,
  staffLeaveError,
  onRetryStaffLeave,
  outpass,
  outpassLoading,
  outpassError,
  onRetryOutpass,
}: {
  staffLeave: PermissionsResponse | null;
  staffLeaveLoading: boolean;
  staffLeaveError: string | null;
  onRetryStaffLeave: () => void;
  outpass: PermissionsResponse | null;
  outpassLoading: boolean;
  outpassError: string | null;
  onRetryOutpass: () => void;
}) {
  const rows = [
    ...(staffLeave?.data ?? []).map((r) => ({ ...r, source: "staff-leave" as const })),
    ...(outpass?.data ?? []).map((r) => ({ ...r, source: "outpass" as const })),
  ];

  return (
    <SectionPanel icon={KeySquare} title="Access Exceptions" subtitle="pending staff leave & outpass">
      {(staffLeaveError || outpassError) && (
        <div className="space-y-2 mb-3">
          {staffLeaveError && <PanelError message={`Staff leave queue unavailable: ${staffLeaveError}`} onRetry={onRetryStaffLeave} />}
          {outpassError && <PanelError message={`Outpass queue unavailable: ${outpassError}`} onRetry={onRetryOutpass} />}
        </div>
      )}
      {staffLeaveLoading && !staffLeave ? (
        <LoadingRow label="Loading pending access exceptions…" />
      ) : rows.length === 0 ? (
        <EmptyState message="No pending access exceptions. Staff leave and outpass queues are clear." />
      ) : (
        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-3 py-2">Ticket</th>
                <th className="text-left px-3 py-2">Applicant</th>
                <th className="text-left px-3 py-2">Workflow</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rows.slice(0, 15).map((r, i) => (
                <tr key={`${r.source}-${r.id}`} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-300 whitespace-nowrap">
                    <a
                      href={`/permissions/${r.ticket_number ?? r.id}`}
                      className="hover:text-emerald-400 whitespace-nowrap"
                    >
                      {r.ticket_number || safeText(r.id)}
                    </a>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300 min-w-0">
                    {r.student?.name || "—"}
                    {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 capitalize whitespace-nowrap">
                    {r.workflow_type?.replace(/_/g, " ") || r.source.replace("-", " ")}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-amber-400/30 bg-amber-400/10 text-amber-400 whitespace-nowrap">
                      {r.status ?? "PENDING"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                    {r.sla_deadline ? (
                      new Date(r.sla_deadline).getTime() < Date.now() ? (
                        <span className="text-rose-400">
                          Breached · {new Date(r.sla_deadline).toLocaleString()}
                        </span>
                      ) : (
                        new Date(r.sla_deadline).toLocaleString()
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2.5 border-t border-slate-800 text-xs text-slate-500 min-w-0">
            {rows.length} pending exceptions to review — decide them from the approvals desk below.
          </div>
        </div>
      )}
    </SectionPanel>
  );
}

function IncidentAssignmentSection({
  alerts,
  alertsLoading,
  alertsError,
  onRetryAlerts,
  onResolveAlert,
}: {
  alerts: Alert[];
  alertsLoading: boolean;
  alertsError: string | null;
  onRetryAlerts: () => void;
  onResolveAlert: (id: string) => void;
}) {
  return (
    <SectionPanel icon={BellOff} title="Incident Assignment" subtitle="active alerts">
      {alertsError ? (
        <PanelError message={`Alert feed unavailable: ${alertsError}`} onRetry={onRetryAlerts} />
      ) : alertsLoading && !alerts.length ? (
        <LoadingRow label="Checking active incidents…" />
      ) : alerts.length === 0 ? (
        <EmptyState message="No active incidents — all clear. The incident feed is empty for your tier right now." />
      ) : (
        <div className="space-y-2 min-w-0">
          {alerts.slice(0, 5).map((a) => (
            <div key={a.id} className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-rose-300 min-w-0 break-words">{a.title || "Incident"}</p>
                <button
                  onClick={() => onResolveAlert(a.id)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold shrink-0"
                >
                  Acknowledge
                </button>
              </div>
              <p className="text-slate-400 mt-1.5 break-words min-w-0">{a.message}</p>
              {a.severity && (
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase text-amber-400 bg-amber-500/10 border border-amber-500/30">
                  {a.severity}
                </span>
              )}
            </div>
          ))}
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-3 text-xs text-slate-500 min-w-0">
            Incident assignment and acknowledgement detail is not exposed at this tier. The
            incident log remains admin-scoped; acknowledge here or via the alerts desk.
          </div>
        </div>
      )}
    </SectionPanel>
  );
}

function ShiftHandoverSection() {
  return (
    <SectionPanel icon={ScrollText} title="Shift Handover" subtitle="log & sign-off">
      <div className="space-y-3 min-w-0">
        <EmptyState
          restricted
          message="Shift handover log is not exposed at this tier. There is no dedicated handover-log source for the supervisor desk."
        />
        <div className="flex justify-end">
          <a
            href="/supervisor?tab=approvals"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
          >
            Open approvals desk <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </SectionPanel>
  );
}

function SecurityReportsSection() {
  return (
    <SectionPanel icon={FileText} title="Security Reports" subtitle="generated reports">
      <div className="space-y-3 min-w-0">
        <EmptyState
          restricted
          message="Security reports are not exposed at this tier. No report-generation source is available to the supervisor desk."
        />
        <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 text-xs text-slate-400 min-w-0">
          <p className="text-slate-300 font-medium mb-1.5">Authority</p>
          <p>
            Supervisor manages assigned security operations. Restrict gate assignments and
            sensitive identity information according to duty.
          </p>
        </div>
        <a
          href="/supervisor?tab=approvals"
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
        >
          Review pending approvals <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </SectionPanel>
  );
}

/* ── main content ── */

function SupervisorDashboardInner() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "security";
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Deep-link helper: switching tabs also syncs ?tab= into the URL (history
  // replaceState only — no navigation) so "View Full Desk" is refresh-safe and the
  // tab controls stay in the same state.
  const switchTab = useCallback((tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "supervisor") as Role;
  const tier = getRoleTier(role);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [passes, setPasses] = useState<GatePass[]>([]);
  const [students, setStudents] = useState<WardenStudent[]>([]);
  const [actionState, setActionState] = useState<Record<string, "approving" | "rejecting">>({});
  const [rejectComment, setRejectComment] = useState<Record<string, string>>({});
  const [studentSearch, setStudentSearch] = useState("");
  const [hostelFilter, setHostelFilter] = useState("ALL");

  // Lockdown is admin-managed. This desk READS the active lockdown state from the
  // role-scoped mirror endpoint (never /api/admin/*); raise/lift stays admin-only.
  const [selectedPasses, setSelectedPasses] = useState<string[]>([]);
  const [verifiedParents, setVerifiedParents] = useState<Record<string, boolean>>({});
  const [passTypeFilter, setPassTypeFilter] = useState<string>("ALL");
  const [rosterViewMode, setRosterViewMode] = useState<"list" | "heatmap">("list");
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [studentStrikes, setStudentStrikes] = useState<Record<string, number>>({});
  const [gates, setGates] = useState<Gate[] | null>(null);

  // The 8 security sections pull from the supervisor-tier endpoints (all 200 for
  // this role); restricted panels show clean empty-states and NEVER call
  // /api/gates, /api/admin/* or any endpoint that 403s for the supervisor.
  const {
    data: lockdown,
    loading: lockdownLoading,
    error: lockdownError,
    refresh: refreshLockdown,
  } = useApiResource<LockdownResponse>("/api/lockdown/active", { ttlMs: 30_000 });

  const {
    data: presence,
    loading: presenceLoading,
    error: presenceError,
    refresh: refreshPresence,
  } = useApiResource<PresenceMatrixResponse>("/api/occupancy/presence-matrix", {
    ttlMs: 30_000,
  });

  const {
    data: alertsRes,
    loading: alertsLoading,
    error: alertsError,
    refresh: refreshAlerts,
  } = useApiResource<{ success: boolean; data: Alert[] }>("/api/alerts?limit=5", {
    ttlMs: 30_000,
  });
  const alerts = alertsRes?.data ?? [];

  const {
    data: staff,
    loading: staffLoading,
    error: staffError,
    refresh: refreshStaff,
  } = useApiResource<StaffAttendanceResponse>("/api/staff/attendance", {
    ttlMs: 30_000,
  });

  const {
    data: staffLeave,
    loading: staffLeaveLoading,
    error: staffLeaveError,
    refresh: refreshStaffLeave,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflow_type=staff_leave&status=PENDING",
    { ttlMs: 30_000 }
  );

  const {
    data: outpass,
    loading: outpassLoading,
    error: outpassError,
    refresh: refreshOutpass,
  } = useApiResource<PermissionsResponse>("/api/permissions?workflow_type=outpass&status=PENDING", {
    ttlMs: 30_000,
  });

  const refreshSecurity = useCallback(async () => {
    clearCache();
    await Promise.all([
      refreshLockdown(),
      refreshPresence(),
      refreshAlerts(),
      refreshStaff(),
      refreshStaffLeave(),
      refreshOutpass(),
    ]);
  }, [refreshLockdown, refreshPresence, refreshAlerts, refreshStaff, refreshStaffLeave, refreshOutpass]);

  // Prune any pass selections that no longer exist (e.g. after an approve/reject
  // removes a card, or after a live refresh) so the bulk bar count never shows a
  // stale number and "Select All" toggle logic stays consistent.
  useEffect(() => {
    setSelectedPasses((prev) => prev.filter((id) => passes.some((p) => p.id === id)));
  }, [passes]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    setActiveTab(tabParam || "security");
  }, [searchParams]);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [passesRes, studentsRes] = await Promise.all([
        fetch("/api/passes?status=PENDING", { headers: getAuthHeaders(), cache: "no-store" }),
        fetch("/api/students", { headers: getAuthHeaders(), cache: "no-store" }),
      ]);

      // Never fabricate: only read a body from a response that actually succeeded,
      // and surface partial failure instead of silently rendering an empty dashboard.
      // (The legacy alerts desk was replaced by the Security tab's incident
      // section, which reads /api/alerts?limit=5 through useApiResource.)
      const readJson = async (r: Response) => (r.ok ? ((await r.json())?.data ?? []) : []);
      const [loadedPasses, loadedStudents] = await Promise.all([
        readJson(passesRes),
        readJson(studentsRes),
      ]);

      const failed: string[] = [];
      if (!passesRes.ok) failed.push("passes");
      if (!studentsRes.ok) failed.push("students");
      if (failed.length === 2) throw new Error("All telemetry sources unavailable");
      if (failed.length) setError(`Could not load: ${failed.join(", ")}`);

      const safe = <T,>(v: T): T[] => (Array.isArray(v) ? v : []);
      setPasses(safe(loadedPasses));
      setStudents(safe(loadedStudents));
    } catch (err: any) {
      setError(err?.message || "Failed to load telemetry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Live toggle drives refetch; polls every 20s while Live.
  useLiveRefresh(loadData, { intervalMs: 20000 });

  // Poll the security-tier endpoints on a 30s cadence while signed in.
  usePolling(refreshSecurity, { intervalMs: 30_000, enabled: !!user });

  const handlePassAction = async (passId: string, action: "approve" | "reject", comment: string) => {
    if (action === "reject" && !comment.trim()) {
      setRejectComment((prev) => ({ ...prev, [`${passId}_err`]: "1" }));
      return;
    }
    setActionState((prev) => ({ ...prev, [passId]: action === "approve" ? "approving" : "rejecting" }));
    try {
      const res = await fetch(`/api/passes/${passId}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      });
      const json = await res.json();
      if (json.success) {
        setPasses((prev) => prev.filter((p) => p.id !== passId));
      } else setError(json.error?.message || "Action failed");
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setActionState((prev) => { const n = { ...prev }; delete n[passId]; return n; });
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: true }),
      });
      const json = await res.json();
      if (json.success) {
        // Acknowledgement clears the incident from the security section's feed on
        // the next poll; the 30s cache keeps the list consistent without a second
        // fetch on this critical path.
      }
    } catch (e) { console.error(e); }
  };

  const handleBulkAction = async (action: "approve" | "reject") => {
    if (selectedPasses.length === 0) return;
    await Promise.all(selectedPasses.map(passId =>
      handlePassAction(passId, action, action === "approve" ? "Bulk Approved" : "Bulk Rejected")
    ));
    setSelectedPasses([]);
  };

  const togglePassSelection = (id: string) => {
    setSelectedPasses((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleAddStrike = (studentId: string) => {
    // session-local only — database/schema.sql has no curfew_strikes table, so
    // there is nowhere to persist this. Keep it in memory and surface that it
    // is NOT saved, rather than POSTing to a route that cannot work.
    setStudentStrikes((prev) => ({ ...prev, [studentId]: (prev[studentId] || 0) + 1 }));
  };

  const handleToggleLockdown = () => {
    // Lockdown is an admin capability — a supervisor cannot raise or lift it.
    // Surface a clear message instead of calling the admin endpoint.
    setError("Emergency lockdown can only be raised or lifted by an administrator.");
  };

  const exportMovementCSV = () => {
    const headers = ["Student Name", "Roll / ID", "Hostel Block", "Room", "Campus Status", "Curfew Violations"];
    const rows = students.map((s) => [
      `"${s.fullName}"`,
      `"${s.roll || s.uniqueId}"`,
      `"${s.hostelBlock || "N/A"}"`,
      `"${s.roomNumber || "N/A"}"`,
      `"${s.status === "ACTIVE" || !s.checkedOutAt ? "INSIDE CAMPUS" : "OUTSIDE (ON PASS)"}"`,
      studentStrikes[s.id] || 0,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hostel_movement_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPasses = passes.filter((p) => {
    if (passTypeFilter === "ALL") return true;
    if (passTypeFilter === "DAY_PASS") return p.reason?.toLowerCase().includes("day");
    if (passTypeFilter === "HOME_OUT") return p.reason?.toLowerCase().includes("home");
    if (passTypeFilter === "DAILY_OUTING") return p.reason?.toLowerCase().includes("daily") || p.reason?.toLowerCase().includes("outing") || p.reason?.toLowerCase().includes("short");
    return true;
  });

  const filteredStudents = students.filter((s) => {
    const matchSearch = !studentSearch || s.fullName?.toLowerCase().includes(studentSearch.toLowerCase()) || (s.roll || s.uniqueId)?.toLowerCase().includes(studentSearch.toLowerCase());
    const matchHostel = hostelFilter === "ALL" || (hostelFilter === "INSIDE" && (s.status === "ACTIVE" || !s.checkedOutAt)) || (hostelFilter === "OUTSIDE" && s.checkedOutAt);
    return matchSearch && matchHostel;
  });

  const totalStaff = staff?.summary?.totalStaff ?? 0;
  const presentToday = staff?.summary?.presentToday ?? 0;

  return (
    <div className="space-y-5 sm:space-y-6 pb-8 sm:pb-12 min-w-0 mx-auto max-w-7xl px-4 py-6 md:px-6">
      {/* Page header */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-5 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 min-w-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-7 h-7 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                  <span className="sm:hidden">🏫</span>
                  <span className="hidden sm:inline">🏫 Supervisor Desk</span>
                </p>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {user?.employeeId || user?.uniqueId || "SUP-001"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 min-w-0">
                {user?.name || "Supervisor"} · tier {tier} · Real-time security & hostel curfew oversight.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
            <button
              onClick={handleToggleLockdown}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
            >
              <Lock className="w-4 h-4" />
              <span>Report Lockdown</span>
            </button>
            <button
              onClick={() => void refreshSecurity()}
              className="px-3 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold hover:bg-indigo-500/20 transition-all flex items-center gap-1.5"
            >
              {presenceLoading || staffLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={exportMovementCSV}
              className="px-3 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold hover:bg-indigo-500/20 transition-all flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-[var(--border)] overflow-x-auto no-scrollbar min-w-0">
          {[
            { id: "security", label: "Security", icon: ShieldCheck },
            { id: "approvals", label: "Outpass Approvals", icon: CheckSquare, badge: passes.length },
            { id: "curfew", label: "Wards & Curfew", icon: Clock },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => switchTab(t.id)} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 ${active ? "bg-[var(--action-primary)] text-white shadow-md shadow-[var(--action-primary)]/20" : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
                {t.badge !== undefined && t.badge > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30">{t.badge}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 8 named security sections ── */}
      {activeTab === "security" && (
        <div className="space-y-5 sm:space-y-6 min-w-0">
          <WidgetBoundary title="Security Overview">
            <SecurityOverviewSection
              lockdown={lockdown}
              lockdownLoading={lockdownLoading}
              lockdownError={lockdownError}
              onRetryLockdown={() => void refreshLockdown()}
              presence={presence}
              presenceLoading={presenceLoading}
              presenceError={presenceError}
              onRetryPresence={() => void refreshPresence()}
              alerts={alerts}
              alertsLoading={alertsLoading}
              alertsError={alertsError}
              onRetryAlerts={() => void refreshAlerts()}
              staff={staff}
              staffLoading={staffLoading}
              staffError={staffError}
              onRetryStaff={() => void refreshStaff()}
=======
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["supervisor"]}>
        <div className="space-y-6">
          <DevContactStrip />
          <WidgetBoundary>
            <RoleDashboardPanel
              title="Supervisor dashboard"
              icon={ShieldAlert}
              endpoint="/api/supervisor/escalations"
              mapKpis={(raw: any) => {
                const c = raw?.counts ?? {};
                return [
                  { label: "Escalated", value: c.escalated ?? 0, tone: "warn" as const },
                  { label: "Active alerts", value: c.alerts ?? 0, tone: "danger" as const },
                  { label: "Recent decisions", value: c.decisions ?? 0, tone: "ok" as const },
                ];
              }}
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
            />
          </WidgetBoundary>
          <WidgetBoundary><AttentionQueue /></WidgetBoundary>
          <WidgetBoundary><PersonalizedCampusHome /></WidgetBoundary>
          <WidgetBoundary><TaskContinuity /></WidgetBoundary>
          <WidgetBoundary><UnifiedCampusCalendar /></WidgetBoundary>
          <WidgetBoundary><ActivityTimeline /></WidgetBoundary>
          <WidgetBoundary><QuickActions /></WidgetBoundary>
          <WidgetBoundary><NotificationCenter /></WidgetBoundary>
        </div>
      </AuthGuard>
    </Suspense>
  );
}
