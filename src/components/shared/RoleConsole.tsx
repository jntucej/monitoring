"use client";

/**
 * RoleConsole — the orchestrator for the role-console shell.
 *
 * Composes:
 *   - IconRail (left)
 *   - a main column (Board feed OR `children` for sub-pages)
 *   - ContextPanel (right, only when a row is selected)
 *   - StatusBar (bottom, full width)
 *   - CommandBar (overlay, opened via Cmd/Ctrl+K or the top-bar button)
 *
 * The layout provides the full shell; sub-pages just render their content as
 * `children`, and the root page renders nothing extra because the default
 * main-column fallback is the Board feed.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Command } from "lucide-react";
import { Board, type BoardRow } from "@/components/shared/Board";
import { DigestBoard } from "@/components/shared/DigestBoard";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { GridBoard, type GridTicket } from "@/components/shared/GridBoard";
import { ContextPanel } from "@/components/shared/ContextPanel";
import { PermissionContextPanel } from "@/components/approver/PermissionContextPanel";
import { PermissionStatusBar, type PermissionCounts } from "@/components/approver/PermissionStatusBar";
import { CaretakerStatusBar, type CaretakerCounts } from "@/components/approver/CaretakerStatusBar";
import { PermissionCommandBar } from "@/components/approver/PermissionCommandBar";
import { DeputyWardenCommandBar } from "@/components/approver/DeputyWardenCommandBar";
import { CaretakerCommandBar } from "@/components/approver/CaretakerCommandBar";
import { StaffStatusBar, type StaffCounts } from "@/components/approver/StaffStatusBar";
import { HostelManagerStatusBar, type HostelManagerCounts } from "@/components/approver/HostelManagerStatusBar";
import { HostelManagerCommandBar } from "@/components/approver/HostelManagerCommandBar";
import { OieStatusBar, type OieCounts } from "@/components/approver/OieStatusBar";
import { OieCommandBar } from "@/components/approver/OieCommandBar";
import { ExamDayPanel } from "@/components/approver/ExamDayPanel";
import { AllocationPanel } from "@/components/approver/AllocationPanel";
import { SupervisorStatusBar, type SupervisorCounts } from "@/components/approver/SupervisorStatusBar";
import { SupervisorCommandBar } from "@/components/approver/SupervisorCommandBar";
import { EscalationPanel } from "@/components/approver/EscalationPanel";
import { IncidentPanel } from "@/components/approver/IncidentPanel";
import {
  ExamSuperintendentStatusBar,
  type ExamSuperintendentCounts,
} from "@/components/approver/ExamSuperintendentStatusBar";
import { ExamSuperintendentCommandBar } from "@/components/approver/ExamSuperintendentCommandBar";
import { ParentStatusBar, type ParentCounts } from "@/components/approver/ParentStatusBar";
import { ParentCommandBar } from "@/components/approver/ParentCommandBar";
import { ChildActivityPanel } from "@/components/approver/ChildActivityPanel";
import { MealServePanel } from "@/components/approver/MealServePanel";
import { MessInchargeStatusBar, type MessInchargeCounts } from "@/components/approver/MessInchargeStatusBar";
import { MessInchargeCommandBar } from "@/components/approver/MessInchargeCommandBar";
import {
  AdminAlertsPanel,
} from "@/components/approver/AdminAlertsPanel";
import { AdminStatusBar, type AdminCounts } from "@/components/approver/AdminStatusBar";
import { AdminCommandBar } from "@/components/approver/AdminCommandBar";
import { HandoffPanel } from "@/components/approver/HandoffPanel";
import {
  ExamBranchStatusBar,
  type ExamBranchCounts,
} from "@/components/approver/ExamBranchStatusBar";
import { ExamBranchCommandBar } from "@/components/approver/ExamBranchCommandBar";
import { SysadminStatusBar, type SysadminCounts } from "@/components/approver/SysadminStatusBar";
import { SysadminCommandBar } from "@/components/approver/SysadminCommandBar";
import { SysadminHealthPanel } from "@/components/approver/SysadminHealthPanel";
import { PrincipalStatusBar, type PrincipalCounts } from "@/components/approver/PrincipalStatusBar";
import { PrincipalCommandBar } from "@/components/approver/PrincipalCommandBar";
import { PrincipalDashboardPanel } from "@/components/approver/PrincipalDashboardPanel";
import { VpStatusBar, type VpCounts } from "@/components/approver/VpStatusBar";
import { VpCommandBar } from "@/components/approver/VpCommandBar";
import { VpDashboardPanel } from "@/components/approver/VpDashboardPanel";
import { MyWorkPanel } from "@/components/approver/MyWorkPanel";
import { WorkerStatusBar, type WorkerCounts } from "@/components/approver/WorkerStatusBar";
import { WorkerCommandBar } from "@/components/approver/WorkerCommandBar";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import { useAuthStore } from "@/stores/authStore";
import { StatusBar } from "@/components/shared/StatusBar";
import { CommandBar } from "@/components/shared/CommandBar";
import { IconRail } from "@/components/shared/IconRail";
import type { IconRailGroup } from "@/components/shared/IconRail";
import { MobileGroupsDrawer } from "@/components/shared/MobileGroupsDrawer";
import { useApiResource } from "@/hooks/useApiResource";
import { useKeyboardShortcuts, type Shortcut } from "@/hooks/useKeyboardShortcuts";
import { getConsoleConfig } from "@/config/consoles";
/**
 * The response shape for the board source endpoint. Mirrors BoardResponse in
 * Board.tsx but re-declared here because Board does not export the raw
 * interface. The index signature is widened to unknown so the known keys
 * (counts) can coexist with the dynamic itemKey arrays under strict TS.
 */
interface ConsoleBoardResponse {
  success?: boolean;
  data: {
    [key: string]: unknown;
    counts: {
      total: number;
      entries: number;
      exits: number;
      manual: number;
      flagged: number;
    };
  };
}

/** Narrow the dynamic itemKey array back to BoardRow[] when it is present. */
function boardRowsOf(resp: ConsoleBoardResponse | null, itemKey: string): BoardRow[] {
  const raw = resp?.data?.[itemKey];
  return Array.isArray(raw) ? (raw as BoardRow[]) : [];
}

/**
 * The response shape for a kanban board source (e.g. /api/permissions).
 * The array of records lives directly under `data`, not under a dynamic
 * itemKey like the feed Board response.
 */
interface KanbanPermissionsResponse {
  success?: boolean;
  data: PermissionItem[];
  total?: number;
}

export interface RoleConsoleProps {
  /** The role code (must match a key in CONSOLES). */
  role: string;
  /** The role's root path, e.g. "/operator". */
  roleRoot: string;
  /**
   * Optional collapsible sidebar groups. When provided, the IconRail renders
   * these group icons (each with a desktop flyout + active indicator) instead
   * of the flat nav items. Roles that pass nothing keep the current behavior
   * exactly — no groups means the old flat rail.
   */
  groups?: IconRailGroup[];
  /**
   * Optional content for the main column. When provided, it replaces the
   * default Board feed. Use this from sub-pages nested under the layout.
   */
  children?: ReactNode;
  /**
   * When true, skip RoleConsole's own IconRail + top "Ops Console" header.
   * Used when the parent shell (e.g. the operator's slim 4-icon
   * `OperatorShell`) already provides the only side-rail and header chrome —
   * RoleConsole then renders just the dashboard column (board feed + status
   * strip + command palette + context panel) so the rails don't double up.
   */
  bare?: boolean;
}

export function RoleConsole({ role, roleRoot, groups, children, bare }: RoleConsoleProps) {
  const [selectedRow, setSelectedRow] = useState<BoardRow | null>(null);
  const [commandBarOpen, setCommandBarOpen] = useState(false);

  const config = useMemo(() => getConsoleConfig(role), [role]);

  const isKanban = config?.board?.kind === "kanban";
  const isGrid = config?.board?.kind === "grid";
  const isDigest = config?.board?.kind === "digest";
  const isPermission = config?.contextEntity === "permission";
  const isTicket = config?.contextEntity === "ticket";
  const isHod = role === "hod";
  const isStaff = role === "staff";
  const isCaretaker = role === "caretaker";
  const isHostelManager = role === "hostel_manager";
  const isOie = role === "oie";
  const isExamSuperintendent = role === "exam_superintendent";
  const isSupervisor = role === "supervisor";
  const isParent = role === "parent" || role === "guardian";
  const isMessIncharge = role === "mess_incharge";
  const isExamBranch = role === "exam_branch";
  const isSysadmin = role === "sysadmin";
  const isPrincipal = role === "principal";
  const isAdmin = role === "admin";
  const isVicePrincipal = role === "vice_principal";
  const isWorker = role === "worker";
  const showAllocationPanel = config?.extraPanels?.includes("AllocationPanel") ?? false;
  const showExamDayPanel = config?.extraPanels?.includes("ExamDayPanel") ?? false;
  const showHandoffPanel = config?.extraPanels?.includes("HandoffPanel") ?? false;
  const showMealServePanel =
    config?.extraPanels?.includes("MealServePanel") ?? false;
  const showEscalationPanel =
    config?.extraPanels?.includes("EscalationPanel") ?? false;
  const showIncidentPanel =
    config?.extraPanels?.includes("IncidentPanel") ?? false;
  const showChildActivityPanel =
    config?.extraPanels?.includes("ChildActivityPanel") ?? false;
  const showSysadminHealthPanel =
    config?.extraPanels?.includes("SysadminHealthPanel") ?? false;
  const showPrincipalDashboardPanel =
    config?.extraPanels?.includes("PrincipalDashboardPanel") ?? false;
  const showAdminAlertsPanel =
    config?.extraPanels?.includes("AdminAlertsPanel") ?? false;
  const showVpDashboardPanel =
    config?.extraPanels?.includes("VpDashboardPanel") ?? false;
  const showMyWorkPanel =
    config?.extraPanels?.includes("MyWorkPanel") ?? false;

  // The caller's assigned hostel, used for the caretaker status strip.
  const assignedHostel = useAuthStore((s) => s.user?.assignedHostel ?? null);

  // Fetch the board source so we can derive counts + lastScan for the status
  // bar. The fetch is cached by useApiResource, so a duplicate call from
  // Board itself does not cause a second network request. Skipped for kanban
  // (its status strip is permission-specific and derives counts elsewhere).
  const boardSource = isKanban || isGrid ? null : (config?.board?.source ?? null);
  const { data: boardData, refresh: refreshBoard } = useApiResource<ConsoleBoardResponse>(boardSource, {
    ttlMs: 15_000,
  });

  // For the mess In-charge console, keep the digest board + status bar live by
  // re-fetching the board source (/api/mess/analytics) on demand (e.g. after
  // the context panel or the MealServePanel mutates). The board feed is the
  // shared useApiResource cache — no duplicate network request. The separate
  // /api/mess/days fetch (window-close time) self-refreshes on its own 15s
  // TTL, so it does not need to be coupled here.
  const refreshMessIncharge = useCallback(() => {
    void refreshBoard();
  }, [refreshBoard]);

  // For the caretaker grid board, fetch the summary so the status strip can
  // derive open/urgent counts. Reuses the same useApiResource cache as
  // GridBoard itself, so no extra network request.
  interface CaretakerSummaryResponse {
    success?: boolean;
    data: {
      [key: string]: unknown;
      pendingTickets?: GridTicket[];
      pendingCount?: number;
      /** The caller's assigned hostel, as resolved server-side (authoritative). */
      assignedHostel?: string | null;
    };
  }
  const gridSource = isGrid ? config?.board?.source ?? null : null;
  const { data: gridData, refresh: refreshGrid, loading: gridLoading } = useApiResource<CaretakerSummaryResponse>(gridSource, { ttlMs: 15_000 });

  const caretakerTickets = useMemo<GridTicket[]>(() => {
    const raw = gridData?.data?.pendingTickets;
    return Array.isArray(raw) ? raw : [];
  }, [gridData]);

  // Prefer the server-resolved assignedHostel (authoritative, from the
  // trusted auth context) over the client store value.
  const caretakerHostel = gridData?.data?.assignedHostel ?? assignedHostel ?? null;

  const caretakerCounts: CaretakerCounts | null = useMemo(() => {
    if (!isCaretaker) return null;
    let open = 0;
    let urgent = 0;
    const lastUpdate: string | null = null;
    for (const t of caretakerTickets) {
      const s = (t.status ?? "").toUpperCase();
      if (s !== "APPROVED" && s !== "RESOLVED" && s !== "REJECTED") open += 1;
      if (t.sla_deadline && new Date(t.sla_deadline).getTime() < Date.now()) urgent += 1;
    }
    void lastUpdate;
    return {
      hostel: caretakerHostel,
      open,
      urgent,
      lastUpdate: gridData ? new Date().toISOString() : null,
    };
  }, [isCaretaker, caretakerTickets, caretakerHostel, gridData]);
  const caretakerLoading = isCaretaker ? gridLoading : false;

  // For kanban, fetch the permission items directly so the status strip can
  // derive live counts. Reuses the same useApiResource cache as KanbanBoard.
  const kanbanSource = isKanban ? config?.board?.source ?? null : null;
  const { data: kanbanData, refresh: refreshKanban, loading: kanbanLoading } = useApiResource<KanbanPermissionsResponse>(kanbanSource, { ttlMs: 15_000 });
  const permissionItems: PermissionItem[] = useMemo(
    () => (kanbanData && Array.isArray(kanbanData.data) ? kanbanData.data : []),
    [kanbanData],
  );

  // Derive the permission-specific counts for the HOD status strip from the
  // same kanban fetch. attendancePct is not part of the /api/permissions
  // payload, so it stays null until a department-attendance source is wired.
  const permissionCounts: PermissionCounts | null = useMemo(() => {
    if (!isPermission || (isKanban && !kanbanData)) return null;
    let pending = 0;
    let escalated = 0;
    for (const item of permissionItems) {
      if (item.status === "PENDING") pending += 1;
      if (item.status === "ESCALATED" || item.routed_to_role) escalated += 1;
    }
    return { pending, escalated, attendancePct: null, total: permissionItems.length };
  }, [isPermission, isKanban, kanbanData, permissionItems]);

  const lastKanbanScan = useMemo(() => {
    if (permissionItems.length === 0) return null;
    let newest: string | null = null;
    for (const item of permissionItems) {
      const t = item.updated_at || item.created_at;
      if (!t) continue;
      if (!newest || new Date(t).getTime() > new Date(newest).getTime()) {
        newest = t;
      }
    }
    return newest;
  }, [permissionItems]);

  const counts = useMemo(
    () => boardData?.data?.counts ?? null,
    [boardData],
  );

  // For the staff console, the board source is /api/staff/my-day, which
  // returns data: { myRecent, openRequests, dutyRoster } — not a flat
  // itemKey array. Derive the status strip counts from the same feed fetch.
  interface StaffFeedData {
    myRecent?: unknown[];
    openRequests?: unknown[];
    dutyRoster?: unknown[];
  }
  const staffFeed = (boardData?.data as unknown as { myRecent?: unknown[]; openRequests?: unknown[]; dutyRoster?: unknown[] } | null) ?? null;
  const staffCounts: StaffCounts | null = useMemo(() => {
    if (!isStaff || !staffFeed) return null;
    const open = Array.isArray(staffFeed.openRequests) ? staffFeed.openRequests.length : 0;
    const tasks = Array.isArray(staffFeed.myRecent) ? staffFeed.myRecent.length : 0;
    let lastScan: string | null = null;
    if (Array.isArray(staffFeed.myRecent)) {
      for (const r of staffFeed.myRecent as Array<{ timestamp?: string; created_at?: string }>) {
        const t = r.timestamp ?? r.created_at;
        if (t && (!lastScan || new Date(t).getTime() > new Date(lastScan).getTime())) lastScan = t;
      }
    }
    void (staffFeed as unknown as StaffFeedData);
    return { shift: null, tasks, leavesPending: open, lastScan };
  }, [isStaff, staffFeed]);
  const staffLoading = isStaff ? !staffFeed : false;

  const lastScan = useMemo(() => {
    if (!boardSource || !config) return null;
    const rows = boardRowsOf(boardData, config?.board?.itemKey ?? "");
    let newest: string | null = null;
    for (const r of rows) {
      const t = r.timestamp ?? r.created_at;
      if (!t) continue;
      if (!newest || new Date(t).getTime() > new Date(newest).getTime()) {
        newest = t;
      }
    }
    return newest;
  }, [boardData, boardSource, config]);

  const handleSelect = useCallback((row: BoardRow) => {
    setSelectedRow(row);
  }, []);

  // For the hostel manager, fetch the summary so the status strip can derive
  // open-ticket / occupancy counts. The summary response nests its data under
  // `data.pendingTickets` (not a flat array), so the status-bar derivation
  // reads `pendingCount` directly. The KanbanBoard itself gets the same
  // `useApiResource` cache — no extra network request.
  const hmBoardSource = isHostelManager ? config?.board?.source ?? null : null;
  const { data: hmData, refresh: refreshHm, loading: hmLoading } = useApiResource<{ success?: boolean; data: { [key: string]: unknown; pendingCount?: number; } }>(hmBoardSource, { ttlMs: 15_000 });
  const hmTickets = useMemo<PermissionItem[]>(() => {
    const raw = hmData?.data?.pendingTickets;
    return Array.isArray(raw) ? (raw as unknown as PermissionItem[]) : [];
  }, [hmData]);
  const hmCounts: HostelManagerCounts | null = useMemo(() => {
    if (!isHostelManager) return null;
    return {
      hostel: assignedHostel,
      openTickets: hmData?.data?.pendingCount ?? hmTickets.length,
      occupancy: null, // occupancy source not yet wired
      maintenance: 0,  // maintenance source not yet wired
      lastUpdate: hmData ? new Date().toISOString() : null,
    };
  }, [isHostelManager, assignedHostel, hmData, hmTickets]);

  // For the OIE exam-desk console, derive the status-strip counts from the
  // oie queue (pending), the access-exceptions feed, and the exam-day gate
  // state. The kanbanSource fetch (which for oie is /api/oie/queue) is
  // reused for pending; two small extra fetches supply exceptions + gate.
  interface OieExceptionsResponse {
    success?: boolean;
    data: unknown[];
    total?: number;
  }
  interface OieExamAccessResponse {
    success?: boolean;
    data: {
      authorised: Array<{ status: string }>;
      stageSummary: unknown[];
    };
  }
  const oieExceptionsSource = isOie ? "/api/exam/access-exceptions" : null;
  const oieExamAccessSource = isOie ? "/api/exam/access" : null;
  const {
    data: oieExceptionsData,
    refresh: refreshOieExceptions,
    loading: oieExceptionsLoading,
  } = useApiResource<OieExceptionsResponse>(oieExceptionsSource, { ttlMs: 15_000 });
  const {
    data: oieExamAccessData,
    refresh: refreshOieExamAccess,
    loading: oieExamAccessLoading,
  } = useApiResource<OieExamAccessResponse>(oieExamAccessSource, { ttlMs: 15_000 });

  const refreshOie = useCallback(() => {
    void refreshOieExceptions();
    void refreshOieExamAccess();
  }, [refreshOieExceptions, refreshOieExamAccess]);

  const oieCounts: OieCounts | null = useMemo(() => {
    if (!isOie) return null;
    const pending = permissionItems.filter((i) => i.status === "PENDING").length;
    const exceptions = Array.isArray(oieExceptionsData?.data)
      ? oieExceptionsData.data.length
      : oieExceptionsData?.total ?? 0;
    const authorised = oieExamAccessData?.data?.authorised ?? [];
    const examDay: "open" | "closed" | null =
      authorised.length === 0
        ? null
        : authorised.some((r) => r.status === "APPROVED")
          ? "open"
          : "closed";
    return { pending, exceptions, examDay };
  }, [isOie, permissionItems, oieExceptionsData, oieExamAccessData]);

  const oieLoading = isOie ? oieExceptionsLoading || oieExamAccessLoading || kanbanLoading : false;

  // For the exam-branch console, derive the status-strip counts from the
  // self-scoped /api/permissions?workflow_type=exam&branch=:self fetch
  // (kanbanData). pending = PENDING rows; handoff = rows currently at the
  // exam_branch_forwarded stage (or flagged for OIE handoff); discrepancies
  // has no source yet → 0 placeholder. branch = the caller's department.
  const examBranchCounts: ExamBranchCounts | null = useMemo(() => {
    if (!isExamBranch) return null;
    const pending = permissionItems.filter((i) => i.status === "PENDING").length;
    const handoff = permissionItems.filter(
      (i) =>
        i.current_stage === "exam_branch_forwarded" ||
        i.routed_to_role === "oie" ||
        i.forwarded_from_role === "exam_branch",
    ).length;
    const discrepancies = 0; // no discrepancies source yet — placeholder
    return {
      branch: useAuthStore.getState().user?.departmentId ?? null,
      pending,
      handoff,
      discrepancies,
    };
  }, [isExamBranch, permissionItems]);
  const examBranchLoading = isExamBranch ? kanbanLoading : false;

  // For the exam superintendent console, derive the status-strip counts from
  // /api/exam/access (authorised rows + gate state) and the
  // /api/exam/access-exceptions feed (unresolved incident count). Two small
  // fetches supply the status bar; the kanbanSource fetch is not reused
  // because /api/exam/access returns an object under data (authorised +
  // stageSummary), not a flat permission array.
  interface ExamSuperintendentExceptionsResponse {
    success?: boolean;
    data: unknown[];
    total?: number;
  }
  interface ExamSuperintendentAccessResponse {
    success?: boolean;
    data: {
      authorised: Array<{ status: string; ticket_number?: string; id?: string }>;
      stageSummary: unknown[];
    };
    total?: number;
  }
  const esExceptionsSource = isExamSuperintendent ? "/api/exam/access-exceptions" : null;
  const esExamAccessSource = isExamSuperintendent ? "/api/exam/access" : null;
  const {
    data: esExceptionsData,
    refresh: refreshEsExceptions,
    loading: esExceptionsLoading,
  } = useApiResource<ExamSuperintendentExceptionsResponse>(esExceptionsSource, { ttlMs: 15_000 });
  const {
    data: esExamAccessData,
    refresh: refreshEsExamAccess,
    loading: esExamAccessLoading,
  } = useApiResource<ExamSuperintendentAccessResponse>(esExamAccessSource, { ttlMs: 15_000 });

  const refreshEs = useCallback(() => {
    void refreshEsExceptions();
    void refreshEsExamAccess();
  }, [refreshEsExceptions, refreshEsExamAccess]);

  // Refresh wiring for the exam-branch console: the self-scoped kanban fetch
  // (board source /api/permissions?workflow_type=exam&branch=:self) supplies
  // both the status-bar counts and the KanbanBoard. Reuse the same
  // useApiResource cache as KanbanBoard — no duplicate network request. The
  // HandoffPanel issues its own self-scoped fetch, so re-fire that too.
  const refreshExamBranch = useCallback(() => {
    void refreshKanban();
  }, [refreshKanban]);

  // For the sysadmin console, the board source is the feed
  // /api/sysadmin/application-health (itemKey "health"). That endpoint returns
  // an object under `data` ({ status, timestamp, services, database,
  // gateways, recentAlerts }) rather than a flat itemKey array, so the Board
  // feed renders empty by design — the meaningful surface is the
  // SysadminHealthPanel + SysadminStatusBar. Derive the status-bar
  // up/degraded/down counts from the same boardData fetch (no second request)
  // by scanning the named service entries, the database component, and the
  // gateways component.
  const sysadminCounts: SysadminCounts | null = useMemo(() => {
    if (!isSysadmin) return null;
    const d = boardData?.data as
      | {
          services?: { status?: string; [key: string]: unknown };
          database?: { status?: string };
          gateways?: { status?: string };
        }
      | undefined;
    const countsOut: SysadminCounts = { up: 0, degraded: 0, down: 0 };
    const tally = (s: string | undefined, bucket: "up" | "degraded" | "down") => {
      const norm = String(s ?? "").toLowerCase();
      if (norm === "healthy" || norm === "up" || norm === "ok") {
        countsOut.up += 1;
        return;
      }
      if (norm === "degraded" || norm === "warn" || norm === "warning") {
        countsOut.degraded += 1;
        return;
      }
      if (bucket === "down") {
        // Only count explicit down for a named component when we know it was
        // checked; the overall "unhealthy" is surfaced via down below.
      }
      countsOut.down += 1;
    };
    if (d?.services) {
      for (const [key, value] of Object.entries(d.services)) {
        if (key === "status") continue;
        const entry = value as { status?: string };
        if (entry && typeof entry.status === "string") tally(entry.status, "down");
      }
    }
    tally(d?.database?.status, "down");
    tally(d?.gateways?.status, "down");
    // If the overall status is down and nothing has been tallied, surface a
    // single "down" so the bar never reads 0/0/0 while unhealthy.
    if (countsOut.up === 0 && countsOut.degraded === 0 && countsOut.down === 0) {
      const overall = (boardData?.data as { status?: string } | undefined)?.status?.toLowerCase();
      if (overall === "unhealthy") countsOut.down = 1;
    }
    return countsOut;
  }, [isSysadmin, boardData]);
  const sysadminLoading = isSysadmin ? !boardData : false;

  const refreshSysadmin = useCallback(() => {
    void refreshBoard();
  }, [refreshBoard]);

  // For the admin console, the board source is the feed /api/admin/alerts
  // (itemKey "alert"). That endpoint returns { success, data: { items,
  // unresolvedCount } } — an object under `data` rather than a flat itemKey
  // array, so the Board feed renders empty by design (the meaningful surface
  // is the AdminAlertsPanel + AdminStatusBar). Derive the status-bar
  // active/pending/records counts from the same boardData fetch (no second
  // request): active = all open alerts; pending = open alerts at
  // high/critical severity; records = total items in the feed (open +
  // recently resolved).
  interface AdminAlertsFeed {
    items?: Array<{ severity?: string; resolved?: boolean; timestamp?: string }>;
    unresolvedCount?: number;
  }
  const adminFeed =
    (boardData?.data as unknown as { data?: AdminAlertsFeed } | null)?.data ??
    (boardData?.data as unknown as AdminAlertsFeed | null) ??
    null;
  const adminCounts: AdminCounts | null = useMemo(() => {
    if (!isAdmin) return null;
    const items = Array.isArray(adminFeed?.items) ? adminFeed.items : [];
    const open = items.filter((i) => !i.resolved);
    const active = adminFeed?.unresolvedCount ?? open.length;
    const pending = open.filter(
      (i) => i.severity === "critical" || i.severity === "high",
    ).length;
    return { active, pending, records: items.length };
  }, [isAdmin, adminFeed]);
  const adminLoading = isAdmin ? !adminFeed : false;

  // Refresh wiring for the admin console: the board source
  // (/api/admin/alerts) supplies both the AdminAlertsPanel and the status-bar
  // counts — reuse the same useApiResource cache as Board, no duplicate
  // network request.
  const refreshAdmin = useCallback(() => {
    void refreshBoard();
  }, [refreshBoard]);

  const esCounts: ExamSuperintendentCounts | null = useMemo(() => {
    if (!isExamSuperintendent) return null;
    const authorised = esExamAccessData?.data?.authorised ?? [];
    const exceptions = Array.isArray(esExceptionsData?.data)
      ? esExceptionsData.data.length
      : esExceptionsData?.total ?? 0;
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
  }, [isExamSuperintendent, esExceptionsData, esExamAccessData]);

  const esLoading = isExamSuperintendent
    ? esExceptionsLoading || esExamAccessLoading
    : false;

  // Shared by IncidentPanel's onResolved so the status bar count stays live.
  const refreshExamIncidents = useCallback(() => {
    void refreshEsExceptions();
  }, [refreshEsExceptions]);

  // For the parent/guardian console, the board source is the feed
  // /api/parents/me, which self-scopes to the caller's own linked children.
  // Response shape: { success, data: { children: ChildRow[], totalOpenRequests } }.
  // Derive the status-strip counts (children / recent activities / unread /
  // feesDue) from the same feed fetch so the bar stays live without a second
  // network request. feesDue has no authoritative billing source on this
  // endpoint yet, so it stays null (rendered as "none").
  interface ParentFeedData {
    children?: Array<{
      childId?: string;
      openRequests?: number;
      lastMovement?: { at?: string } | null;
      nextEvent?: unknown | null;
    }>;
    totalOpenRequests?: number;
  }
  const parentFeed =
    (boardData?.data as unknown as ParentFeedData | null) ?? null;
  const parentCounts: ParentCounts | null = useMemo(() => {
    if (!isParent || !parentFeed) return null;
    const children = Array.isArray(parentFeed.children) ? parentFeed.children : [];
    // "Recent activities" = the most recent movement log across children
    // (each child's lastMovement is one chronological feed row).
    const activities = children.filter((c) => c.lastMovement?.at).length;
    // Unread: no authoritative notification source on /api/parents/me yet —
    // surface 0 until one lands.
    const unread = 0;
    return {
      children: children.length,
      activities,
      unread,
      feesDue: null,
    };
  }, [isParent, parentFeed]);
  const parentLoading = isParent ? !parentFeed : false;

  // For the supervisor console, derive status-strip counts from the
  // escalation feed (/api/supervisor/escalations). The feed response nests
  // its counts under data.counts (escalated / alerts / decisions). The
  // “gates online” figure is derived from the distinct gate count in the
  // activeAlerts array (no second /api/gates request). The shift label has
  // no authoritative source on this endpoint yet and stays null (rendered
  // as “—”).
  //
  // Supervised-gates scoping note: the /api/supervisor/escalations route
  // should self-scope to the caller's users.supervised_gates array.
  // Follow-up: add server-side scoping when the route is extended.
  interface SupervisorEscalationsFeed {
    escalatedPermissions?: Array<{ status: string; sla_deadline: string | null }>;
    activeAlerts?: Array<{ severity: string; gate_id: string | null; gate_name: string | null }>;
    counts?: { escalated?: number; alerts?: number; decisions?: number };
  }
  const supervisorFeed =
    (boardData?.data as unknown as { data?: SupervisorEscalationsFeed } | null)?.data ??
    null;
  const supervisorCounts: SupervisorCounts | null = useMemo(() => {
    if (!isSupervisor) return null;
    const escalated =
      Array.isArray(supervisorFeed?.escalatedPermissions)
        ? supervisorFeed.escalatedPermissions.length
        : supervisorFeed?.counts?.escalated ?? 0;
    const activeAlerts = supervisorFeed?.activeAlerts ?? [];
    const incidents = Array.isArray(activeAlerts)
      ? activeAlerts.length
      : supervisorFeed?.counts?.alerts ?? 0;
    // Distinct gate count from the active-alerts array.
    const gateSet = new Set<string>();
    if (Array.isArray(activeAlerts)) {
      for (const a of activeAlerts) {
        if (a.gate_name) gateSet.add(a.gate_name);
        else if (a.gate_id) gateSet.add(a.gate_id);
      }
    }
    const critical = Array.isArray(activeAlerts)
      ? activeAlerts.filter((a) => a.severity === "critical").length
      : 0;
    return {
      gatesOnline: gateSet.size,
      escalations: escalated,
      incidents,
      shift: null, // no shift source on this endpoint yet
      critical,
    };
  }, [isSupervisor, supervisorFeed]);
  const supervisorLoading = isSupervisor ? !supervisorFeed : false;

  // Refresh wiring for the supervisor console: the board source
  // (/api/supervisor/escalations) supplies both the EscalationPanel and the
  // status-bar counts. Reuse the same useApiResource cache as Board, no
  // duplicate network request.
  const refreshSupervisor = useCallback(() => {
    void refreshBoard();
  }, [refreshBoard]);

  // For the mess In-charge console, the digest board source is the feed
  // /api/mess/analytics (itemKey "summary"), which returns a per-day digest:
  // { messDayId, mealDate, totalHostellers, selectedCount, declaredPresent,
  // confirmedPresent, byPrimary: { VEG, NON_VEG }, byHostelBlock }. The board
  // itself renders this digest; the status bar derives served / no-shows from
  // the same boardData fetch (no second request). A small extra
  // /api/mess/days fetch supplies the active day's meal window label and the
  // window-close time (the analytics digest does not carry window fields).
  interface MessAnalyticsFeed {
    messDayId?: string;
    mealDate?: string;
    declaredPresent?: number;
    confirmedPresent?: number;
    byPrimary?: { VEG?: number; NON_VEG?: number };
    byHostelBlock?: Record<string, { total?: number; declaredPresent?: number; confirmedPresent?: number; veg?: number; nonVeg?: number }>;
  }
  interface MessDayWindowRow {
    id: string;
    mealDate: string;
    mealType?: string;
    windowOpensAt?: string | null;
    windowClosesAt?: string | null;
    isActive?: boolean;
  }
  const messAnalytics =
    (boardData?.data as unknown as MessAnalyticsFeed | null) ?? null;

  // The days fetch supplies the window-close time + meal-window label for the
  // active day. Only fetched for the mess In-charge role (null for others,
  // so useApiResource skips it).
  const messDaysSource = isMessIncharge ? "/api/mess/days" : null;
  const { data: messDaysResp } = useApiResource<{
    success?: boolean;
    data: { days: MessDayWindowRow[] };
  }>(messDaysSource, { ttlMs: 15_000 });

  const messDays = useMemo<MessDayWindowRow[]>(
    () => (Array.isArray(messDaysResp?.data?.days) ? messDaysResp!.data!.days! : []),
    [messDaysResp]
  );
  const activeMessDay =
    messDays.find((d) => d.isActive) ?? messDays[0] ?? null;

  const messCounts: MessInchargeCounts | null = useMemo(() => {
    if (!isMessIncharge) return null;
    const now = Date.now();
    const declared = messAnalytics?.declaredPresent ?? 0;
    const confirmed = messAnalytics?.confirmedPresent ?? 0;
    const noShows = Math.max(0, declared - confirmed);
    const windowOpens = activeMessDay?.windowOpensAt;
    const windowCloses = activeMessDay?.windowClosesAt ?? null;
    const active =
      (windowOpens
        ? new Date(windowOpens).getTime() <= now
        : true) &&
      (windowCloses ? new Date(windowCloses).getTime() >= now : true);
    // Meal-window label: prefer the active day's meal type; fall back to a
    // time-of-day heuristic.
    let mealWindow: string | null = null;
    if (activeMessDay?.mealType) {
      mealWindow = activeMessDay.mealType;
    } else if (windowOpens) {
      const h = new Date(windowOpens).getHours();
      mealWindow = h < 11 ? "Breakfast" : h < 15 ? "Lunch" : h < 21 ? "Dinner" : "Service";
    }
    return { mealWindow, served: confirmed, noShows, active, windowCloses };
  }, [isMessIncharge, messAnalytics, activeMessDay]);
  const messLoading = isMessIncharge ? !messAnalytics : false;

  // For the principal console, the board source is the feed
  // /api/principal/dashboard (itemKey "item"), which returns
  // { success, data: { pendingApprovals, recentAlerts, campusOccupancy } }.
  // The board feed has no rows to render as items, so the status-bar
  // counts are derived from the same feed fetch: pending = pendingApprovals,
  // active = recentAlerts.length, records = 0 (no audit-records source yet).
  // A second refresh callback keeps the status bar live on context-panel
  // actions, reusing the shared useApiResource cache (no duplicate request).
  interface PrincipalDashboardFeed {
    pendingApprovals?: number;
    recentAlerts?: unknown[];
  }
  const principalFeed =
    (boardData?.data as unknown as PrincipalDashboardFeed | null) ?? null;
  const principalCounts: PrincipalCounts | null = useMemo(() => {
    if (!isPrincipal) return null;
    const pending = principalFeed?.pendingApprovals ?? 0;
    const active = Array.isArray(principalFeed?.recentAlerts)
      ? principalFeed!.recentAlerts!.length
      : 0;
    return { pending, active, records: 0 };
  }, [isPrincipal, principalFeed]);
  const principalLoading = isPrincipal ? !principalFeed : false;

  const refreshPrincipal = useCallback(() => {
    void refreshBoard();
  }, [refreshBoard]);

  // For the vice-principal console, the board source is the feed
  // /api/principal/dashboard (itemKey "item"), same as the principal console.
  // The VP is a delegated/oversight role with no hostel/branch filter, so the
  // counts are derived from the same feed fetch: pending = pendingApprovals,
  // active = recentAlerts.length (unresolved alerts currently active),
  // records = pendingApprovals + recentAlerts.length (audit proxy).
  interface VpDashboardFeed {
    pendingApprovals?: number;
    recentAlerts?: unknown[];
  }
  const vpFeed =
    (boardData?.data as unknown as VpDashboardFeed | null) ?? null;
  const vpCounts: VpCounts | null = useMemo(() => {
    if (!isVicePrincipal) return null;
    const pending = vpFeed?.pendingApprovals ?? 0;
    const alerts = Array.isArray(vpFeed?.recentAlerts) ? vpFeed.recentAlerts : [];
    return { pending, active: alerts.length, records: pending + alerts.length };
  }, [isVicePrincipal, vpFeed]);
  const vpLoading = isVicePrincipal ? !vpFeed : false;

  const refreshVp = useCallback(() => {
    void refreshBoard();
  }, [refreshBoard]);

  // For the worker console, the board source is the digest
  // /api/workers/my-work (itemKey "work"), which returns
  // { success, data: { tasks, completedLastWeek, todayShift } }. The digest
  // board renders those keys generically; the WorkerStatusBar + MyWorkPanel
  // read the same digest fields directly. Derive the status-bar counts from
  // the same boardData fetch: tasks = open work items, active = open items
  // in a non-PENDING stage, workOrders = total open tasks (the worker's own
  // work-order view). A last-update proxy is the newest task createdAt.
  interface WorkerWorkFeed {
    tasks?: Array<{ status?: string; createdAt?: string; stage?: string }>;
    completedLastWeek?: number;
    todayShift?: { checkIn?: string | null } | null;
  }
  const workerFeed =
    (boardData?.data as unknown as WorkerWorkFeed | null) ?? null;
  const workerCounts: WorkerCounts | null = useMemo(() => {
    if (!isWorker) return null;
    const tasks = Array.isArray(workerFeed?.tasks) ? workerFeed!.tasks! : [];
    const active = tasks.filter((t) => (t.status ?? "PENDING").toUpperCase() !== "PENDING").length;
    return {
      tasks: tasks.length,
      active,
      workOrders: tasks.length,
    };
  }, [isWorker, workerFeed]);
  const workerLoading = isWorker ? !workerFeed : false;

  // Refresh wiring for the worker console: the digest board source
  // (/api/workers/my-work) supplies both the MyWorkPanel and the status-bar
  // counts. Reuse the shared useApiResource cache, no duplicate request.
  const refreshWorker = useCallback(() => {
    void refreshBoard();
  }, [refreshBoard]);

  const handleKanbanRefresh = useCallback(() => {
    void refreshKanban();
    void refreshGrid();
    void refreshHm();
    void refreshOie();
    void refreshEs();
    void refreshExamBranch();
    void refreshMessIncharge();
    void refreshSysadmin();
    void refreshPrincipal();
    void refreshAdmin();
    void refreshVp();
    void refreshSupervisor();
    void refreshWorker();
  }, [refreshKanban, refreshGrid, refreshHm, refreshOie, refreshEs, refreshExamBranch, refreshMessIncharge, refreshSysadmin, refreshPrincipal, refreshAdmin, refreshVp, refreshSupervisor, refreshWorker]);

  const handleCloseContext = useCallback(() => {
    setSelectedRow(null);
  }, []);

  const openCommandBar = useCallback(() => setCommandBarOpen(true), []);
  const closeCommandBar = useCallback(() => setCommandBarOpen(false), []);

  // Cmd/Ctrl+K opens the command palette; Escape closes it (and any open
  // ContextPanel) — both via useKeyboardShortcuts.
  const shortcuts = useMemo<Shortcut[]>(
    () => [
      {
        key: "k",
        mod: true,
        handler: () => setCommandBarOpen((o) => !o),
      },
      {
        key: "Escape",
        handler: () => {
          setCommandBarOpen(false);
          setSelectedRow(null);
        },
      },
    ],
    [],
  );

  useKeyboardShortcuts(shortcuts);

  // Close the context panel if the user navigates away (e.g. from the rail),
  // so the panel doesn't linger on a sub-page.
  useEffect(() => {
    setSelectedRow(null);
    setCommandBarOpen(false);
  }, [roleRoot]);

  const roleLabel = config?.role ?? role;

  return (
    <div className="flex flex-col min-h-dvh w-full min-w-0">
      {/* Top bar: role + console title, Command affordance.
          Skipped when `bare` — the parent shell already owns the header
          chrome (e.g. the operator's slim OperatorShell rail). */}
      {!bare && (
        <header className="flex items-center justify-between gap-3 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-base)]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] shrink-0">
              {roleLabel}
            </span>
            <span className="text-sm font-bold text-[var(--text-primary)] truncate">
              Ops Console
            </span>
          </div>
          <button
            type="button"
            onClick={openCommandBar}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--action-primary)]/40 transition-colors"
            aria-label="Open command palette"
          >
            <Command className="w-3.5 h-3.5" />
            <span>Command</span>
            <kbd className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-base)] text-[var(--text-muted)] border border-[var(--border)]">
              ⌘K
            </kbd>
          </button>
        </header>
      )}

      {/* Mobile navigation drawer — only when groups are provided */}
      {groups && groups.length > 0 && (
        <MobileGroupsDrawer groups={groups} roleRoot={roleRoot} />
      )}

      {/* Main flex row: rail | main column | context panel.
          The IconRail is skipped when `bare` so a parent shell's rail stays
          the only one. */}
      <div className="flex flex-1 min-h-0">
        {!bare && (
          <IconRail role={role} roleRoot={roleRoot} groups={groups} />
        )}

        <main className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
          {children ??
            (isKanban ? (
              <KanbanBoard
                source={config?.board?.source ?? ""}
                itemKey={config?.board?.itemKey ?? ""}
                columns={config?.board?.columns ?? ["PENDING", "APPROVED", "REJECTED"]}
                onSelect={handleSelect}
              />
            ) : isGrid ? (
              <GridBoard
                source={config?.board?.source ?? ""}
                groupBy={config?.board?.groupBy ?? "status"}
                columns={["Open", "In Progress", "Resolved"]}
                onSelect={handleSelect}
              />
            ) : isDigest ? (
              <DigestBoard source={config?.board?.source ?? ""} />
            ) : (
              <Board
                source={config?.board?.source ?? ""}
                itemKey={config?.board?.itemKey ?? ""}
                onSelect={handleSelect}
              />
            ))}

          {/* Extra panels (e.g. the hostel manager's AllocationPanel). Rendered
              alongside the board when the console config lists them. Desktop:
              a side section below the board; mobile: full-width. */}
          {showAllocationPanel ? <AllocationPanel /> : null}
          {showExamDayPanel ? <ExamDayPanel /> : null}
          {showHandoffPanel ? <HandoffPanel onForwarded={refreshExamBranch} /> : null}
          {showMealServePanel ? <MealServePanel onRefresh={refreshMessIncharge} /> : null}
          {showIncidentPanel ? (
            <IncidentPanel onResolved={refreshExamIncidents} />
          ) : null}
          {showChildActivityPanel ? <ChildActivityPanel /> : null}
          {showEscalationPanel ? (
            <EscalationPanel onRefresh={refreshSupervisor} />
          ) : null}
          {showSysadminHealthPanel ? <SysadminHealthPanel /> : null}
          {showPrincipalDashboardPanel ? <PrincipalDashboardPanel /> : null}
          {showAdminAlertsPanel ? <AdminAlertsPanel /> : null}
          {showVpDashboardPanel ? <VpDashboardPanel onRefresh={refreshVp} /> : null}
          {showMyWorkPanel ? <MyWorkPanel /> : null}
        </main>

        {selectedRow ? (
          isPermission || isTicket ? (
            <PermissionContextPanel
              row={selectedRow}
              onClose={handleCloseContext}
              onActionComplete={handleKanbanRefresh}
            />
          ) : (
            <ContextPanel
              row={selectedRow}
              onClose={handleCloseContext}
              historyHref={`${roleRoot}/transactions`}
            />
          )
        ) : null}
      </div>

      {/* Status bar — full width, sticky at the bottom of the shell */}
      <div className="sticky bottom-0 z-30">
        {isAdmin ? (
          <AdminStatusBar
            counts={adminCounts}
            lastScan={lastScan}
            refreshing={adminLoading}
          />
        ) : isVicePrincipal ? (
          <VpStatusBar
            counts={vpCounts}
            lastScan={lastScan}
            refreshing={vpLoading}
          />
        ) : isSysadmin ? (
          <SysadminStatusBar
            counts={sysadminCounts}
            lastScan={lastScan}
            refreshing={sysadminLoading}
          />
        ) : isPrincipal ? (
          <PrincipalStatusBar
            counts={principalCounts}
            lastScan={lastScan}
            refreshing={principalLoading}
          />
        ) : isExamBranch ? (
          <ExamBranchStatusBar
            counts={examBranchCounts}
            lastScan={lastKanbanScan}
            refreshing={examBranchLoading}
          />
        ) : isParent ? (
          <ParentStatusBar
            counts={parentCounts}
            lastScan={lastScan}
            refreshing={parentLoading}
          />
        ) : isMessIncharge ? (
          <MessInchargeStatusBar
            counts={messCounts}
            lastScan={lastScan}
            refreshing={messLoading}
          />
        ) : isSupervisor ? (
          <SupervisorStatusBar
            counts={supervisorCounts}
            lastScan={lastScan}
            refreshing={supervisorLoading}
          />
        ) : isOie ? (
          <OieStatusBar
            counts={oieCounts}
            lastScan={lastKanbanScan}
            refreshing={oieLoading}
          />
        ) : isExamSuperintendent ? (
          <ExamSuperintendentStatusBar
            counts={esCounts}
            lastScan={lastKanbanScan}
            refreshing={esLoading}
          />
        ) : isCaretaker ? (
          <CaretakerStatusBar counts={caretakerCounts} refreshing={caretakerLoading} />
        ) : isHostelManager ? (
          <HostelManagerStatusBar counts={hmCounts} refreshing={hmLoading} />
        ) : isPermission ? (
          <PermissionStatusBar
            counts={permissionCounts}
            lastScan={lastKanbanScan}
            refreshing={kanbanLoading}
          />
        ) : isStaff ? (
          <StaffStatusBar counts={staffCounts} refreshing={staffLoading} />
        ) : isWorker ? (
          <WorkerStatusBar
            counts={workerCounts}
            lastScan={lastScan}
            refreshing={workerLoading}
          />
        ) : (
          <StatusBar counts={counts} lastScan={lastScan} />
        )}
      </div>

      {isAdmin ? (
        <AdminCommandBar
          role={role}
          open={commandBarOpen}
          onClose={closeCommandBar}
        />
      ) : isVicePrincipal ? (
        <VpCommandBar
          role={role}
          open={commandBarOpen}
          onClose={closeCommandBar}
        />
      ) : isSysadmin ? (
        <SysadminCommandBar
          role={role}
          open={commandBarOpen}
          onClose={closeCommandBar}
        />
      ) : isExamBranch ? (
        <ExamBranchCommandBar
          role={role}
          open={commandBarOpen}
          onClose={closeCommandBar}
        />
      ) : isPrincipal ? (
        <PrincipalCommandBar
          role={role}
          open={commandBarOpen}
          onClose={closeCommandBar}
        />
      ) : isParent ? (
        <ParentCommandBar
          role={role}
          open={commandBarOpen}
          onClose={closeCommandBar}
        />
      ) : isMessIncharge ? (
        <MessInchargeCommandBar
          role={role}
          open={commandBarOpen}
          onClose={closeCommandBar}
        />
      ) : isSupervisor ? (
        <SupervisorCommandBar
          role={role}
          open={commandBarOpen}
          onClose={closeCommandBar}
        />
      ) : isOie ? (
        <OieCommandBar
          role={role}
          open={commandBarOpen}
          onClose={closeCommandBar}
        />
      ) : isExamSuperintendent ? (
        <ExamSuperintendentCommandBar
          role={role}
          open={commandBarOpen}
          onClose={closeCommandBar}
        />
      ) : isCaretaker ? (
        <CaretakerCommandBar
          role={role}
          open={commandBarOpen}
          onClose={closeCommandBar}
        />
      ) : isHostelManager ? (
        <HostelManagerCommandBar
          role={role}
          open={commandBarOpen}
          onClose={closeCommandBar}
        />
      ) : isHod ? (
        <PermissionCommandBar
          role={role}
          open={commandBarOpen}
          onClose={closeCommandBar}
        />
      ) : isStaff ? (
        <PermissionCommandBar
          role={role}
          open={commandBarOpen}
          onClose={closeCommandBar}
        />
      ) : isWorker ? (
        <WorkerCommandBar
          role={role}
          open={commandBarOpen}
          onClose={closeCommandBar}
        />
      ) : role === "deputy_warden" ? (
        <DeputyWardenCommandBar
          role={role}
          open={commandBarOpen}
          onClose={closeCommandBar}
        />
      ) : (
        <CommandBar role={role} open={commandBarOpen} onClose={closeCommandBar} />
      )}
    </div>
  );
}
