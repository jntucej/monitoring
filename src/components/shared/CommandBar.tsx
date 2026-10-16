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
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useKeyboardShortcuts, type Shortcut } from "@/hooks/useKeyboardShortcuts";
import { useAuthStore } from "@/stores/authStore";
import { getConsoleConfig, type ConsoleCommand } from "@/config/consoles";
import { useOperatorStore } from "@/stores/operatorStore";

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
  const defs: Record<ConsoleCommand, CommandDef> = {
    scan: {
      id: "scan",
      label: "Scan badge",
      hint: "Open the scanner to read a pass or badge",
      icon: ScanLine,
      href: "/operator/scan",
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
      href: "/operator/lookup",
    },
  };
  return config.commands.map((c) => defs[c]);
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
  const lookupHref = commands.find((c) => c.id === "lookup")?.href ?? "/operator/lookup";

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
        // Carry the free-text query into the lookup page if the user typed.
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
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
