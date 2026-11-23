"use client";

/**
 * PrincipalCommandBar — Cmd/Ctrl+K command palette for the Principal console.
 *
 * Three result groups, in display order:
 *   1. Navigation commands (5 keyword commands — dashboard / delegations /
 *      audit / reports / approvals).
 *   2. Entity results — when the free-text query is not a command keyword,
 *      the palette searches the real registers the backend exposes:
 *         • persons   via GET /api/persons?q= (name / roll / id / email)
 *         • tickets   via GET /api/permissions (pending/escalated at the
 *                     principal stage, filtered by ticket number /
 *                     student name / reason)
 *      Selecting an entity result does NOT do a bare router.push: it
 *      navigates to the register WITH the entity pre-identified (the
 *      ?ticket= / ?person= deep-link convention), so the register opens
 *      the Unified Entity Inspector on that exact entity — context is
 *      preserved, never lost.
 *
 * Keyboard: up/down to navigate, Enter to execute, Escape to close.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  UserCog,
  ScrollText,
  FileSpreadsheet,
  CheckSquare,
  Search,
  ChevronRight,
  User,
  Ticket,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { getConsoleConfig } from "@/config/consoles";
import { getAuthHeaders } from "@/lib/utils";

interface CommandDef {
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

/** All principal navigation commands. */
const COMMAND_DEFS: CommandDef[] = [
  {
    id: "dashboard",
    label: "Open principal dashboard",
    hint: "dashboard — Go to the principal dashboard",
    icon: LayoutDashboard,
    href: "/principal",
  },
  {
    id: "delegations",
    label: "Open delegation manager",
    hint: "delegations — Go to the delegations page",
    icon: UserCog,
    href: "/principal/governance/delegations",
  },
  {
    id: "audit",
    label: "Open audit trail",
    hint: "audit — Go to the audit page",
    icon: ScrollText,
    href: "/principal/governance/audit",
  },
  {
    id: "reports",
    label: "Open reports",
    hint: "reports — Go to the reports page",
    icon: FileSpreadsheet,
    href: "/principal/governance/reports",
  },
  {
    id: "approvals",
    label: "Open pending approvals",
    hint: "approvals — Go to the approvals queue",
    icon: CheckSquare,
    href: "/principal/approvals",
  },
];

/**
 * A person row from GET /api/persons?q= (the `Person` shape from
 * src/lib/types.ts, flattened — only the fields the palette needs).
 */
interface PersonResult {
  id: string;
  name: string;
  roll: string | null;
  role: string;
  status: string;
}

/** A ticket row from GET /api/permissions (the PermissionItem shape). */
interface TicketResult {
  ticket_number: string;
  workflow_type: string;
  status: string;
  current_stage: string;
  reason: string | null;
  student_name: string | null;
  roll: string | null;
}

type ResultRow =
  | { kind: "navigation"; cmd: CommandDef }
  | { kind: "person"; person: PersonResult }
  | { kind: "ticket"; ticket: TicketResult };

interface ResultGroup {
  title: string;
  rows: ResultRow[];
}

const COMMAND_KEYWORDS = new Set(COMMAND_DEFS.map((c) => c.id));

/** Parse a principal free-text command (first token = command keyword). */
function parseCommand(input: string): { commandId: string } | null {
  const first = (input.trim().split(/\s+/)[0] ?? "").toLowerCase();
  return COMMAND_KEYWORDS.has(first) ? { commandId: first } : null;
}

export interface PrincipalCommandBarProps {
  role: string;
  open: boolean;
  onClose: () => void;
}

export function PrincipalCommandBar({ role, open, onClose }: PrincipalCommandBarProps) {
  const addToast = useUIStore((s) => s.addToast);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Entity search state (debounced fetch on free-text queries) ─────────
  const [personResults, setPersonResults] = useState<PersonResult[]>([]);
  const [ticketResults, setTicketResults] = useState<TicketResult[]>([]);
  const [searching, setSearching] = useState(false);

  const available = useMemo(() => {
    const cfg = getConsoleConfig(role);
    const ids: string[] = cfg?.commands ?? [];
    if (ids.length === 0) return COMMAND_DEFS;
    return COMMAND_DEFS.filter((c) => ids.includes(c.id));
  }, [role]);

  const trimmed = query.trim();
  const commandMatch = parseCommand(query);
  const isCommandQuery = commandMatch !== null;
  /** Free-text queries that are NOT a command keyword run the entity search. */
  const isEntityQuery = trimmed.length > 0 && !isCommandQuery;

  const navigationRows = useMemo<ResultRow[]>(() => {
    if (!trimmed) return available.map((cmd) => ({ kind: "navigation", cmd }));
    const q = trimmed.toLowerCase();
    return available
      .filter((c) => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q))
      .map((cmd) => ({ kind: "navigation", cmd }));
  }, [trimmed, available]);

  // When the user types a command keyword, hide the entity results so the
  // palette behaves exactly like the navigation launcher it was.
  const entityRows: ResultRow[] = isEntityQuery
    ? [
        ...personResults.map((person) => ({ kind: "person", person })),
        ...ticketResults.map((ticket) => ({ kind: "ticket", ticket })),
      ]
    : [];

  const groups: ResultGroup[] = useMemo(() => {
    const out: ResultGroup[] = [];
    if (navigationRows.length > 0) out.push({ title: "Commands", rows: navigationRows });
    if (entityRows.length > 0) {
      const personPart = entityRows.filter((r) => r.kind === "person");
      const ticketPart = entityRows.filter((r) => r.kind === "ticket");
      if (personPart.length > 0) out.push({ title: "People", rows: personPart });
      if (ticketPart.length > 0) out.push({ title: "Approvals & tickets", rows: ticketPart });
    }
    return out;
  }, [navigationRows, entityRows]);

  const flat: ResultRow[] = useMemo(() => groups.flatMap((g) => g.rows), [groups]);

  // Debounced entity search against the real registers.
  useEffect(() => {
    if (!isEntityQuery) {
      setPersonResults([]);
      setTicketResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const headers = getAuthHeaders();
        const [personsRes, permsRes] = await Promise.all([
          fetch(`/api/persons?q=${encodeURIComponent(trimmed)}`, { headers }).catch(() => null),
          fetch(`/api/permissions?stage=principal&status=PENDING,ESCALATED&limit=50`, { headers }).catch(() => null),
        ]);
        const personsJson = personsRes ? await personsRes.json().catch(() => null) : null;
        const permsJson = permsRes ? await permsRes.json().catch(() => null) : null;

        const people: PersonResult[] = Array.isArray(personsJson?.data)
          ? (personsJson.data as Array<Record<string, unknown>>).slice(0, 5).map((p) => ({
              id: String(p.id ?? ""),
              name: String(p.fullName ?? p.name ?? p.uniqueId ?? "Unknown"),
              roll: p.roll ? String(p.roll) : p.student_details ? String((p.student_details as Record<string, unknown>).roll ?? null) : null,
              role: String(p.role ?? p.personType ?? "person"),
              status: String(p.status ?? "ACTIVE"),
            }))
          : [];

        const q = trimmed.toLowerCase();
        const tickets: TicketResult[] = Array.isArray(permsJson?.data)
          ? ((permsJson.data as Array<Record<string, unknown>>)
              .filter((t) => {
                const status = String(t.status ?? "");
                if (status !== "PENDING" && status !== "ESCALATED") return false;
                if (t.current_stage && !["principal", "warden_or_principal"].includes(String(t.current_stage))) return false;
                const hay = [
                  String(t.ticket_number ?? ""),
                  String(t.student?.name ?? t.student_name ?? ""),
                  String(t.reason ?? ""),
                  String(t.workflow_type ?? ""),
                ]
                  .join(" ")
                  .toLowerCase();
                return hay.includes(q);
              })
              .slice(0, 5)
              .map((t) => ({
                ticket_number: String(t.ticket_number ?? ""),
                workflow_type: String(t.workflow_type ?? "request"),
                status: String(t.status ?? "PENDING"),
                current_stage: String(t.current_stage ?? "principal"),
                reason: t.reason ? String(t.reason) : null,
                student_name: t.student ? String((t.student as { name?: string }).name ?? "") : t.student_name ? String(t.student_name) : null,
                roll: t.student?.student_details ? String((t.student as { student_details?: { roll?: string } }).student_details?.roll ?? null) : null,
              })))
          : [];

        setPersonResults(people);
        setTicketResults(tickets);
      } catch {
        setPersonResults([]);
        setTicketResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [isEntityQuery, trimmed, role]);

  // Reset search state when the palette re-opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setPersonResults([]);
      setTicketResults([]);
      setSearching(false);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  /**
   * Execute a row. Navigation rows use the hard redirect the bar always
   * used (window.location.href — the bar is a full-screen overlay).
   * Entity rows navigate to the owning register WITH the entity pre-
   * identified, so the register opens the Unified Entity Inspector on it:
   *   person → /principal/people?person=<id>  (people register)
   *   ticket → /principal/approvals?ticket=<n> (ApprovalsView deep link)
   */
  const executeRow = useCallback(
    (row: ResultRow) => {
      setBusy(true);
      if (row.kind === "navigation") {
        window.location.href = row.cmd.href;
      } else if (row.kind === "ticket") {
        window.location.href = `/principal/approvals?ticket=${encodeURIComponent(row.ticket.ticket_number)}`;
      } else {
        window.location.href = `/principal/people?person=${encodeURIComponent(row.person.id)}`;
      }
      onClose();
    },
    [onClose]
  );

  const handleSelect = useCallback((row: ResultRow) => {
    if (row.kind === "navigation") {
      // Keep the old UX: typing the command keyword into the input and
      // pressing Enter executes it; clicking fills the input instead.
      setQuery(row.cmd.id);
      inputRef.current?.focus();
    } else {
      executeRow(row);
    }
  }, [executeRow]);

  const handleEnter = useCallback(() => {
    if (!trimmed) {
      // No query: activate the first navigation row.
      if (flat[0]) handleSelect(flat[0]);
      return;
    }
    if (isCommandQuery) {
      const cmd = available.find((c) => c.id === parseCommand(query)?.commandId);
      if (cmd) {
        setBusy(true);
        window.location.href = cmd.href;
        onClose();
      } else {
        addToast({ variant: "error", message: "Command not available for this console." });
      }
      return;
    }
    // Entity query: activate the highlighted row (default the top result).
    const row = flat[active] ?? flat[0];
    if (row) {
      handleSelect(row);
    } else {
      addToast({ variant: "info", message: "No matching people or tickets." });
    }
  }, [trimmed, isCommandQuery, flat, active, handleSelect, available, query, addToast, onClose]);

  const onListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, flat.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleEnter();
      }
    },
    [flat.length, handleEnter]
  );

  if (!open) return null;

  const noResults = !searching && flat.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Principal command palette"
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
            placeholder={`Command or search people / tickets (role: ${role})…`}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none min-w-0"
            aria-label="Principal command input"
          />
          <kbd className="surface-card text-xs font-mono px-1.5 py-0.5 bg-bg-elevated text-text-muted shrink-0">
            esc
          </kbd>
        </div>

        {/* Results: commands, then entity groups */}
        <ul role="listbox" aria-label="Principal commands and results" className="max-h-96 overflow-y-auto py-1">
          {noResults ? (
            <li className="px-4 py-6 text-center text-xs text-text-muted">
              {searching ? "Searching…" : "No matching commands, people or tickets"}
            </li>
          ) : (
            groups.map((group, gIdx) => (
              <li key={group.title}>
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                  {group.title}
                </p>
                {group.rows.map((row, idx) => {
                  const rowGlobalIndex = groups
                    .slice(0, gIdx + 1)
                    .reduce((sum, g, gi) => sum + (gi === gIdx ? idx + 1 : g.rows.length), 0) - 1;
                  const isActive = rowGlobalIndex === active;
                  return (
                    <RowButton
                      key={rowKey(row)}
                      row={row}
                      isActive={isActive}
                      busy={busy}
                      onSelect={() => handleSelect(row)}
                      onHover={() => setActive(rowGlobalIndex)}
                    />
                  );
                })}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function rowKey(row: ResultRow): string {
  if (row.kind === "navigation") return `nav-${row.cmd.id}`;
  if (row.kind === "person") return `person-${row.person.id}`;
  return `ticket-${row.ticket.ticket_number}`;
}

function RowButton({
  row,
  isActive,
  busy,
  onSelect,
  onHover,
}: {
  row: ResultRow;
  isActive: boolean;
  busy: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  let Icon = Search;
  let label = "";
  let hint = "";
  if (row.kind === "navigation") {
    Icon = row.cmd.icon;
    label = row.cmd.label;
    hint = row.cmd.hint;
  } else if (row.kind === "person") {
    Icon = User;
    const p = row.person;
    label = `${p.name}${p.roll ? ` · ${p.roll}` : ""}`;
    hint = `${p.role} · ${p.status}`;
  } else {
    Icon = Ticket;
    const t = row.ticket;
    label = `${t.student_name ?? "Unknown"} · ${t.ticket_number}`;
    hint = `${t.workflow_type} · ${t.status} @ ${t.current_stage}${t.reason ? ` · ${t.reason}` : ""}`;
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors disabled:opacity-50 ${
        isActive ? "bg-action-primary/10" : "hover:bg-bg-elevated"
      }`}
    >
      <span
        className={`size-6 rounded-lg flex items-center justify-center shrink-0 ${
          isActive ? "bg-action-primary/20 text-action-primary" : "bg-bg-elevated text-text-secondary"
        }`}
      >
        <Icon className="w-3.5 h-3.5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isActive ? "text-action-primary" : "text-text-primary"}`}>
          {label}
        </p>
        <p className="text-xs text-text-muted truncate font-mono">{hint}</p>
      </div>
      {isActive ? <ChevronRight className="w-4 h-4 text-action-primary shrink-0" /> : null}
    </button>
  );
}

export default PrincipalCommandBar;
