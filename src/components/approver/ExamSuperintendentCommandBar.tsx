"use client";

/**
 * ExamSuperintendentCommandBar — Cmd/Ctrl+K command palette for the exam
 * superintendent console.
 *
 * Mirrors the OieCommandBar / DeputyWardenCommandBar free-text parser pattern
 * with 5 commands:
 *   approve <ticket>       PATCH /api/permissions/<ticket> { action: APPROVE }
 *   reject <ticket> [reason]  PATCH /api/permissions/<ticket> { action: REJECT, comment }
 *   day-access open|close  POST /api/exam/access { open: boolean }
 *   incident <hall> <severity>  POST /api/exam/access-exceptions
 *   candidates             navigate to /exam/superintendent/access
 *
 * Keyboard: up/down to navigate, Enter to execute, Escape to close.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle,
  XCircle,
  DoorOpen,
  ShieldAlert,
  Users,
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
    label: "Approve an exam ticket",
    hint: "approve <ticket> — Approve a pending exam ticket",
    icon: CheckCircle,
  },
  {
    id: "reject",
    label: "Reject an exam ticket",
    hint: "reject <ticket> [reason] — Reject with optional reason",
    icon: XCircle,
  },
  {
    id: "day-access",
    label: "Open / close exam-day access",
    hint: "day-access open|close — Toggle the exam-day gate state",
    icon: DoorOpen,
  },
  {
    id: "incident",
    label: "Log an exam incident",
    hint: "incident <hall> <severity> — Log a critical/warning/info incident",
    icon: ShieldAlert,
  },
  {
    id: "candidates",
    label: "Open candidate list",
    hint: "candidates — Go to the candidate access list",
    icon: Users,
  },
];

type Action =
  | "APPROVE"
  | "REJECT"
  | "DAY_ACCESS"
  | "INCIDENT"
  | "CANDIDATES"
  | "UNKNOWN";

interface ParsedCommand {
  action: Action;
  ticket: string;
  reason: string;
  dayState: "open" | "close" | "";
  hall: string;
  severity: "critical" | "warning" | "info" | "";
}

function parseCommand(input: string): ParsedCommand {
  const tokens = input.trim().split(/\s+/);
  const first = (tokens[0] || "").toLowerCase();
  const empty: ParsedCommand = {
    action: "UNKNOWN",
    ticket: "",
    reason: "",
    dayState: "",
    hall: "",
    severity: "",
  };

  if (first === "approve") {
    return { ...empty, action: "APPROVE", ticket: tokens[1] ?? "" };
  }
  if (first === "reject") {
    const rest = tokens.slice(2).join(" ");
    return { ...empty, action: "REJECT", ticket: tokens[1] ?? "", reason: rest };
  }
  if (first === "day-access") {
    const raw = (tokens[1] ?? "").toLowerCase();
    const dayState: ParsedCommand["dayState"] =
      raw === "open" ? "open" : raw === "close" ? "close" : "";
    return { ...empty, action: "DAY_ACCESS", dayState };
  }
  if (first === "incident") {
    const hall = tokens[1] ?? "";
    const sev = (tokens[2] ?? "").toLowerCase();
    const severity: ParsedCommand["severity"] =
      sev === "critical" ? "critical" : sev === "warning" ? "warning" : sev === "info" ? "info" : "";
    return { ...empty, action: "INCIDENT", hall, severity };
  }
  if (first === "candidates") {
    return { ...empty, action: "CANDIDATES" };
  }
  return { ...empty, action: "UNKNOWN" };
}

export interface ExamSuperintendentCommandBarProps {
  role: string;
  open: boolean;
  onClose: () => void;
}

export function ExamSuperintendentCommandBar({ role, open, onClose }: ExamSuperintendentCommandBarProps) {
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
      // ── candidates: navigate to the candidate access list ──
      if (parsed.action === "CANDIDATES") {
        window.location.href = "/exam/superintendent/access";
        onClose();
        return;
      }

      // ── day-access: POST /api/exam/access { open } ──
      if (parsed.action === "DAY_ACCESS") {
        if (parsed.dayState !== "open" && parsed.dayState !== "close") {
          addToast({ variant: "error", message: "Usage: day-access open|close" });
          return;
        }
        setBusy(true);
        try {
          const res = await fetch("/api/exam/access", {
            method: "POST",
            headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ open: parsed.dayState === "open" }),
          });
          const json = await res.json().catch(() => null);
          if (res.ok && json?.success) {
            addToast({
              variant: "success",
              message: `Exam day access ${parsed.dayState === "open" ? "opened" : "closed"}`,
            });
            onClose();
          } else {
            addToast({
              variant: "info",
              message:
                json?.error?.message ||
                `Day-access ${parsed.dayState}: endpoint not available yet`,
            });
          }
        } catch {
          addToast({ variant: "info", message: "Day-access: endpoint not available yet" });
        } finally {
          setBusy(false);
        }
        return;
      }

      // ── incident: POST /api/exam/access-exceptions ──
      if (parsed.action === "INCIDENT") {
        if (!parsed.hall || (parsed.severity !== "critical" && parsed.severity !== "warning" && parsed.severity !== "info")) {
          addToast({
            variant: "error",
            message: "Usage: incident <hall> <critical|warning|info>",
          });
          return;
        }
        setBusy(true);
        try {
          const res = await fetch("/api/exam/access-exceptions", {
            method: "POST",
            headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({
              hall: parsed.hall,
              severity: parsed.severity,
              description: `Incident logged from exam superintendent console for hall ${parsed.hall}`,
            }),
          });
          const json = await res.json().catch(() => null);
          if (res.ok && json?.success) {
            addToast({
              variant: "success",
              message: `Incident logged: ${parsed.hall} (${parsed.severity})`,
            });
            onClose();
          } else if (res.status === 405 || res.status === 404) {
            addToast({
              variant: "info",
              message: "Incident endpoint not available yet",
            });
          } else {
            addToast({
              variant: "error",
              message:
                json?.error?.message || `Failed to log incident for ${parsed.hall}`,
            });
          }
        } catch {
          addToast({ variant: "info", message: "Incident endpoint not available yet" });
        } finally {
          setBusy(false);
        }
        return;
      }

      if (parsed.action === "UNKNOWN") {
        addToast({ variant: "error", message: "Unknown command. Type a command from the list below." });
        return;
      }

      // ── approve / reject: PATCH /api/permissions/<ticket> ──
      if (!parsed.ticket) {
        addToast({ variant: "error", message: "Usage: <action> <ticket>" });
        return;
      }

      const body: Record<string, string> = { action: parsed.action };
      if (parsed.reason) body.comment = parsed.reason;

      setBusy(true);
      try {
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
    const prefix =
      cmd.id === "day-access" ? "day-access " :
      cmd.id === "incident" ? "incident " :
      cmd.id === "candidates" ? "candidates" :
      `${cmd.id} `;
    setQuery(prefix);
    inputRef.current?.focus();
  }, []);

  const handleEnter = useCallback(() => {
    const parsed = parseCommand(query);
    const first = query.trim().toLowerCase();

    // "candidates" needs no tokens — run it immediately when typed.
    if (parsed.action === "CANDIDATES") {
      void executeCommand(parsed);
      return;
    }

    // Bare keywords that need more tokens: keep focus so the user can finish.
    if (["approve", "reject", "day-access", "incident"].includes(first)) {
      if (
        parsed.action === "UNKNOWN" ||
        (!parsed.ticket && parsed.action !== "DAY_ACCESS" && parsed.action !== "INCIDENT") ||
        (parsed.action === "DAY_ACCESS" && parsed.dayState === "") ||
        (parsed.action === "INCIDENT" && (!parsed.hall || parsed.severity === ""))
      ) {
        inputRef.current?.focus();
        return;
      }
    }
    void executeCommand(parsed);
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
      aria-label="Exam superintendent command palette"
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
            placeholder={`Exam superintendent command (role: ${role})…`}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none min-w-0"
            aria-label="Exam superintendent command input"
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
            {parsedPreview.action === "INCIDENT" ? (
              <>
                {parsedPreview.hall ? (
                  <span className="ml-1.5 font-mono">{parsedPreview.hall}</span>
                ) : (
                  <span className="ml-1.5 text-[var(--text-muted)] italic">[hall required]</span>
                )}
                {parsedPreview.severity ? (
                  <span className="ml-1.5 text-[var(--text-muted)] italic">{parsedPreview.severity}</span>
                ) : (
                  <span className="ml-1.5 text-[var(--text-muted)] italic">[critical|warning|info required]</span>
                )}
              </>
            ) : parsedPreview.action === "DAY_ACCESS" ? (
              parsedPreview.dayState ? (
                <span className="ml-1.5 text-[var(--text-muted)] italic">{parsedPreview.dayState}</span>
              ) : (
                <span className="ml-1.5 text-[var(--text-muted)] italic">[open|close required]</span>
              )
            ) : (
              <>
                {parsedPreview.ticket ? (
                  <span className="ml-1.5 font-mono">{parsedPreview.ticket}</span>
                ) : (
                  <span className="ml-1.5 text-[var(--text-muted)] italic">[ticket required]</span>
                )}
                {parsedPreview.reason ? (
                  <span className="ml-1.5 text-[var(--text-muted)] italic">reason: {parsedPreview.reason}</span>
                ) : null}
              </>
            )}
            {busy ? <span className="ml-2 text-[var(--text-muted)]">processing…</span> : null}
          </div>
        ) : null}

        {/* Command list */}
        <ul role="listbox" aria-label="Exam superintendent commands" className="max-h-64 overflow-y-auto py-1">
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

export default ExamSuperintendentCommandBar;
