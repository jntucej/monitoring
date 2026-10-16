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
import { ContextPanel } from "@/components/shared/ContextPanel";
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

  // Fetch the board source so we can derive counts + lastScan for the status
  // bar. The fetch is cached by useApiResource, so a duplicate call from
  // Board itself does not cause a second network request.
  const boardSource = config?.board?.source ?? null;
  const { data: boardData } = useApiResource<ConsoleBoardResponse>(boardSource, {
    ttlMs: 15_000,
  });

  const counts = useMemo(
    () => boardData?.data?.counts ?? null,
    [boardData],
  );

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
          {children ?? (
            <Board
              source={config?.board?.source ?? ""}
              itemKey={config?.board?.itemKey ?? ""}
              onSelect={handleSelect}
            />
          )}
        </main>

        {selectedRow ? (
          <ContextPanel
            row={selectedRow}
            onClose={handleCloseContext}
            historyHref={`${roleRoot}/transactions`}
          />
        ) : null}
      </div>

      {/* Status bar — full width, sticky at the bottom of the shell */}
      <div className="sticky bottom-0 z-30">
        <StatusBar counts={counts} lastScan={lastScan} />
      </div>

      <CommandBar role={role} open={commandBarOpen} onClose={closeCommandBar} />
    </div>
  );
}
