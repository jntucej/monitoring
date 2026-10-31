"use client";

/**
 * CommandBar — Cmd/Ctrl+K command palette for the role console.
 *
 * Lists the role's configured actions (scan, manual-entry, pass-verify,
 * lookup) with keyboard navigation (up/down, Enter, Escape). Each action
 * navigates to the corresponding sub-route via next/navigation router.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ScanLine,
  UserPlus,
  BadgeCheck,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getConsoleConfig, type ConsoleCommand } from "@/config/consoles";

interface CommandDef {
  id: ConsoleCommand;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
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
      href: "/gate/main",
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
      href: "/operator/pass-verify",
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
      href: "/hod/pending-approvals",
    },
    reject: {
      id: "reject",
      label: "Reject request",
      hint: "Reject a pending permission request",
      icon: Search,
      href: "/hod/pending-approvals",
    },
    escalate: {
      id: "escalate",
      label: "Escalate request",
      hint: "Escalate a permission request to a higher stage",
      icon: Search,
      href: "/hod/escalation-centre",
    },
    "department-stats": {
      id: "department-stats",
      label: "Department stats",
      hint: "Open department reports and analytics",
      icon: Search,
      href: "/hod/department-reports",
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
  const lookupHref = commands.find((c) => c.id === "lookup")?.href ?? "/operator/manual-entry";

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q));
  }, [query, commands]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleSelect = useCallback(
    (cmd: CommandDef) => {
      if (cmd.id === "lookup") {
        // Carry the free-text query into the manual-entry (person lookup) page
        // as an initial id so the operator can continue without retyping.
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
        if (filtered[active]) handleSelect(filtered[active]);
      }
    },
    [filtered, active, handleSelect],
  );

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
        className="w-full max-w-md max-h-[80dvh] flex flex-col bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
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
            placeholder="Type a command or search a roll number…"
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            aria-label="Command input"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)]">esc</kbd>
        </div>

        {/* Command list */}
        <ul role="listbox" aria-label="Commands" className="max-h-64 overflow-y-auto py-1">
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
                        isActive ? "bg-[var(--action-primary)]/20 text-[var(--action-primary)]" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${isActive ? "text-[var(--action-primary)]" : "text-[var(--text-primary)]"}`}>
                        {cmd.label}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">{cmd.hint}</p>
                    </div>
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
