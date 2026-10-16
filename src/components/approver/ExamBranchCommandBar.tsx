"use client";

/**
 * ExamBranchCommandBar — Cmd/Ctrl+K command palette for the exam-branch
 * console.
 *
 * Mirrors the DeputyWardenCommandBar / OieCommandBar free-text parser
 * pattern with 5 commands:
 *   verify <ticket>       PATCH /api/permissions/<ticket> { action: "verify" }
 *   forward <ticket> to oie
 *                         POST /api/permissions/<ticket>/forward { targetRole: "oie" }
 *   oie-handoff           navigate to /exam-branch/oie-handoff
 *   records               navigate to /exam-branch/records
 *   discrepancies         navigate to /exam-branch/discrepancies
 *
 * The three navigation commands are bare keywords (no arguments). verify and
 * forward are ticket-scoped.
 *
 * Keyboard: up/down to navigate, Enter to execute, Escape to close.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle,
  ArrowRight,
  ArrowLeftRight,
  FileSpreadsheet,
  ShieldAlert,
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
    id: "verify",
    label: "Verify an exam ticket",
    hint: "verify <ticket> — Verify a pending exam ticket",
    icon: CheckCircle,
  },
  {
    id: "forward",
    label: "Forward a ticket to OIE",
    hint: "forward <ticket> to oie — Forward to the OIE role",
    icon: ArrowRight,
  },
  {
    id: "oie-handoff",
    label: "Open OIE Handoff",
    hint: "oie-handoff — Go to the OIE handoff list",
    icon: ArrowLeftRight,
  },
  {
    id: "records",
    label: "Open exam records",
    hint: "records — Go to the exam records list",
    icon: FileSpreadsheet,
  },
  {
    id: "discrepancies",
    label: "Open discrepancies",
    hint: "discrepancies — Go to the discrepancies list",
    icon: ShieldAlert,
  },
];

type Action =
  | "VERIFY"
  | "FORWARD"
  | "OIE_HANDOFF"
  | "RECORDS"
  | "DISCREPANCIES"
  | "UNKNOWN";

interface ParsedCommand {
  action: Action;
  ticket: string;
  targetRole: string;
}

/**
 * Parse an exam-branch free-text command.
 *
 *   verify <ticket>
 *   forward <ticket> to oie
 *   oie-handoff
 *   records
 *   discrepancies
 */
function parseCommand(input: string): ParsedCommand {
  const tokens = input.trim().split(/\s+/);
  const first = (tokens[0] || "").toLowerCase();
  const empty: ParsedCommand = {
    action: "UNKNOWN",
    ticket: "",
    targetRole: "",
  };

  if (first === "verify") {
    return { ...empty, action: "VERIFY", ticket: tokens[1] ?? "" };
  }
  if (first === "forward") {
    // forward <ticket> to oie
    const ticket = tokens[1] ?? "";
    const toIdx = tokens.findIndex((t) => t.toLowerCase() === "to");
    const targetRole = toIdx > 0 ? tokens[toIdx + 1] ?? "" : "oie";
    return { ...empty, action: "FORWARD", ticket, targetRole };
  }
  if (first === "oie-handoff") {
    return { ...empty, action: "OIE_HANDOFF" };
  }
  if (first === "records") {
    return { ...empty, action: "RECORDS" };
  }
  if (first === "discrepancies") {
    return { ...empty, action: "DISCREPANCIES" };
  }
  return { ...empty, action: "UNKNOWN" };
}

export interface ExamBranchCommandBarProps {
  role: string;
  open: boolean;
  onClose: () => void;
}

export function ExamBranchCommandBar({ role, open, onClose }: ExamBranchCommandBarProps) {
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

  const navigate = useCallback(
    (href: string) => {
      window.location.href = href;
      onClose();
    },
    [onClose],
  );

  const executeCommand = useCallback(
    async (parsed: ParsedCommand) => {
      // ── navigation commands: bare keywords ──
      if (parsed.action === "OIE_HANDOFF") {
        navigate("/exam-branch/oie-handoff");
        return;
      }
      if (parsed.action === "RECORDS") {
        navigate("/exam-branch/records");
        return;
      }
      if (parsed.action === "DISCREPANCIES") {
        navigate("/exam-branch/discrepancies");
        return;
      }

      if (parsed.action === "UNKNOWN") {
        addToast({ variant: "error", message: "Unknown command. Type a command from the list below." });
        return;
      }

      // ── verify: PATCH /api/permissions/<ticket> { action: "verify" } ──
      if (parsed.action === "VERIFY") {
        if (!parsed.ticket) {
          addToast({ variant: "error", message: "Usage: verify <ticket>" });
          return;
        }
        setBusy(true);
        try {
          const res = await fetch(
            `/api/permissions/${encodeURIComponent(parsed.ticket)}`,
            {
              method: "PATCH",
              headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
              body: JSON.stringify({ action: "verify" }),
            },
          );
          const json = await res.json().catch(() => null);
          if (res.ok && json?.success) {
            addToast({
              variant: "success",
              message: `Verified ${parsed.ticket}`,
            });
            onClose();
          } else {
            addToast({
              variant: "error",
              message:
                json?.error?.message || `Failed to verify ${parsed.ticket}`,
            });
          }
        } catch {
          addToast({ variant: "error", message: "Network error while verifying ticket" });
        } finally {
          setBusy(false);
        }
        return;
      }

      // ── forward: POST /api/permissions/<ticket>/forward { targetRole: "oie" } ──
      if (!parsed.ticket) {
        addToast({ variant: "error", message: "Usage: forward <ticket> to oie" });
        return;
      }
      const targetRole = parsed.targetRole || "oie";
      setBusy(true);
      try {
        const res = await fetch(
          `/api/permissions/${encodeURIComponent(parsed.ticket)}/forward`,
          {
            method: "POST",
            headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({
              targetRole,
              comment: "forwarded from exam branch to OIE",
            }),
          },
        );
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success) {
          addToast({
            variant: "success",
            message: `Forwarded ${parsed.ticket} to ${targetRole}`,
          });
          onClose();
        } else {
          addToast({
            variant: "error",
            message:
              json?.error?.message ||
              `Failed to forward ${parsed.ticket} to ${targetRole}`,
          });
        }
      } catch {
        addToast({ variant: "error", message: "Network error while forwarding ticket" });
      } finally {
        setBusy(false);
      }
    },
    [addToast, onClose, navigate],
  );

  const handleSelect = useCallback(
    (cmd: CommandDef) => {
      // Bare navigation keywords: fill the whole keyword so Enter executes.
      // verify / forward: prefix the keyword so the user can type the ticket.
      const prefix =
        cmd.id === "oie-handoff" || cmd.id === "records" || cmd.id === "discrepancies"
          ? cmd.id
          : `${cmd.id} `;
      setQuery(prefix);
      inputRef.current?.focus();
    },
    [],
  );

  const handleEnter = useCallback(() => {
    const parsed = parseCommand(query);
    const first = query.trim().toLowerCase();
    // verify / forward need a ticket; the nav keywords are complete on their own.
    if (
      (first === "verify" && parsed.action !== "VERIFY") ||
      (first === "forward" && parsed.action !== "FORWARD") ||
      (parsed.action === "VERIFY" && !parsed.ticket) ||
      (parsed.action === "FORWARD" && !parsed.ticket)
    ) {
      inputRef.current?.focus();
      return;
    }
    if (parsed.action === "UNKNOWN") {
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
      aria-label="Exam Branch command palette"
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
            placeholder={`Exam Branch command (role: ${role})…`}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none min-w-0"
            aria-label="Exam Branch command input"
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
            {parsedPreview.action === "VERIFY" || parsedPreview.action === "FORWARD" ? (
              <>
                {parsedPreview.ticket ? (
                  <span className="ml-1.5 font-mono">{parsedPreview.ticket}</span>
                ) : (
                  <span className="ml-1.5 text-[var(--text-muted)] italic">[ticket required]</span>
                )}
                {parsedPreview.action === "FORWARD" ? (
                  <span className="ml-1.5 text-[var(--text-muted)] italic">
                    to {parsedPreview.targetRole || "oie"}
                  </span>
                ) : null}
              </>
            ) : null}
            {busy ? <span className="ml-2 text-[var(--text-muted)]">processing…</span> : null}
          </div>
        ) : null}

        {/* Command list */}
        <ul role="listbox" aria-label="Exam Branch commands" className="max-h-64 overflow-y-auto py-1">
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

export default ExamBranchCommandBar;
