"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role, GatePass, Alert, Person } from "@/lib/types";
import { usePolling } from "@/hooks/usePolling";
import { clearCache } from "@/hooks/useApiResource";
import Link from "next/link";
import {
  UserCheck,
  Inbox,
  Siren,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  fetchJson,
  StatCard,
  AlertsPanel,
  PresenceMatrixPanel,
  HostelOccupancyPanel,
  HostelOverviewPanel,
  ResidentDirectoryPanel,
  HostelAttendancePanel,
  OutpassLeavePanel,
  EntryExitLogsPanel,
  HostelIncidentsPanel,
  RoomOccupancyPanel,
  HostelReportsPanel,
  PresenceMatrixData,
  OutpassRow,
  AttendanceRecordRow,
  AuditRecord,
} from "./_shared";
import { QuickActions } from "@/components/shared/QuickActions";
import { LiveActivityFeed } from "@/components/shared/LiveActivityFeed";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { ApprovalInbox } from "@/components/shared/ApprovalInbox";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { ContributionPortfolio } from "@/components/retention/ContributionPortfolio";
import { CampusFeedbackDesk } from "@/components/retention/CampusFeedbackDesk";
import { RoleAnalytics } from "@/components/retention/RoleAnalytics";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { AuthGuard } from "@/components/shared/AuthGuard";

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
  const [matrix, setMatrix] = useState<PresenceMatrixData | null>(null);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[] | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecordRow[] | null>(null);
  const [attendanceRecordsError, setAttendanceRecordsError] = useState<string | null>(null);
  const [outpasses, setOutpasses] = useState<OutpassRow[] | null>(null);
  const [leaves, setLeaves] = useState<OutpassRow[] | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    clearCache();
    const [passesR, studentsR, alertsR, matrixR, auditR, attRecR, outR, leaveR] = await Promise.all([
      fetchJson("/api/passes?status=PENDING&limit=100"),
      fetchJson("/api/students?scope=active"),
      fetchJson("/api/alerts?resolved=false"),
      fetchJson("/api/occupancy/presence-matrix"),
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
    setMatrix(matrixR.success ? ((matrixR.data as PresenceMatrixData) ?? null) : null);
    setMatrixError(matrixR.success ? null : matrixR.error?.message ?? "Unknown error");
    setAuditRecords(auditR.success ? ((auditR.data as AuditRecord[]) ?? []) : null);
    setAttendanceRecords(attRecR.success ? ((attRecR.data as AttendanceRecordRow[]) ?? []) : null);
    setAttendanceRecordsError(attRecR.success ? null : attRecR.error?.message ?? "Unknown error");
    setOutpasses(outR.success ? ((outR.data as OutpassRow[]) ?? []) : null);
    setLeaves(leaveR.success ? ((leaveR.data as OutpassRow[]) ?? []) : null);
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

  const fmtTime = (iso: string | null | undefined): string => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const kpis: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    sub: string;
    accent: string;
  }> = [
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

  const pendingHostelApprovals = (outpasses?.length ?? 0) + (leaves?.length ?? 0);

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 px-4 sm:px-6 py-6 sm:py-8 min-w-0">
      {/* Page toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono">{role}</span> · tier {tier} · campus-wide oversight
            {lastRefresh && (
              <span className="ml-2">
                · last refresh {new Date(lastRefresh).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Global error banner */}
      {anyError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="min-w-0">
            Data fetch failed: {anyError}
            <button
              type="button"
              onClick={() => void refresh()}
              className="ml-2 underline text-amber-300 hover:text-amber-200"
            >
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

      {/* Live gate presence */}
      <PresenceMatrixPanel matrixData={matrix} loading={matrix === null && !matrixError} error={matrixError} />

      {/* Hostel occupancy + active alerts side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
        <HostelOccupancyPanel roster={students} />
        <AlertsPanel alerts={alerts} loading={alerts === null && !alertsError} error={alertsError} />
      </div>

      {/* Hostel & Residents cluster */}
      <div className="space-y-4 sm:space-y-5 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] pt-2">
          Hostel &amp; Residents
        </p>
        <HostelOverviewPanel matrix={matrix} pendingApprovals={pendingHostelApprovals} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
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
          error={null}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
          <EntryExitLogsPanel />
          <HostelIncidentsPanel alerts={alerts} loading={alerts === null && !alertsError} error={alertsError} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
          <RoomOccupancyPanel />
          <HostelReportsPanel
            auditRecords={auditRecords}
            loading={auditRecords === null}
            error={null}
          />
        </div>
      </div>

      {/* Quick links — all 12 spec sections */}
      <WidgetBoundary title="Section Quick Links">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
          {[
            { href: "/principal/all-pass-requests", label: "All Pass Requests", desc: "Every request at your stage" },
            { href: "/principal/approval-centre", label: "Approval Centre", desc: "Pending, rejected, overdue, escalated" },
            { href: "/principal/departments", label: "Departments", desc: "Department directory & HODs" },
            { href: "/principal/department-analytics", label: "Dept Analytics", desc: "Headcount & turnaround by department" },
            { href: "/principal/hostel-oversight", label: "Hostel Oversight", desc: "Occupancy, outpasses, escalations" },
            { href: "/principal/examination-oversight", label: "Examination Oversight", desc: "Exam clearances & analytics" },
            { href: "/principal/incidents", label: "Incident Centre", desc: "Active alerts & resolution" },
            { href: "/principal/delegation-manager", label: "Delegation Manager", desc: "Acting authorities & periods" },
            { href: "/principal/permission-management", label: "Permission Management", desc: "Grant/review/revoke permissions" },
            { href: "/principal/reports", label: "Reports & Exports", desc: "Institutional reports desk" },
            { href: "/principal/audit", label: "Audit & Accountability", desc: "Decisions, overrides, delegations" },
            { href: "/principal/emergency-decisions", label: "Emergency Decisions", desc: "Exceptional, audited exceptions" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 hover:bg-[var(--bg-elevated)] hover:border-[var(--action-primary)]/40 transition-colors min-w-0"
            >
              <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--action-primary)] transition-colors">
                {l.label}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{l.desc}</p>
            </Link>
          ))}
        </div>
      </WidgetBoundary>

      {/* Live activity feed */}
      <WidgetBoundary title="Live Activity">
        <LiveActivityFeed limit={8} />
      </WidgetBoundary>

      {/* Quick panel */}
      <WidgetBoundary title="Quick Panel">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
          <QuickActions />
          <NotificationCenter />
        </div>
      </WidgetBoundary>

      <AttentionQueue />
      <ActivityTimeline />

      {/* Campus services */}
      <WidgetBoundary title="Campus Services">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
          <PersonalizedCampusHome />
          <TaskContinuity />
          <ContributionPortfolio />
          <CampusFeedbackDesk />
        </div>
      </WidgetBoundary>

      {/* Approvals & analytics */}
      <WidgetBoundary title="Approvals & Analytics">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
          <ApprovalInbox />
          <RoleAnalytics />
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}
export default function PrincipalDashboardPage() {
  return (
    <AuthGuard allowedRoles={['principal', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <PrincipalDashboardInner />
      </Suspense>
    </AuthGuard>
  );
}
