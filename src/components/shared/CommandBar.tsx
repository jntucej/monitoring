"use client";

/**
 * CommandBar — Cmd/Ctrl+K command palette for the role console.
 *
 * Lists the role's configured actions (scan, manual-entry, pass-verify,
 * lookup) with keyboard navigation (up/down, Enter, Escape). Each action
 * navigates to the corresponding sub-route via next/navigation router.
 *
 * When the free-text query is 2+ chars the palette also runs a debounced
 * authenticated search against /api/persons?q=… and renders matching
 * person records above the static command list. Selecting a record row
 * navigates to the lookup page carrying the record id so the destination
 * page's own inspector opens it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ScanLine,
  UserPlus,
  BadgeCheck,
  Search,
  UserRound,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getConsoleConfig, type ConsoleCommand } from "@/config/consoles";
import { getAuthHeaders } from "@/lib/utils";
import type { Person } from "@/lib/types";

interface CommandDef {
  id: ConsoleCommand;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

/** A person record returned by the /api/persons search. */
interface PersonHit {
  uniqueId: string;
  name: string;
  roll: string;
  personType: string;
}

function buildCommands(role: string): CommandDef[] {
  const config = getConsoleConfig(role);
  if (!config) return [];
  // Not every role defines every command; the operator + HOD nav commands
  // have explicit defs, while staff/faculty console commands (clock-in,
  // request-leave, attendance, ...) fall through to a generic def so the
  // palette still lists them.
  const defs: Partial<Record<ConsoleCommand, CommandDef>> = {
    scan: {
      id: "scan",
      label: "Scan badge",
      hint: "Open the scanner to read a pass or badge",
      icon: ScanLine,
      href: "/operator",
    },
    "manual-entry": {
      id: "manual-entry",
      label: "Manual entry",
      hint: "Record a movement without a scanner",
      icon: UserPlus,
      href: "/operator/manual-entry",
    },
    "pass-verify": {
      id: "pass-verify",
      label: "Verify pass",
      hint: "Check a person's QR pass validity",
      icon: BadgeCheck,
      href: "/operator/pass-verification",
    },
    lookup: {
      id: "lookup",
      label: "Look up person",
      hint: "Search a person by roll number or name",
      icon: Search,
      href: "/operator/manual-entry",
    },
    approve: {
      id: "approve",
      label: "Approve request",
      hint: "Approve a pending permission request",
      icon: BadgeCheck,
      href: "/hod/approvals/pending",
    },
    reject: {
      id: "reject",
      label: "Reject request",
      hint: "Reject a pending permission request",
      icon: Search,
      href: "/hod/approvals/pending",
    },
    escalate: {
      id: "escalate",
      label: "Escalate request",
      hint: "Escalate a permission request to a higher stage",
      icon: Search,
      href: "/hod/approvals/escalated",
    },
    "department-stats": {
      id: "department-stats",
      label: "Department stats",
      hint: "Open department reports and analytics",
      icon: Search,
      href: "/hod/reports",
    },
  };
  const roleRoot =
    role === "staff" ? "/staff" : role === "hod" ? "/hod" : "/operator";
  return (config.commands ?? [])
    .map((c) => defs[c])
    .filter((d): d is CommandDef => Boolean(d))
    .map((d) =>
      // Unknown console commands (staff/faculty) fall back to the role root
      // so the palette still navigates somewhere sensible.
      defs[d.id] ? d : { ...d, href: d.href || roleRoot },
    );
}

export interface CommandBarProps {
  role: string;
  /** Whether the palette is open. */
  open: boolean;
  onClose: () => void;
}

export function CommandBar({ role, open, onClose }: CommandBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo(() => buildCommands(role), [role]);
  const lookupHref =
    commands.find((c) => c.id === "lookup")?.href ?? "/operator/manual-entry";

  // ── entity search state ────────────────────────────────────────────────
  const [personHits, setPersonHits] = useState<PersonHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // 2+ chars and not matching a command label/hint exactly (trim check)
  const q = query.trim();
  const isSearching = q.length >= 2;

  useEffect(() => {
    if (!open) return;
    if (!isSearching) {
      setPersonHits([]);
      setSearchLoading(false);
      setSearchError(false);
      return;
    }
    setSearchLoading(true);
    setSearchError(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q });
        const res = await fetch(`/api/persons?${params.toString()}`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        const rows: Person[] | undefined = Array.isArray(body?.data)
          ? body.data
          : undefined;
        setPersonHits(
          (rows ?? []).slice(0, 8).map((p) => ({
            uniqueId: p.uniqueId,
            name: p.fullName || p.name || "Unknown",
            roll:
              p.studentDetails?.roll ||
              p.employeeDetails?.employeeId ||
              p.uniqueId,
            personType: p.personType,
          })),
        );
        setSearchLoading(false);
      } catch {
        setPersonHits([]);
        setSearchLoading(false);
        setSearchError(true);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, isSearching, open]);

  // ── filtered command list ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(lower) ||
        c.hint.toLowerCase().includes(lower),
    );
  }, [query, commands]);

  // Reset state when palette opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setPersonHits([]);
      setSearchLoading(false);
      setSearchError(false);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ── select handlers ────────────────────────────────────────────────────
  const handleSelectCommand = useCallback(
    (cmd: CommandDef) => {
      if (cmd.id === "lookup") {
        const params = new URLSearchParams();
        if (query.trim()) params.set("id", query.trim());
        const qs = params.toString();
        router.push(qs ? `${lookupHref}?${qs}` : lookupHref);
      } else {
        router.push(cmd.href);
      }
      onClose();
    },
    [lookupHref, onClose, query, router],
  );

  const handleSelectPerson = useCallback(
    (hit: PersonHit) => {
      const params = new URLSearchParams({ id: hit.uniqueId });
      router.push(`${lookupHref}?${params.toString()}`);
      onClose();
    },
    [lookupHref, onClose, router],
  );

  // ── combined list for keyboard nav ─────────────────────────────────────
  // Records come first when a search query is present; commands follow.
  type NavItem =
    | { kind: "person"; index: number; hit: PersonHit }
    | { kind: "command"; index: number; cmd: CommandDef };

  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [];
    if (isSearching) {
      personHits.forEach((hit, i) =>
        items.push({ kind: "person", index: i, hit }),
      );
    }
    filtered.forEach((cmd, i) => items.push({ kind: "command", index: i, cmd }));
    return items;
  }, [isSearching, personHits, filtered]);

  const navCount = navItems.length;

  const onListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, navCount - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (navCount === 0) return;
        const item = navItems[active];
        if (!item) return;
        if (item.kind === "person") handleSelectPerson(item.hit);
        else handleSelectCommand(item.cmd);
      }
    },
    [navItems, navCount, active, handleSelectCommand, handleSelectPerson],
  );

  // Active index helpers
  const activePersonIdx = isSearching ? active : -1;
  const activeCmdOffset = isSearching ? active - personHits.length : active;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-md max-h-[80dvh] flex flex-col bg-bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
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
            placeholder="Type a command or search a roll number…"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
            aria-label="Command input"
          />
          <kbd className="surface-card text-xs font-mono px-1.5 py-0.5 bg-bg-elevated text-text-muted">
            esc
          </kbd>
        </div>

        {/* Records section (only when searching) */}
        {isSearching && (
          <div className="max-h-48 overflow-y-auto">
            <div className="px-4 pt-2 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Records
              </span>
            </div>
            {searchLoading ? (
              <div className="px-4 py-3 flex items-center gap-2 text-xs text-text-muted">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Searching…
              </div>
            ) : searchError ? (
              <div className="px-4 py-2 text-xs text-text-muted">
                Search unavailable
              </div>
            ) : personHits.length === 0 ? (
              <div className="px-4 py-2 text-xs text-text-muted">
                No matching records
              </div>
            ) : (
              <ul role="listbox" aria-label="Matching records">
                {personHits.map((hit, i) => {
                  const isActive = i === activePersonIdx;
                  return (
                    <li key={hit.uniqueId} role="option" aria-selected={isActive}>
                      <button
                        type="button"
                        onClick={() => handleSelectPerson(hit)}
                        onMouseEnter={() => setActive(i)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                          isActive ? "bg-action-primary/10" : "hover:bg-bg-elevated"
                        }`}
                      >
                        <span
                          className={`size-5 rounded flex items-center justify-center shrink-0 ${
                            isActive
                              ? "bg-action-primary/20 text-action-primary"
                              : "bg-bg-elevated text-text-secondary"
                          }`}
                        >
                          <UserRound className="w-3 h-3" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm truncate ${
                              isActive ? "text-action-primary" : "text-text-primary"
                            }`}
                          >
                            {hit.name}
                          </p>
                        </div>
                        <span className="font-mono text-xs text-text-muted shrink-0">
                          {hit.roll}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Divider between records and commands when both are visible */}
        {isSearching && filtered.length > 0 && (
          <div className="border-t border-border" />
        )}

        {/* Command list */}
        {filtered.length > 0 ? (
          <ul
            role="listbox"
            aria-label="Commands"
            className="max-h-64 overflow-y-auto py-1"
          >
            {filtered.map((cmd, i) => {
              const globalIdx = isSearching ? personHits.length + i : i;
              const Icon = cmd.icon;
              const isActive = globalIdx === activeCmdOffset;
              return (
                <li key={cmd.id} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    onClick={() => handleSelectCommand(cmd)}
                    onMouseEnter={() => setActive(globalIdx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
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
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold ${
                          isActive ? "text-action-primary" : "text-text-primary"
                        }`}
                      >
                        {cmd.label}
                      </p>
                      <p className="text-xs text-text-muted truncate">{cmd.hint}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          !isSearching && (
            <div className="px-4 py-6 text-center text-xs text-text-muted">
              No matching commands
            </div>
          )
        )}
      </div>
    </div>
  );
}
