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
import { ContextPanel } from "@/components/shared/ContextPanel";
import { PermissionContextPanel } from "@/components/approver/PermissionContextPanel";
import { PermissionStatusBar, type PermissionCounts } from "@/components/approver/PermissionStatusBar";
import { PermissionCommandBar } from "@/components/approver/PermissionCommandBar";
import { StaffStatusBar, type StaffCounts } from "@/components/approver/StaffStatusBar";
import type { PermissionItem } from "@/components/approver/PermissionRow";
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
  const isPermission = config?.contextEntity === "permission";
  const isHod = role === "hod";
  const isStaff = role === "staff";

  // Fetch the board source so we can derive counts + lastScan for the status
  // bar. The fetch is cached by useApiResource, so a duplicate call from
  // Board itself does not cause a second network request. Skipped for kanban
  // (its status strip is permission-specific and derives counts elsewhere).
  const boardSource = isKanban ? null : (config?.board?.source ?? null);
  const { data: boardData } = useApiResource<ConsoleBoardResponse>(boardSource, {
    ttlMs: 15_000,
  });

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

  const handleKanbanRefresh = useCallback(() => {
    void refreshKanban();
  }, [refreshKanban]);

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
            ) : (
              <Board
                source={config?.board?.source ?? ""}
                itemKey={config?.board?.itemKey ?? ""}
                onSelect={handleSelect}
              />
            ))}
        </main>

        {selectedRow ? (
          isPermission ? (
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
        {isPermission ? (
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

      {isHod ? (
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
      ) : (
        <CommandBar role={role} open={commandBarOpen} onClose={closeCommandBar} />
      )}
    </div>
  );
}
