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
import type { PermissionItem } from "@/components/approver/PermissionRow";
import { useAuthStore } from "@/stores/authStore";
import { StatusBar } from "@/components/shared/StatusBar";
import { CommandBar } from "@/components/shared/CommandBar";
import { IconRail } from "@/components/shared/IconRail";
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
   * Optional content for the main column. When provided, it replaces the
   * default Board feed. Use this from sub-pages nested under the layout.
   */
  children?: ReactNode;
}

export function RoleConsole({ role, roleRoot, children }: RoleConsoleProps) {
  const [selectedRow, setSelectedRow] = useState<BoardRow | null>(null);
  const [commandBarOpen, setCommandBarOpen] = useState(false);

  const config = useMemo(() => getConsoleConfig(role), [role]);

  const isKanban = config?.board?.kind === "kanban";
  const isGrid = config?.board?.kind === "grid";
  const isPermission = config?.contextEntity === "permission";
  const isTicket = config?.contextEntity === "ticket";
  const isHod = role === "hod";
  const isStaff = role === "staff";
  const isCaretaker = role === "caretaker";
  const isHostelManager = role === "hostel_manager";
  const isOie = role === "oie";
  const showAllocationPanel = config?.extraPanels?.includes("AllocationPanel") ?? false;
  const showExamDayPanel = config?.extraPanels?.includes("ExamDayPanel") ?? false;

  // The caller's assigned hostel, used for the caretaker status strip.
  const assignedHostel = useAuthStore((s) => s.user?.assignedHostel ?? null);

  // Fetch the board source so we can derive counts + lastScan for the status
  // bar. The fetch is cached by useApiResource, so a duplicate call from
  // Board itself does not cause a second network request. Skipped for kanban
  // (its status strip is permission-specific and derives counts elsewhere).
  const boardSource = isKanban || isGrid ? null : (config?.board?.source ?? null);
  const { data: boardData } = useApiResource<ConsoleBoardResponse>(boardSource, {
    ttlMs: 15_000,
  });

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
    let lastUpdate: string | null = null;
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

  const handleKanbanRefresh = useCallback(() => {
    void refreshKanban();
    void refreshGrid();
    void refreshHm();
    void refreshOie();
  }, [refreshKanban, refreshGrid, refreshHm, refreshOie]);

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
      {/* Top bar: role + console title, Command affordance */}
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

      {/* Main flex row: rail | main column | context panel */}
      <div className="flex flex-1 min-h-0">
        <IconRail role={role} roleRoot={roleRoot} />

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
        {isOie ? (
          <OieStatusBar
            counts={oieCounts}
            lastScan={lastKanbanScan}
            refreshing={oieLoading}
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
        ) : (
          <StatusBar counts={counts} lastScan={lastScan} />
        )}
      </div>

      {isOie ? (
        <OieCommandBar
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
