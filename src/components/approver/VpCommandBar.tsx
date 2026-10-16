"use client";

/**
 * VpCommandBar — Cmd/Ctrl+K command palette for the Vice Principal console.
 *
 * VP is a delegated/oversight role: the 5 commands are pure navigation to
 * the real sub-pages under /vice-principal/ (no ticket-action verbs).
 *
 *   approvals    → /vice-principal/pending-approvals
 *   delegations  → /vice-principal/delegated-responsibilities
 *   audit        → /vice-principal/decision-history
 *   reports      → /vice-principal/reports
 *   records      → /vice-principal/records
 *
 * The sub-page routes mirror the on-disk directory names under
 * src/app/(approver)/vice-principal/.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  KeyRound,
  History,
  FileSpreadsheet,
  ClipboardList,
  Search,
  ChevronRight,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { getConsoleConfig } from "@/config/consoles";

interface CommandDef {
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Target route the command navigates to. */
  href: string;
}

/** All available VP command definitions (5 nav commands, no Account). */
const COMMAND_DEFS: CommandDef[] = [
  {
    id: "approvals",
    label: "Pending Approvals",
    hint: "approvals — VP-stage approval queue",
    icon: CheckSquare,
    href: "/vice-principal/pending-approvals",
  },
  {
    id: "delegations",
    label: "Delegations",
    hint: "delegations — Delegated duties & authority scope",
    icon: KeyRound,
    href: "/vice-principal/delegated-responsibilities",
  },
  {
    id: "audit",
    label: "Audit",
    hint: "audit — Decision history & audit trail",
    icon: History,
    href: "/vice-principal/decision-history",
  },
  {
    id: "reports",
    label: "Reports",
    hint: "reports — Institutional reports",
    icon: FileSpreadsheet,
    href: "/vice-principal/reports",
  },
  {
    id: "records",
    label: "Records",
    hint: "records — Records & analytics",
    icon: ClipboardList,
    href: "/vice-principal/analytics",
  },
];

export interface VpCommandBarProps {
  role: string;
  open: boolean;
  onClose: () => void;
}

export function VpCommandBar({ role, open, onClose }: VpCommandBarProps) {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const available = useMemo(() => {
    const cfg = getConsoleConfig(role);
    const ids: string[] = cfg?.commands ?? [];
    if (ids.length === 0) return COMMAND_DEFS;
    return COMMAND_DEFS.filter((c) => ids.includes(c.id));
  }, [role]);

  const filtered = useMemo(() => {
    if (!query.trim()) return available;
    const q = query.toLowerCase();
    return available.filter(
      (c) => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q) || c.id.toLowerCase().includes(q),
    );
  }, [query, available]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  /** Navigate to the command's target sub-page. */
  const executeCommand = useCallback(
    (cmd: CommandDef) => {
      router.push(cmd.href);
      onClose();
    },
    [router, onClose],
  );

  const handleSelect = useCallback(
    (cmd: CommandDef) => {
      // Bare navigation commands: execute immediately on selection.
      executeCommand(cmd);
    },
    [executeCommand],
  );

  const handleEnter = useCallback(() => {
    if (!query.trim()) {
      if (filtered[active]) handleSelect(filtered[active]);
      return;
    }
    const q = query.toLowerCase();
    const match = filtered.find((c) => c.id.toLowerCase() === q || c.label.toLowerCase() === q);
    if (match) {
      executeCommand(match);
    } else {
      addToast({ variant: "error", message: "Unknown command. Type one of: approvals, delegations, audit, reports, records." });
    }
  }, [query, filtered, active, handleSelect, executeCommand, addToast]);

  const onListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleEnter();
      }
    },
    [filtered, handleEnter],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Vice Principal command palette"
    >
      <div
        className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onListKeyDown}
            placeholder={`Vice Principal command (role: ${role})…`}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none min-w-0"
            aria-label="Vice Principal command input"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] shrink-0">
            esc
          </kbd>
        </div>

        {/* Command list */}
        <ul role="listbox" aria-label="Vice Principal commands" className="max-h-56 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-xs text-[var(--text-muted)]">
              No matching commands
            </li>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isActive = idx === active;
              return (
                <li key={cmd.id} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    onClick={() => handleSelect(cmd)}
                    onMouseEnter={() => setActive(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isActive ? "bg-[var(--action-primary)]/10" : "hover:bg-[var(--bg-elevated)]"
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive
                          ? "bg-[var(--action-primary)]/20 text-[var(--action-primary)]"
                          : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold ${
                          isActive ? "text-[var(--action-primary)]" : "text-[var(--text-primary)]"
                        }`}
                      >
                        {cmd.label}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate font-mono">
                        {cmd.hint}
                      </p>
                    </div>
                    {isActive ? (
                      <ChevronRight className="w-4 h-4 text-[var(--action-primary)] shrink-0" />
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <p className="px-4 py-2 border-t border-[var(--border)] text-[10px] text-[var(--text-muted)]">
          VP scope = delegated oversight. No hostel/branch filter.
        </p>
      </div>
    </div>
  );
}

export default VpCommandBar;
