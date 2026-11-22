"use client";

/**
 * useRoleConsoleChrome — the shared data layer behind the role-console shell
 * chrome (status bar + command palette) mounted by RoleDesktopShell /
 * RoleMobileShell.
 *
 * Replicates RoleConsole's count derivations on top of the same live
 * endpoints (no extra network traffic — every fetch goes through the
 * shared useApiResource cache that the page's own boards already use),
 * and maps the caller's role to its command palette.
 *
 * The status bar + command bar components are passed from the caller as
 * render props so this hook stays data-only.
 */

import { useCallback, useMemo, useState } from "react";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
void 0;

// ── command palette map ─────────────────────────────────────────────────────
//
// Every role that mounts a shell gets its Cmd/Ctrl+K palette from here. The
// role-specific CommandBars are the canonical implementations (they carry
// the free-text command parsers); roles without one fall back to the generic
// shared CommandBar (config-driven navigation commands).
//
import { AdminCommandBar } from "@/components/approver/AdminCommandBar";
import { DeputyWardenCommandBar } from "@/components/approver/DeputyWardenCommandBar";
import { CaretakerCommandBar } from "@/components/approver/CaretakerCommandBar";
import { ExamBranchCommandBar } from "@/components/approver/ExamBranchCommandBar";
import { ExamSuperintendentCommandBar } from "@/components/approver/ExamSuperintendentCommandBar";
import { HostelManagerCommandBar } from "@/components/approver/HostelManagerCommandBar";
import { MessInchargeCommandBar } from "@/components/approver/MessInchargeCommandBar";
import { OieCommandBar } from "@/components/approver/OieCommandBar";
import { ParentCommandBar } from "@/components/approver/ParentCommandBar";
import { PermissionCommandBar } from "@/components/approver/PermissionCommandBar";
import { PrincipalCommandBar } from "@/components/approver/PrincipalCommandBar";
import { SupervisorCommandBar } from "@/components/approver/SupervisorCommandBar";
import { SysadminCommandBar } from "@/components/approver/SysadminCommandBar";
import { VpCommandBar } from "@/components/approver/VpCommandBar";
import { WorkerCommandBar } from "@/components/approver/WorkerCommandBar";
import { CommandBar } from "@/components/shared/CommandBar";
import type { ComponentType } from "react";
import type React from "react";

interface CommandBarProps {
  role: string;
  open: boolean;
  onClose: () => void;
}

const COMMAND_BARS: Record<string, ComponentType<CommandBarProps>> = {
  admin: AdminCommandBar,
  caretaker: CaretakerCommandBar,
  deputy_warden: DeputyWardenCommandBar,
  exam_branch: ExamBranchCommandBar,
  exam_superintendent: ExamSuperintendentCommandBar,
  hostel_manager: HostelManagerCommandBar,
  mess_incharge: MessInchargeCommandBar,
  oie: OieCommandBar,
  parent: ParentCommandBar,
  guardian: ParentCommandBar,
  hod: PermissionCommandBar,
  faculty: PermissionCommandBar,
  principal: PrincipalCommandBar,
  supervisor: SupervisorCommandBar,
  sysadmin: SysadminCommandBar,
  vice_principal: VpCommandBar,
  worker: WorkerCommandBar,
};

// ── shared response shapes (mirror RoleConsole's local interfaces) ─────────

interface PermissionRow {
  id: string;
  status: string;
  current_stage: string;
  routed_to_role?: string | null;
  forwarded_from_role?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

interface ExamAccessResponse {
  data?: {
    authorised?: Array<{ status: string }>;
  };
}

interface CaretakerSummaryResponse {
  data?: {
    assignedHostel?: string | null;
    pendingCount?: number;
    pendingTickets?: Array<{
      ticket_number?: string;
      status?: string;
      sla_deadline?: string | null;
    }>;
  };
}

interface HostelManagerSummaryResponse {
  data?: {
    pendingCount?: number;
    pendingTickets?: unknown[];
  };
}

interface StaffMyDayResponse {
  data?: {
    myRecent?: unknown[];
    openRequests?: unknown[];
    dutyRoster?: unknown[];
  };
}

interface ParentMeResponse {
  data?: {
    children?: Array<{ id: string; lastMovement?: { at?: string | null } | null }>;
  };
}

interface WorkerMyWorkResponse {
  data?: {
    tasks?: Array<{ status?: string }>;
  };
}

interface SupervisorEscalationsResponse {
  data?: {
    escalatedPermissions?: unknown[];
    activeAlerts?: Array<{
      severity?: string;
      gate_id?: string | null;
      gate_name?: string | null;
    }>;
    counts?: { escalated?: number; alerts?: number; decisions?: number };
  };
}

interface MessAnalyticsResponse {
  declaredPresent?: number;
  confirmedPresent?: number;
}

interface MessDaysResponse {
  data?: {
    days?: Array<{
      isActive?: boolean;
      mealType?: string | null;
      windowOpensAt?: string | null;
      windowClosesAt?: string | null;
    }>;
  };
}

interface PrincipalDashboardResponse {
  data?: {
    pendingApprovals?: number;
    recentAlerts?: unknown[];
  };
}

interface SysadminHealthResponse {
  data?: {
    status?: string;
    services?: Record<string, { status?: string }>;
    database?: { status?: string };
    gateways?: { status?: string };
  };
}

interface AdminAlertsResponse {
  data?: {
    items?: Array<{ severity?: string; resolved?: boolean }>;
    unresolvedCount?: number;
  };
}

// ── the hook ──────────────────────────────────────────────────────────────────

/** One of the 15 status bars. Counts are role-typed; the caller matches. */
export interface RoleChrome {
  /**
   * Which status-bar family to render. null = no status bar for this role
   * (the shell renders a minimal footer with just the freshness clock).
   */
  kind:
    | "oie"
    | "exam_superintendent"
    | "exam_branch"
    | "caretaker"
    | "hostel_manager"
    | "staff"
    | "parent"
    | "worker"
    | "supervisor"
    | "mess_incharge"
    | "admin"
    | "principal"
    | "vice_principal"
    | "sysadmin"
    | "generic";
  /** Live counts for the bar (null while loading). */
  counts: Record<string, unknown> | null;
  lastScan: string | null;
  refreshing: boolean;
  refresh: () => void;
  /** The role's command palette component (resolved). */
  CommandBar: ComponentType<CommandBarProps> | null;
  commandBarOpen: boolean;
  setCommandBarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Resolve the caller's shell role:
 * - guardian/parent → "parent"
 * - faculty (class_teacher / subject) → "faculty"
 * - everything else is its own manifest role.
 */
function chromeRoleFor(manifestRole: string): string {
  if (manifestRole === "guardian" || manifestRole === "parent") return "parent";
  if (manifestRole === "class_teacher" || manifestRole === "faculty") return "faculty";
  return manifestRole;
}

export function useRoleConsoleChrome(manifestRole: string): RoleChrome {
  const role = chromeRoleFor(manifestRole);
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const addToast = useUIStore((s) => s.addToast);
  const departmentId = useAuthStore((s) => s.user?.departmentId ?? null);
  void addToast; // palette handles its own toasts; kept for future refresh wiring

  const TTL = 15_000;

  // ── per-role data sources (all shared-cache; no extra traffic) ────────────

  const oieSource = role === "oie" ? "/api/oie/queue" : null;
  const { data: oieQueue, refresh: refreshOieQueue, loading: oieQueueLoading } =
    useApiResource<{ success?: boolean; data?: PermissionRow[]; total?: number }>(oieSource, { ttlMs: TTL });

  const oieExceptionsSource = role === "oie" ? "/api/exam/access-exceptions" : null;
  const { data: oieExceptions, refresh: refreshOieExceptions, loading: oieExceptionsLoading } =
    useApiResource<{ success?: boolean; data?: unknown[]; total?: number }>(oieExceptionsSource, { ttlMs: TTL });

  const examAccessSource =
    role === "oie" || role === "exam_superintendent" ? "/api/exam/access" : null;
  const { data: examAccess, refresh: refreshExamAccess, loading: examAccessLoading } =
    useApiResource<ExamAccessResponse>(examAccessSource, { ttlMs: TTL });

  const examBranchSource =
    role === "exam_branch"
      ? "/api/permissions?workflow_type=exam&limit=100"
      : null;
  const { data: examBranchQueue, refresh: refreshExamBranch, loading: examBranchLoading } =
    useApiResource<{ success?: boolean; data?: PermissionRow[] }>(examBranchSource, { ttlMs: TTL });

  const caretakerSource = role === "caretaker" ? "/api/caretaker/summary" : null;
  const { data: caretakerSummary, refresh: refreshCaretaker, loading: caretakerLoading } =
    useApiResource<CaretakerSummaryResponse>(caretakerSource, { ttlMs: TTL });

  const hostelManagerSource =
    role === "hostel_manager" ? "/api/hostel-manager/summary" : null;
  const { data: hostelManagerSummary, refresh: refreshHostelManager, loading: hostelManagerLoading } =
    useApiResource<HostelManagerSummaryResponse>(hostelManagerSource, { ttlMs: TTL });

  const staffSource = role === "staff" ? "/api/staff/my-day" : null;
  const { data: staffMyDay, refresh: refreshStaff, loading: staffLoading } =
    useApiResource<StaffMyDayResponse>(staffSource, { ttlMs: TTL });

  const parentSource = role === "parent" ? "/api/parents/me" : null;
  const { data: parentMe, refresh: refreshParent, loading: parentLoading } =
    useApiResource<ParentMeResponse>(parentSource, { ttlMs: TTL });

  const workerSource = role === "worker" ? "/api/workers/my-work" : null;
  const { data: workerWork, refresh: refreshWorker, loading: workerLoading } =
    useApiResource<WorkerMyWorkResponse>(workerSource, { ttlMs: TTL });

  const supervisorSource = role === "supervisor" ? "/api/supervisor/escalations" : null;
  const { data: supervisorFeed, refresh: refreshSupervisor, loading: supervisorLoading } =
    useApiResource<SupervisorEscalationsResponse>(supervisorSource, { ttlMs: TTL });

  const messAnalyticsSource = role === "mess_incharge" ? "/api/mess/analytics" : null;
  const { data: messAnalytics, refresh: refreshMessAnalytics, loading: messAnalyticsLoading } =
    useApiResource<MessAnalyticsResponse>(messAnalyticsSource, { ttlMs: TTL });

  const messDaysSource = role === "mess_incharge" ? "/api/mess/days" : null;
  const { data: messDays, refresh: refreshMessDays, loading: messDaysLoading } =
    useApiResource<MessDaysResponse>(messDaysSource, { ttlMs: TTL });

  const principalSource =
    role === "principal" || role === "vice_principal"
      ? "/api/principal/dashboard"
      : null;
  const { data: principalDash, refresh: refreshPrincipal, loading: principalLoading } =
    useApiResource<PrincipalDashboardResponse>(principalSource, { ttlMs: TTL });

  const sysadminSource = role === "sysadmin" ? "/api/sysadmin/application-health" : null;
  const { data: sysadminHealth, refresh: refreshSysadmin, loading: sysadminLoading } =
    useApiResource<SysadminHealthResponse>(sysadminSource, { ttlMs: TTL });

  const adminSource = role === "admin" ? "/api/admin/alerts" : null;
  const { data: adminAlerts, refresh: refreshAdmin, loading: adminLoading } =
    useApiResource<AdminAlertsResponse>(adminSource, { ttlMs: TTL });

  // ── count derivations (mirror RoleConsole exactly) ─────────────────────────

  const lastScan = useMemo(() => {
    const stamp = (): string | null => {
      const t = new Date().toISOString();
      void t;
      return new Date().toISOString();
    };
    if (oieQueueLoading || examBranchLoading || caretakerLoading || hostelManagerLoading || staffLoading || parentLoading || workerLoading || supervisorLoading || principalLoading || sysadminLoading || adminLoading || examAccessLoading || oieExceptionsLoading || messAnalyticsLoading || messDaysLoading) {
      return null;
    }
    // Freshness = now, only once at least one source has resolved.
    const resolved =
      oieQueue !== null ||
      examBranchQueue !== null ||
      caretakerSummary !== null ||
      hostelManagerSummary !== null ||
      staffMyDay !== null ||
      parentMe !== null ||
      workerWork !== null ||
      supervisorFeed !== null ||
      principalDash !== null ||
      sysadminHealth !== null ||
      adminAlerts !== null;
    return resolved ? stamp() : null;
  }, [oieQueue, examBranchQueue, caretakerSummary, hostelManagerSummary, staffMyDay, parentMe, workerWork, supervisorFeed, principalDash, sysadminHealth, adminAlerts, oieQueueLoading, examBranchLoading, caretakerLoading, hostelManagerLoading, staffLoading, parentLoading, workerLoading, supervisorLoading, principalLoading, sysadminLoading, adminLoading, examAccessLoading, oieExceptionsLoading, messAnalyticsLoading, messDaysLoading]);

  const counts = useMemo<Record<string, unknown> | null>(() => {
    switch (role) {
      case "oie": {
        const rows = oieQueue?.data ?? [];
        const pending = rows.filter((r) => r.status === "PENDING").length;
        const exceptions = Array.isArray(oieExceptions?.data)
          ? oieExceptions!.data!.length
          : oieExceptions?.total ?? 0;
        const authorised = examAccess?.data?.authorised ?? [];
        const examDay: "open" | "closed" | null =
          authorised.length === 0
            ? null
            : authorised.some((r) => r.status === "APPROVED")
              ? "open"
              : "closed";
        return { pending, exceptions, examDay };
      }
      case "exam_superintendent": {
        const authorised = examAccess?.data?.authorised ?? [];
        const exceptions = 0; // no exceptions source in this shell yet
        const examDay: "active" | "closed" | null =
          authorised.length === 0
            ? null
            : authorised.some((r) => r.status === "APPROVED")
              ? "active"
              : "closed";
        return {
          examDay,
          halls: authorised.length,
          incidents: exceptions,
          candidates: authorised.length,
        };
      }
      case "exam_branch": {
        const rows = examBranchQueue?.data ?? [];
        const pending = rows.filter((r) => r.status === "PENDING").length;
        const handoff = rows.filter(
          (r) =>
            r.current_stage === "exam_branch_forwarded" ||
            r.routed_to_role === "oie" ||
            r.forwarded_from_role === "exam_branch",
        ).length;
        return {
          branch: departmentId,
          pending,
          handoff,
          discrepancies: 0,
        };
      }
      case "caretaker": {
        const tickets = caretakerSummary?.data?.pendingTickets ?? [];
        let open = 0;
        let urgent = 0;
        for (const t of tickets) {
          const s = (t.status ?? "").toUpperCase();
          if (s !== "APPROVED" && s !== "RESOLVED" && s !== "REJECTED") open += 1;
          if (t.sla_deadline && new Date(t.sla_deadline).getTime() < Date.now()) urgent += 1;
        }
        return {
          hostel: caretakerSummary?.data?.assignedHostel ?? null,
          open,
          urgent,
          lastUpdate: caretakerSummary ? new Date().toISOString() : null,
        };
      }
      case "hostel_manager": {
        const tickets = hostelManagerSummary?.data?.pendingTickets ?? [];
        return {
          hostel: departmentId,
          openTickets: hostelManagerSummary?.data?.pendingCount ?? tickets.length,
          occupancy: null,
          maintenance: 0,
          lastUpdate: hostelManagerSummary ? new Date().toISOString() : null,
        };
      }
      case "staff": {
        if (!staffMyDay?.data) return null;
        const open = Array.isArray(staffMyDay.data.openRequests)
          ? staffMyDay.data.openRequests.length
          : 0;
        const tasks = Array.isArray(staffMyDay.data.myRecent)
          ? staffMyDay.data.myRecent.length
          : 0;
        let last: string | null = null;
        for (const r of staffMyDay.data.myRecent ?? []) {
          const rec = r as { timestamp?: string; created_at?: string };
          const t = rec.timestamp ?? rec.created_at;
          if (t && (!last || new Date(t).getTime() > new Date(last).getTime())) last = t;
        }
        return { shift: null, tasks, leavesPending: open, lastScan: last };
      }
      case "parent": {
        if (!parentMe?.data) return null;
        const children = Array.isArray(parentMe.data.children)
          ? parentMe.data.children
          : [];
        const activities = children.filter((c) => c.lastMovement?.at).length;
        return { children: children.length, activities, unread: 0, feesDue: null };
      }
      case "worker": {
        if (!workerWork?.data) return null;
        const tasks = Array.isArray(workerWork.data.tasks) ? workerWork.data.tasks : [];
        const active = tasks.filter(
          (t) => (t.status ?? "PENDING").toUpperCase() !== "PENDING",
        ).length;
        return { tasks: tasks.length, active, workOrders: tasks.length };
      }
      case "supervisor": {
        const feed = supervisorFeed?.data;
        if (!feed) return null;
        const escalated = Array.isArray(feed.escalatedPermissions)
          ? feed.escalatedPermissions.length
          : feed.counts?.escalated ?? 0;
        const activeAlerts = feed.activeAlerts ?? [];
        const incidents = Array.isArray(activeAlerts)
          ? activeAlerts.length
          : feed.counts?.alerts ?? 0;
        const gateSet = new Set<string>();
        for (const a of activeAlerts) {
          if (a.gate_name) gateSet.add(a.gate_name);
          else if (a.gate_id) gateSet.add(a.gate_id);
        }
        const critical = activeAlerts.filter((a) => a.severity === "critical").length;
        return {
          gatesOnline: gateSet.size,
          escalations: escalated,
          incidents,
          shift: null,
          critical,
        };
      }
      case "mess_incharge": {
        const declared = messAnalytics?.declaredPresent ?? 0;
        const confirmed = messAnalytics?.confirmedPresent ?? 0;
        const noShows = Math.max(0, declared - confirmed);
        const days = messDays?.data?.days ?? [];
        const activeDay = days.find((d) => d.isActive) ?? days[0] ?? null;
        const now = Date.now();
        const windowOpens = activeDay?.windowOpensAt;
        const windowCloses = activeDay?.windowClosesAt ?? null;
        const active = (windowOpens ? new Date(windowOpens).getTime() <= now : true) &&
          (windowCloses ? new Date(windowCloses).getTime() >= now : true);
        let mealWindow: string | null = null;
        if (activeDay?.mealType) {
          mealWindow = activeDay.mealType;
        } else if (windowOpens) {
          const h = new Date(windowOpens).getHours();
          mealWindow = h < 11 ? "Breakfast" : h < 15 ? "Lunch" : h < 21 ? "Dinner" : "Service";
        }
        return { mealWindow, served: confirmed, noShows, active, windowCloses };
      }
      case "admin": {
        if (!adminAlerts?.data) return null;
        const items = adminAlerts.data.items ?? [];
        const open = items.filter((i) => !i.resolved);
        const active = adminAlerts.data.unresolvedCount ?? open.length;
        const pending = open.filter(
          (i) => i.severity === "critical" || i.severity === "high",
        ).length;
        return { active, pending, records: items.length };
      }
      case "principal":
      case "vice_principal": {
        if (!principalDash?.data) return null;
        const pending = principalDash.data.pendingApprovals ?? 0;
        const alerts = principalDash.data.recentAlerts ?? [];
        return {
          pending,
          active: Array.isArray(alerts) ? alerts.length : 0,
          records: role === "vice_principal" ? pending + (Array.isArray(alerts) ? alerts.length : 0) : 0,
        };
      }
      case "sysadmin": {
        if (!sysadminHealth?.data) return null;
        const d = sysadminHealth.data;
        const out = { up: 0, degraded: 0, down: 0 };
        const tally = (s: string | undefined, bucket: "up" | "degraded" | "down") => {
          const norm = String(s ?? "").toLowerCase();
          if (norm === "healthy" || norm === "up" || norm === "ok") out.up += 1;
          else if (norm === "degraded" || norm === "warn" || norm === "warning") out.degraded += 1;
          else if (bucket === "down") out.down += 1;
        };
        if (d.services) {
          for (const [key, value] of Object.entries(d.services)) {
            if (key === "status") continue;
            const entry = value as { status?: string };
            if (entry && typeof entry.status === "string") tally(entry.status, "down");
          }
        }
        tally(d.database?.status, "down");
        tally(d.gateways?.status, "down");
        if (out.up === 0 && out.degraded === 0 && out.down === 0) {
          if (d.status?.toLowerCase() === "unhealthy") out.down = 1;
        }
        return out;
      }
      default:
        return null;
    }
  }, [role, oieQueue, oieExceptions, examAccess, examBranchQueue, departmentId, caretakerSummary, hostelManagerSummary, staffMyDay, parentMe, workerWork, supervisorFeed, messAnalytics, messDays, adminAlerts, principalDash, sysadminHealth]);

  const refresh = useCallback(() => {
    void refreshOieQueue();
    void refreshOieExceptions();
    void refreshExamAccess();
    void refreshExamBranch();
    void refreshCaretaker();
    void refreshHostelManager();
    void refreshStaff();
    void refreshParent();
    void refreshWorker();
    void refreshSupervisor();
    void refreshMessAnalytics();
    void refreshMessDays();
    void refreshPrincipal();
    void refreshSysadmin();
    void refreshAdmin();
    clearCache();
  }, [refreshOieQueue, refreshOieExceptions, refreshExamAccess, refreshExamBranch, refreshCaretaker, refreshHostelManager, refreshStaff, refreshParent, refreshWorker, refreshSupervisor, refreshMessAnalytics, refreshMessDays, refreshPrincipal, refreshSysadmin, refreshAdmin]);

  const CommandBar = COMMAND_BARS[role] ?? null; // generic fallback resolved by the caller

  const kind = useMemo<RoleChrome["kind"]>(() => {
    switch (role) {
      case "oie": return "oie";
      case "exam_superintendent": return "exam_superintendent";
      case "exam_branch": return "exam_branch";
      case "caretaker": return "caretaker";
      case "hostel_manager": return "hostel_manager";
      case "staff": return "staff";
      case "parent": return "parent";
      case "worker": return "worker";
      case "supervisor": return "supervisor";
      case "mess_incharge": return "mess_incharge";
      case "admin": return "admin";
      case "principal": return "principal";
      case "vice_principal": return "vice_principal";
      case "sysadmin": return "sysadmin";
      default: return "generic";
    }
  }, [role]);

  const anyLoading =
    oieQueueLoading ||
    oieExceptionsLoading ||
    examAccessLoading ||
    examBranchLoading ||
    caretakerLoading ||
    hostelManagerLoading ||
    staffLoading ||
    parentLoading ||
    workerLoading ||
    supervisorLoading ||
    messAnalyticsLoading ||
    messDaysLoading ||
    principalLoading ||
    sysadminLoading ||
    adminLoading;

  const showStatus =
    kind !== "generic" && (kind === "staff" || kind === "parent" || kind === "worker" || kind === "admin" || kind === "principal" || kind === "vice_principal" || kind === "sysadmin" || kind === "caretaker" || kind === "hostel_manager" || kind === "supervisor" || kind === "mess_incharge" || kind === "exam_branch" || kind === "oie" || kind === "exam_superintendent");

  return {
    kind: showStatus ? kind : "generic",
    counts,
    lastScan,
    refreshing: anyLoading,
    refresh,
    CommandBar,
    commandBarOpen,
    setCommandBarOpen,
  };
}

export default useRoleConsoleChrome;
