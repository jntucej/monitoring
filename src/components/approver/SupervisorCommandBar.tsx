"use client";

/**
 * SupervisorCommandBar — Cmd/Ctrl+K command palette for the Supervisor console.
 *
 * 5-command free-text parser:
 *   approve <ticket>          PATCH /api/permissions/<ticket> { action: APPROVE }
 *   reject <ticket> [reason] PATCH /api/permissions/<ticket> { action: REJECT, comment }
 *   escalate <ticket>        PATCH /api/permissions/<ticket> { action: ESCALATE }
 *   teams                    navigate /supervisor/teams
 *   records                  navigate /supervisor/records
 *
 * Keyboard: up/down to navigate, Enter to execute, Escape to close.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  FileSpreadsheet,
  Search,
  ChevronRight,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { getConsoleConfig } from "@/config/consoles";

interface CommandDef {
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}

const COMMAND_DEFS: CommandDef[] = [
  {
    id: "approve",
    label: "Approve an escalation",
    hint: "approve <ticket> — Approve a pending escalation",
    icon: CheckCircle,
  },
  {
    id: "reject",
    label: "Reject an escalation",
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
    id: "teams",
    label: "View teams",
    hint: "teams — Go to the teams view",
    icon: Users,
  },
  {
    id: "records",
    label: "View records",
    hint: "records — Go to the records view",
    icon: FileSpreadsheet,
  },
];

type Action = "APPROVE" | "REJECT" | "ESCALATE" | "TEAMS" | "RECORDS" | "UNKNOWN";

interface ParsedCommand {
  action: Action;
  ticket: string;
  reason: string;
}

/**
 * Parse a supervisor free-text command.
 *
 *   approve <ticket>
 *   reject <ticket> [reason...]
 *   escalate <ticket>
 *   teams
 *   records
 */
function parseCommand(input: string): ParsedCommand {
  const tokens = input.trim().split(/\s+/);
  const first = (tokens[0] || "").toLowerCase();
  const empty: ParsedCommand = { action: "UNKNOWN", ticket: "", reason: "" };

  if (first === "approve") {
    return { ...empty, action: "APPROVE", ticket: tokens[1] ?? "" };
  }
  if (first === "reject") {
    const rest = tokens.slice(2).join(" ");
    return { ...empty, action: "REJECT", ticket: tokens[1] ?? "", reason: rest };
  }
  if (first === "escalate") {
    return { ...empty, action: "ESCALATE", ticket: tokens[1] ?? "" };
  }
  if (first === "teams") {
    return { ...empty, action: "TEAMS" };
  }
  if (first === "records") {
    return { ...empty, action: "RECORDS" };
  }
  return { ...empty, action: "UNKNOWN" };
}

export interface SupervisorCommandBarProps {
  role: string;
  open: boolean;
  onClose: () => void;
}

export function SupervisorCommandBar({ role, open, onClose }: SupervisorCommandBarProps) {
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
    async (parsed: ParsedCommand) => {
      // ── teams / records: navigate ──
      if (parsed.action === "TEAMS" || parsed.action === "RECORDS") {
        // teams → the operator & shifts roster (closest existing surface).
        // records → the reports/export surface.
        const target =
          parsed.action === "TEAMS" ? "/supervisor/shifts" : "/supervisor/reports";
        window.location.href = target;
        onClose();
        return;
      }

      if (parsed.action === "UNKNOWN") {
        addToast({ variant: "error", message: "Unknown command. Type a command from the list below." });
        return;
      }

      // ── approve / reject / escalate: PATCH /api/permissions/<ticket> ──
      if (!parsed.ticket) {
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
    [addToast, onClose]
  );

  const handleSelect = useCallback((cmd: CommandDef) => {
    setQuery(cmd.id);
    inputRef.current?.focus();
  }, []);

  const handleEnter = useCallback(() => {
    const parsed = parseCommand(query);
    const first = query.trim().toLowerCase();
    // Bare keywords that need more tokens: keep focus so the user can finish.
    if (["approve", "reject", "escalate"].includes(first)) {
      if (parsed.action === "UNKNOWN" || !parsed.ticket) {
        inputRef.current?.focus();
        return;
      }
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

  const parsedPreview = query.trim() ? parseCommand(query) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Supervisor command palette"
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
            placeholder={`Supervisor command (role: ${role})…`}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none min-w-0"
            aria-label="Supervisor command input"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] shrink-0">
            esc
          </kbd>
        </div>

        {/* Parsed-command preview */}
        {parsedPreview && parsedPreview.action !== "UNKNOWN" ? (
          <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] text-[11px] text-[var(--text-secondary)]">
            <span className="font-mono font-bold text-[var(--action-primary)]">
              {parsedPreview.action}
            </span>
            {parsedPreview.action === "APPROVE" || parsedPreview.action === "REJECT" || parsedPreview.action === "ESCALATE" ? (
              <>
                {parsedPreview.ticket ? (
                  <span className="ml-1.5 font-mono">{parsedPreview.ticket}</span>
                ) : (
                  <span className="ml-1.5 text-[var(--text-muted)] italic">[ticket required]</span>
                )}
                {parsedPreview.action === "REJECT" ? (
                  parsedPreview.reason ? (
                    <span className="ml-1.5 text-[var(--text-muted)] italic">reason: {parsedPreview.reason}</span>
                  ) : null
                ) : null}
              </>
            ) : null}
            {busy ? <span className="ml-2 text-[var(--text-muted)]">processing…</span> : null}
          </div>
        ) : null}

        {/* Command list */}
        <ul role="listbox" aria-label="Supervisor commands" className="max-h-64 overflow-y-auto py-1">
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

export default SupervisorCommandBar;
