"use client";

/**
 * PermissionCommandBar — Cmd/Ctrl+K command palette for the HOD console.
 *
 * Parses free-text commands:
 *   approve <ticket>            PATCH /api/permissions/<ticket> { action: "APPROVE" }
 *   reject <ticket> [reason]   PATCH /api/permissions/<ticket> { action: "REJECT", comment }
 *   escalate <ticket>          PATCH /api/permissions/<ticket> { action: "ESCALATE" }
 *   dept stats                  router.push("/hod/department-reports")
 *
 * When the input is empty the available commands are listed as hints.
 * Keyboard: up/down to navigate, Enter to execute, Escape to close.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart,
  Search,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { getConsoleConfig } from "@/config/consoles";

interface CommandDef {
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** All available permission command definitions. */
const COMMAND_DEFS: CommandDef[] = [
  {
    id: "approve",
    label: "Approve a permission",
    hint: "approve <ticket> — Approve a pending permission",
    icon: CheckCircle,
  },
  {
    id: "reject",
    label: "Reject a permission",
    hint: "reject <ticket> [reason] — Reject with optional reason",
    icon: XCircle,
  },
  {
    id: "escalate",
    label: "Escalate to next stage",
    hint: "escalate <ticket> — Escalate to the next stage",
    icon: AlertTriangle,
  },
  {
    id: "dept-stats",
    label: "View department reports",
    hint: "dept stats — Open department reports",
    icon: BarChart,
  },
];

interface ParsedCommand {
  action: "APPROVE" | "REJECT" | "ESCALATE" | "DEPT_STATS" | "UNKNOWN";
  ticket: string;
  reason: string;
}

function parseCommand(input: string): ParsedCommand {
  const tokens = input.trim().split(/\s+/);
  const first = (tokens[0] || "").toLowerCase();

  if (first === "dept") {
    return { action: "DEPT_STATS", ticket: "", reason: "" };
  }
  if (first === "approve") {
    return { action: "APPROVE", ticket: tokens[1] ?? "", reason: "" };
  }
  if (first === "reject") {
    const rest = tokens.slice(2).join(" ");
    return { action: "REJECT", ticket: tokens[1] ?? "", reason: rest };
  }
  if (first === "escalate") {
    return { action: "ESCALATE", ticket: tokens[1] ?? "", reason: "" };
  }
  return { action: "UNKNOWN", ticket: input.trim(), reason: "" };
}

export interface PermissionCommandBarProps {
  role: string;
  open: boolean;
  onClose: () => void;
}

export function PermissionCommandBar({ role, open, onClose }: PermissionCommandBarProps) {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const available = useMemo(() => {
    const cfg = getConsoleConfig(role);
    const ids: string[] = cfg?.commands ?? [];
    // Fall back to all permission commands when the config omits a list.
    if (ids.length === 0) return COMMAND_DEFS;
    return COMMAND_DEFS.filter((c) => ids.includes(c.id));
  }, [role]);

  const filtered = useMemo(() => {
    if (!query.trim()) return available;
    const q = query.toLowerCase();
    return available.filter(
      (c) => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q),
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
    async (parsed: ParsedCommand) => {
      if (parsed.action === "DEPT_STATS") {
        router.push("/hod/department-reports");
        addToast({ variant: "info", message: "Opening department reports" });
        onClose();
        return;
      }

      if (parsed.action === "UNKNOWN" || !parsed.ticket) {
        addToast({ variant: "error", message: "Usage: <action> <ticket>" });
        return;
      }

      const body: Record<string, string> = { action: parsed.action };
      if (parsed.reason) body.comment = parsed.reason;

      setBusy(true);
      try {
        const res = await fetch(`/api/permissions/${encodeURIComponent(parsed.ticket)}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success) {
          addToast({
            variant: parsed.action === "REJECT" ? "info" : "success",
            message: `${parsed.action} processed for ${parsed.ticket}`,
          });
          onClose();
        } else {
          addToast({
            variant: "error",
            message: json?.error?.message || `Failed to ${parsed.action} ${parsed.ticket}`,
          });
        }
      } catch {
        addToast({ variant: "error", message: "Network error while processing command" });
      } finally {
        setBusy(false);
      }
    },
    [addToast, onClose, router],
  );

  const handleSelect = useCallback(
    (cmd: CommandDef) => {
      if (cmd.id === "dept-stats") {
        executeCommand({ action: "DEPT_STATS", ticket: "", reason: "" });
      } else {
        // Selecting a command from the list fills the input so the user
        // can type the ticket number inline.
        setQuery(`${cmd.id} `);
        inputRef.current?.focus();
      }
    },
    [executeCommand],
  );

  const handleEnter = useCallback(() => {
    const parsed = parseCommand(query);
    const first = query.trim().toLowerCase();
    // Bare keyword: keep focus so the user can type the ticket number.
    if (["approve", "reject", "escalate"].includes(first)) {
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
    [filtered, active, handleSelect, handleEnter, query],
  );

  if (!open) return null;

  const parsedPreview = query.trim() ? parseCommand(query) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="HOD command palette"
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
            placeholder={`HOD command (role: ${role})…`}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none min-w-0"
            aria-label="HOD command input"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] shrink-0">
            esc
          </kbd>
        </div>

        {/* Parsed-command preview */}
        {parsedPreview && parsedPreview.action !== "UNKNOWN" && parsedPreview.action !== "DEPT_STATS" ? (
          <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] text-[11px] text-[var(--text-secondary)]">
            <span className="font-mono font-bold text-[var(--action-primary)]">
              {parsedPreview.action}
            </span>
            {parsedPreview.ticket ? (
              <span className="ml-1.5 font-mono">{parsedPreview.ticket}</span>
            ) : (
              <span className="ml-1.5 text-[var(--text-muted)] italic">[ticket required]</span>
            )}
            {parsedPreview.reason ? (
              <span className="ml-1.5 text-[var(--text-muted)] italic">reason: {parsedPreview.reason}</span>
            ) : null}
            {busy ? <span className="ml-2 text-[var(--text-muted)]">processing…</span> : null}
          </div>
        ) : null}

        {/* Command list */}
        <ul role="listbox" aria-label="HOD commands" className="max-h-56 overflow-y-auto py-1">
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
