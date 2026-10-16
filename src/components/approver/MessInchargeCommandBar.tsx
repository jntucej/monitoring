"use client";

/**
 * MessInchargeCommandBar — Cmd/Ctrl+K command palette for the mess In-charge
 * console.
 *
 * Mirrors the DeputyWardenCommandBar free-text parser pattern with 5
 * navigation commands — all five are page navigations (the mess In-charge is
 * a read/coordinate role for these surfaces), each routing to the real mess
 * sub-page under /mess/:
 *   meals     → /mess/menu-management
 *   inventory → /mess/inventory-stock
 *   requests  → /mess/operational-requests
 *   records   → /mess/meal-attendance
 *   reports   → /mess/consumption-reports
 *
 * Keyboard: up/down to navigate, Enter to execute, Escape to close.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  UtensilsCrossed,
  Package,
  Send,
  FileSpreadsheet,
  BarChart3,
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
  href: string;
}

/** All mess In-charge navigation commands. */
const COMMAND_DEFS: CommandDef[] = [
  {
    id: "meals",
    label: "Open meals / menu",
    hint: "meals — Go to the mess menu-management page",
    icon: UtensilsCrossed,
    href: "/mess/menu-management",
  },
  {
    id: "inventory",
    label: "Open inventory & stock",
    hint: "inventory — Go to the inventory & stock page",
    icon: Package,
    href: "/mess/inventory-stock",
  },
  {
    id: "requests",
    label: "Open operational requests",
    hint: "requests — Go to the operational-requests queue",
    icon: Send,
    href: "/mess/operational-requests",
  },
  {
    id: "records",
    label: "Open meal attendance / records",
    hint: "records — Go to the meal-attendance records page",
    icon: FileSpreadsheet,
    href: "/mess/meal-attendance",
  },
  {
    id: "reports",
    label: "Open consumption reports",
    hint: "reports — Go to the consumption-reports page",
    icon: BarChart3,
    href: "/mess/consumption-reports",
  },
];

type Action = "NAVIGATE" | "UNKNOWN";

interface ParsedCommand {
  action: Action;
  commandId: string;
}

/**
 * Parse a mess In-charge free-text command. Each of the five keywords routes
 * to its mess sub-page; anything else is UNKNOWN.
 */
function parseCommand(input: string): ParsedCommand {
  const tokens = input.trim().split(/\s+/);
  const first = (tokens[0] || "").toLowerCase();
  const match = COMMAND_DEFS.find((c) => c.id === first);
  if (match) {
    return { action: "NAVIGATE", commandId: match.id };
  }
  return { action: "UNKNOWN", commandId: "" };
}

export interface MessInchargeCommandBarProps {
  role: string;
  open: boolean;
  onClose: () => void;
}

export function MessInchargeCommandBar({ role, open, onClose }: MessInchargeCommandBarProps) {
  const addToast = useUIStore((s) => s.addToast);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
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
      (c) => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q)
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

  const executeCommand = useCallback(
    (parsed: ParsedCommand) => {
      if (parsed.action === "UNKNOWN") {
        addToast({ variant: "error", message: "Unknown command. Type a command from the list below." });
        return;
      }
      const target = available.find((c) => c.id === parsed.commandId);
      if (!target) {
        addToast({ variant: "error", message: "Command not available for this console." });
        return;
      }
      setBusy(true);
      window.location.href = target.href;
      onClose();
    },
    [available, addToast, onClose]
  );

  const handleSelect = useCallback((cmd: CommandDef) => {
    setQuery(cmd.id);
    inputRef.current?.focus();
  }, []);

  const handleEnter = useCallback(() => {
    const parsed = parseCommand(query);
    if (parsed.action === "UNKNOWN") {
      // Keep focus so the user can finish typing the command keyword.
      inputRef.current?.focus();
      return;
    }
    executeCommand(parsed);
  }, [executeCommand, query]);

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
        if (!query.trim()) {
          if (filtered[active]) handleSelect(filtered[active]);
        } else {
          handleEnter();
        }
      }
    },
    [filtered, active, handleSelect, handleEnter, query]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Mess In-charge command palette"
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
            placeholder={`Mess command (role: ${role})…`}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none min-w-0"
            aria-label="Mess In-charge command input"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] shrink-0">
            esc
          </kbd>
        </div>

        {/* Command list */}
        <ul role="listbox" aria-label="Mess In-charge commands" className="max-h-64 overflow-y-auto py-1">
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
                    disabled={busy}
                    onClick={() => handleSelect(cmd)}
                    onMouseEnter={() => setActive(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors disabled:opacity-50 ${
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
      </div>
    </div>
  );
}

export default MessInchargeCommandBar;
