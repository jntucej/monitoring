"use client";

/**
 * SupervisorCommandBar — Cmd/Ctrl+K command palette for the Supervisor console.
 *
 * 5-command free-text parser:
 *   approve <ticket>              PATCH /api/permissions/<ticket> { action: APPROVE }
 *   escalate <ticket> to <role>  PATCH /api/permissions/<ticket> { action: ESCALATE, targetRole }
 *   assign <alert> to <user>     POST /api/alerts/assign { alert_id, assignee_user_id }
 *   resolve <alert>              PATCH /api/alerts/<alert>
 *   handover shift <text>        POST /api/campus-extra/handover { toRole, items, notes }
 *
 * Keyboard: up/down to navigate, Enter to execute, Escape to close.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle,
  AlertTriangle,
  UserPlus,
  ShieldCheck,
  ArrowRight,
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
    label: "Approve a ticket",
    hint: "approve <ticket> — Approve a pending escalation ticket",
    icon: CheckCircle,
  },
  {
    id: "escalate",
    label: "Escalate a ticket",
    hint: "escalate <ticket> to <role> — Escalate to a target role",
    icon: AlertTriangle,
  },
  {
    id: "assign",
    label: "Assign an alert",
    hint: "assign <alert> to <user> — Assign an alert to an operator",
    icon: UserPlus,
  },
  {
    id: "resolve",
    label: "Resolve an alert",
    hint: "resolve <alert> — Resolve an active alert",
    icon: ShieldCheck,
  },
  {
    id: "handover",
    label: "Shift handover",
    hint: "handover shift <text> — Create a shift handover note",
    icon: ArrowRight,
  },
];

type Action =
  | "APPROVE"
  | "ESCALATE"
  | "ASSIGN"
  | "RESOLVE"
  | "HANDOVER"
  | "UNKNOWN";

interface ParsedCommand {
  action: Action;
  /** Ticket number (approve / escalate). */
  ticket: string;
  /** Alert ID (assign / resolve). */
  alertId: string;
  /** Target role for escalate. */
  targetRole: string;
  /** Assignee user id for assign. */
  assignee: string;
  /** Free-text handover note. */
  handoverText: string;
}

/**
 * Parse a supervisor free-text command.
 *
 *   approve <ticket>
 *   escalate <ticket> to <role>
 *   assign <alert> to <user>
 *   resolve <alert>
 *   handover shift <text...>
 */
function parseCommand(input: string): ParsedCommand {
  const tokens = input.trim().split(/\s+/);
  const first = (tokens[0] || "").toLowerCase();
  const empty: ParsedCommand = {
    action: "UNKNOWN",
    ticket: "",
    alertId: "",
    targetRole: "",
    assignee: "",
    handoverText: "",
  };

  if (first === "approve") {
    return { ...empty, action: "APPROVE", ticket: tokens[1] ?? "" };
  }

  if (first === "escalate") {
    // escalate <ticket> to <role>
    const ticket = tokens[1] ?? "";
    // Find "to" token and take the next token as the target role.
    const toIdx = tokens.findIndex((t) => t.toLowerCase() === "to");
    const targetRole = toIdx >= 0 ? (tokens[toIdx + 1] ?? "") : "";
    return { ...empty, action: "ESCALATE", ticket, targetRole };
  }

  if (first === "assign") {
    // assign <alert> to <user>
    const alertId = tokens[1] ?? "";
    const toIdx = tokens.findIndex((t, i) => i > 0 && t.toLowerCase() === "to");
    const assignee = toIdx >= 0 ? (tokens[toIdx + 1] ?? "") : "";
    return { ...empty, action: "ASSIGN", alertId, assignee };
  }

  if (first === "resolve") {
    return { ...empty, action: "RESOLVE", alertId: tokens[1] ?? "" };
  }

  if (first === "handover") {
    // handover shift <text...>
    // Drop "handover" and "shift" keywords, keep the rest as the note.
    const noteTokens = tokens.slice(1);
    // Skip a leading "shift" token if present.
    const startIdx =
      noteTokens[0]?.toLowerCase() === "shift" ? 1 : 0;
    const handoverText = noteTokens.slice(startIdx).join(" ");
    return { ...empty, action: "HANDOVER", handoverText };
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
      if (parsed.action === "UNKNOWN") {
        addToast({ variant: "error", message: "Unknown command. Type a command from the list below." });
        return;
      }

      setBusy(true);
      try {
        /* ── approve: PATCH /api/permissions/<ticket> ─────────────── */
        if (parsed.action === "APPROVE") {
          if (!parsed.ticket) {
            addToast({ variant: "error", message: "Usage: approve <ticket>" });
            return;
          }
          const res = await fetch(
            `/api/permissions/${encodeURIComponent(parsed.ticket)}`,
            {
              method: "PATCH",
              headers: getAuthHeaders(),
              body: JSON.stringify({ action: "APPROVE" }),
            }
          );
          const json = await res.json().catch(() => null);
          if (res.ok && json?.success) {
            addToast({ variant: "success", message: `Approved ${parsed.ticket}` });
            onClose();
          } else {
            addToast({ variant: "error", message: json?.error?.message || `Failed to approve ${parsed.ticket}` });
          }
          return;
        }

        /* ── escalate: PATCH /api/permissions/<ticket> ────────────── */
        if (parsed.action === "ESCALATE") {
          if (!parsed.ticket) {
            addToast({ variant: "error", message: "Usage: escalate <ticket> to <role>" });
            return;
          }
          const body: Record<string, string> = { action: "ESCALATE" };
          if (parsed.targetRole) body.targetRole = parsed.targetRole;
          const res = await fetch(
            `/api/permissions/${encodeURIComponent(parsed.ticket)}`,
            {
              method: "PATCH",
              headers: getAuthHeaders(),
              body: JSON.stringify(body),
            }
          );
          const json = await res.json().catch(() => null);
          if (res.ok && json?.success) {
            addToast({
              variant: "success",
              message: `Escalated ${parsed.ticket}${parsed.targetRole ? ` to ${parsed.targetRole}` : ""}`,
            });
            onClose();
          } else {
            addToast({ variant: "error", message: json?.error?.message || `Failed to escalate ${parsed.ticket}` });
          }
          return;
        }

        /* ── assign: POST /api/alerts/assign ──────────────────────── */
        if (parsed.action === "ASSIGN") {
          if (!parsed.alertId || !parsed.assignee) {
            addToast({ variant: "error", message: "Usage: assign <alert> to <user>" });
            return;
          }
          const res = await fetch("/api/alerts/assign", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              alert_id: parsed.alertId,
              assignee_user_id: parsed.assignee,
            }),
          });
          const json = await res.json().catch(() => null);
          if (res.ok && json?.success) {
            addToast({ variant: "success", message: `Assigned alert ${parsed.alertId} to ${parsed.assignee}` });
            onClose();
          } else {
            addToast({ variant: "error", message: json?.error?.message || `Failed to assign alert ${parsed.alertId}` });
          }
          return;
        }

        /* ── resolve: PATCH /api/alerts/<alert> ───────────────────── */
        if (parsed.action === "RESOLVE") {
          if (!parsed.alertId) {
            addToast({ variant: "error", message: "Usage: resolve <alert>" });
            return;
          }
          const res = await fetch(
            `/api/alerts/${encodeURIComponent(parsed.alertId)}`,
            {
              method: "PATCH",
              headers: getAuthHeaders(),
            }
          );
          const json = await res.json().catch(() => null);
          if (res.ok && json?.success) {
            addToast({ variant: "success", message: `Resolved alert ${parsed.alertId}` });
            onClose();
          } else {
            addToast({ variant: "error", message: json?.error?.message || `Failed to resolve alert ${parsed.alertId}` });
          }
          return;
        }

        /* ── handover: POST /api/campus-extra/handover ────────────── */
        if (parsed.action === "HANDOVER") {
          const res = await fetch("/api/campus-extra/handover", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              toRole: "operator",
              items: [
                {
                  type: "shift_note",
                  title: "Shift handover",
                  details: parsed.handoverText || "(no note)",
                },
              ],
              notes: parsed.handoverText || undefined,
            }),
          });
          const json = await res.json().catch(() => null);
          if (res.ok && json?.success) {
            addToast({ variant: "success", message: "Shift handover created" });
            onClose();
          } else {
            addToast({ variant: "error", message: json?.error?.message || "Failed to create handover" });
          }
          return;
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
    if (["approve", "escalate", "assign", "resolve"].includes(first)) {
      if (parsed.action === "UNKNOWN") {
        inputRef.current?.focus();
        return;
      }
      // For assign, require both alert and user.
      if (parsed.action === "ASSIGN" && (!parsed.alertId || !parsed.assignee)) {
        inputRef.current?.focus();
        return;
      }
      // For escalate, ticket is required; targetRole is optional.
      if (parsed.action === "ESCALATE" && !parsed.ticket) {
        inputRef.current?.focus();
        return;
      }
      // For approve / resolve, the id is required.
      if (parsed.action === "APPROVE" && !parsed.ticket) {
        inputRef.current?.focus();
        return;
      }
      if (parsed.action === "RESOLVE" && !parsed.alertId) {
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
            {parsedPreview.action === "APPROVE" ? (
              parsedPreview.ticket ? (
                <span className="ml-1.5 font-mono">{parsedPreview.ticket}</span>
              ) : (
                <span className="ml-1.5 text-[var(--text-muted)] italic">[ticket required]</span>
              )
            ) : null}
            {parsedPreview.action === "ESCALATE" ? (
              <>
                {parsedPreview.ticket ? (
                  <span className="ml-1.5 font-mono">{parsedPreview.ticket}</span>
                ) : (
                  <span className="ml-1.5 text-[var(--text-muted)] italic">[ticket required]</span>
                )}
                {parsedPreview.targetRole ? (
                  <span className="ml-1.5 text-[var(--text-muted)]">to {parsedPreview.targetRole}</span>
                ) : null}
              </>
            ) : null}
            {parsedPreview.action === "ASSIGN" ? (
              <>
                {parsedPreview.alertId ? (
                  <span className="ml-1.5 font-mono">{parsedPreview.alertId}</span>
                ) : (
                  <span className="ml-1.5 text-[var(--text-muted)] italic">[alert required]</span>
                )}
                {parsedPreview.assignee ? (
                  <span className="ml-1.5 text-[var(--text-muted)]">to {parsedPreview.assignee}</span>
                ) : (
                  <span className="ml-1.5 text-[var(--text-muted)] italic">[user required]</span>
                )}
              </>
            ) : null}
            {parsedPreview.action === "RESOLVE" ? (
              parsedPreview.alertId ? (
                <span className="ml-1.5 font-mono">{parsedPreview.alertId}</span>
              ) : (
                <span className="ml-1.5 text-[var(--text-muted)] italic">[alert required]</span>
              )
            ) : null}
            {parsedPreview.action === "HANDOVER" ? (
              parsedPreview.handoverText ? (
                <span className="ml-1.5 text-[var(--text-muted)] italic truncate">
                  "{parsedPreview.handoverText}"
                </span>
              ) : (
                <span className="ml-1.5 text-[var(--text-muted)] italic">[shift note]</span>
              )
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
