"use client";

/**
 * HostelManagerCommandBar — Cmd/Ctrl+K command palette for the hostel manager
 * console.
 *
 * Parses free-text commands:
 *   assign <ticket> to <staff>   PATCH /api/permissions/<ticket>
 *                                { action: "FORWARD", comment: "to <staff>" }
 *   resolve <ticket> [note]      PATCH /api/permissions/<ticket>
 *                                { action: "APPROVE", comment: note }
 *   allocate <roll> to <room>-<bed>  PATCH /api/students/<roll>
 *                                   { hostelBlock: room, hostelRoom: "<room>-<bed>" }
 *   escalate <ticket>            PATCH /api/permissions/<ticket>
 *                                { action: "ESCALATE" }
 *   residents                    router.push("/hostel-manager/housekeeping-tasks")
 *
 * Ticket actions flow through the same /api/permissions/[ticket] PATCH the
 * caretaker command bar uses; the allocate command targets the student room-
 * allocation PATCH. Keyboard: up/down to navigate, Enter to execute,
 * Escape to close.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  UserCheck,
  CheckCircle,
  AlertTriangle,
  BedDouble,
  Users,
  Search,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { getConsoleConfig } from "@/config/consoles";
import {
  parseCommand,
  HOSTEL_MANAGER_COMMANDS,
  type ParsedCommand,
} from "@/lib/commands/parse";

// ── Shell's command defs (icon-bound; the parser + grammar live in the kernel) ──
interface CommandDef {
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** All available hostel-manager command definitions (shell-local: owns icons + layout). */
const COMMAND_DEFS: CommandDef[] = [
  {
    id: "assign",
    label: "Assign a ticket to staff",
    hint: "assign <ticket> to <staff> — Forward a ticket to a staff member",
    icon: UserCheck,
  },
  {
    id: "resolve",
    label: "Resolve a ticket",
    hint: "resolve <ticket> [note] — Approve/resolve a pending ticket",
    icon: CheckCircle,
  },
  {
    id: "allocate",
    label: "Allocate a bed",
    hint: "allocate <roll> to <room>-<bed> — Assign a student to a room/bed",
    icon: BedDouble,
  },
  {
    id: "escalate",
    label: "Escalate to next stage",
    hint: "escalate <ticket> — Escalate a ticket to a higher stage",
    icon: AlertTriangle,
  },
  {
    id: "view-residents",
    label: "View resident service requests",
    hint: "residents — Open resident service requests",
    icon: Users,
  },
];

/**
 * Role-specific parser for the hostel-manager's `allocate <roll> to <room>-<bed>`
 * verb, which the shared kernel grammar can't fully express (the room-bed split).
 * Everything else (assign / resolve / escalate / residents) uses the kernel parser.
 */
function hmParse(input: string, base: ParsedCommand): ParsedCommand {
  const tokens = input.trim().split(/\s+/);
  const first = (tokens[0] ?? "").toLowerCase();
  if (first === "allocate") {
    const roll = tokens[1] ?? "";
    const toIdx = tokens.findIndex((t) => t.toLowerCase() === "to");
    const target = toIdx > 0 ? (tokens[toIdx + 1] ?? "") : "";
    const dashIdx = target.indexOf("-");
    const roomBlock = dashIdx >= 0 ? target.slice(0, dashIdx) : target;
    const bedNumber = dashIdx >= 0 ? target.slice(dashIdx + 1) : "";
    return {
      ...base,
      action: "ALLOCATE",
      id: "allocate",
      args: { roll, roomBlock, bedNumber, ticket: roll },
    };
  }
  return base;
}

export interface HostelManagerCommandBarProps {
  role: string;
  open: boolean;
  onClose: () => void;
}

export function HostelManagerCommandBar({ role, open, onClose }: HostelManagerCommandBarProps) {
  const router = useRouter();
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

  const executeCommand = useCallback(
    async (parsed: ParsedCommand) => {
      const a = parsed.args;

      // ── residents: navigate to resident service requests ──
      if (parsed.action === "VIEW_RESIDENTS") {
        router.push("/hostel-manager/housekeeping-tasks");
        addToast({ variant: "info", message: "Opening resident service requests" });
        onClose();
        return;
      }

      // ── allocate: PATCH /api/students/<roll> ──
      if (parsed.action === "ALLOCATE") {
        if (!a.roll || !a.roomBlock) {
          addToast({
            variant: "error",
            message: "Usage: allocate <roll> to <room>-<bed>",
          });
          return;
        }
        setBusy(true);
        try {
          const hostelRoom = a.bedNumber
            ? `${a.roomBlock}-${a.bedNumber}`
            : a.roomBlock;
          const res = await fetch(`/api/students/${encodeURIComponent(a.roll)}`, {
            method: "PATCH",
            headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({
              hostelBlock: a.roomBlock,
              hostelRoom,
            }),
          });
          const json = await res.json().catch(() => null);
          if (res.ok && json?.success) {
            addToast({
              variant: "success",
              message: `Allocated ${a.roll} → ${hostelRoom}`,
            });
            onClose();
          } else {
            addToast({
              variant: "error",
              message:
                json?.error?.message || `Failed to allocate ${a.roll} to ${hostelRoom}`,
            });
          }
        } catch {
          addToast({ variant: "error", message: "Network error while allocating bed" });
        } finally {
          setBusy(false);
        }
        return;
      }

      if (parsed.action === "UNKNOWN" || !a.ticket) {
        addToast({
          variant: "error",
          message: "Usage: <action> <ticket> [note]",
        });
        return;
      }

      const body: Record<string, string> = { action: parsed.action };
      if (a.comment) body.comment = a.comment;

      setBusy(true);
      try {
        const res = await fetch(`/api/permissions/${encodeURIComponent(a.ticket)}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success) {
          addToast({
            variant: "success",
            message: `${parsed.action} processed for ${a.ticket}`,
          });
          onClose();
        } else {
          addToast({
            variant: "error",
            message: json?.error?.message || `Failed to ${parsed.action} ${a.ticket}`,
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
      setQuery(`${cmd.id} `);
      inputRef.current?.focus();
    },
    [],
  );

  const handleEnter = useCallback(() => {
    const parsed = parseCommand(query, HOSTEL_MANAGER_COMMANDS, hmParse);
    const a = parsed.args;
    const first = query.trim().toLowerCase();
    // Bare keyword: keep focus so the user can type the remaining tokens.
    if (["assign", "forward", "resolve", "escalate", "allocate"].includes(first)) {
      if (parsed.action === "UNKNOWN" || (parsed.action !== "ESCALATE" && !a.ticket)) {
        inputRef.current?.focus();
        return;
      }
      if (parsed.action === "ALLOCATE" && !a.roll) {
        inputRef.current?.focus();
        return;
      }
      if (parsed.action === "ESCALATE" && !a.ticket) {
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
    [filtered, active, handleSelect, handleEnter, query],
  );

  if (!open) return null;

  const parsedPreview = query.trim() ? parseCommand(query, HOSTEL_MANAGER_COMMANDS, hmParse) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Hostel Manager command palette"
    >
      <div
        className="w-full max-w-md bg-bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="surface-card flex items-center gap-2 px-4 py-3">
          <Search className="w-4 h-4 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onListKeyDown}
            placeholder={`Hostel Manager command (role: ${role})…`}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none min-w-0"
            aria-label="Hostel Manager command input"
          />
          <kbd className="surface-card text-xs font-mono px-1.5 py-0.5 bg-bg-elevated text-text-muted shrink-0">
            esc
          </kbd>
        </div>

        {/* Parsed-command preview */}
        {parsedPreview && parsedPreview.action !== "UNKNOWN" ? (
          <div className="surface-card px-4 py-2 bg-bg-elevated text-xs text-text-secondary">
            <span className="font-mono font-bold text-action-primary">
              {parsedPreview.action}
            </span>
            {parsedPreview.action === "ALLOCATE" ? (
              <>
                {parsedPreview.args.roll ? (
                  <span className="ml-1.5 font-mono">{parsedPreview.args.roll}</span>
                ) : (
                  <span className="ml-1.5 text-text-muted italic">[roll required]</span>
                )}
                {parsedPreview.args.roomBlock ? (
                  <span className="ml-1.5 text-text-muted italic">
                    to {parsedPreview.args.roomBlock}
                    {parsedPreview.args.bedNumber ? `-${parsedPreview.args.bedNumber}` : ""}
                  </span>
                ) : (
                  <span className="ml-1.5 text-text-muted italic">[room required]</span>
                )}
              </>
            ) : (
              <>
                {parsedPreview.args.ticket ? (
                  <span className="ml-1.5 font-mono">{parsedPreview.args.ticket}</span>
                ) : parsedPreview.action === "VIEW_RESIDENTS" ? null : (
                  <span className="ml-1.5 text-text-muted italic">[ticket required]</span>
                )}
                {parsedPreview.args.comment ? (
                  <span className="ml-1.5 text-text-muted italic">
                    note: {parsedPreview.args.comment}
                  </span>
                ) : null}
              </>
            )}
            {busy ? <span className="ml-2 text-text-muted">processing…</span> : null}
          </div>
        ) : null}

        {/* Command list */}
        <ul role="listbox" aria-label="Hostel Manager commands" className="max-h-56 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-xs text-text-muted">
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
                      isActive ? "bg-action-primary/10" : "hover:bg-bg-elevated"
                    }`}
                  >
                    <span
                      className={`size-6 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive
                          ? "bg-action-primary/20 text-action-primary"
                          : "bg-bg-elevated text-text-secondary"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold ${
                          isActive ? "text-action-primary" : "text-text-primary"
                        }`}
                      >
                        {cmd.label}
                      </p>
                      <p className="text-xs text-text-muted truncate font-mono">
                        {cmd.hint}
                      </p>
                    </div>
                    {isActive ? (
                      <ChevronRight className="w-4 h-4 text-action-primary shrink-0" />
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

export default HostelManagerCommandBar;
