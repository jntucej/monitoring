"use client";

/**
 * ParentCommandBar — Cmd/Ctrl+K command palette for the parent/guardian
 * console. The parent is a read-only role, so all 5 commands are navigation
 * commands that route to the relevant parent portal page:
 *
 *   timeline      → /parent            (child-activity timeline feed)
 *   notifications → /parent/settings   (notification + account settings)
 *   fees          → /parent/passes     (passes / fee-style records)
 *   records       → /parent/child      (child movement records)
 *   contact       → /support           (help & support desk)
 *
 * Parent has no write actions (no approve / reject / forward), so execution
 * is a window.location transition + closing the palette. The href targets
 * mirror the 5 items produced by getDefaultNavigation("parent"), so the
 * command bar and the rail stay in sync.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  History,
  Bell,
  CreditCard,
  FileSpreadsheet,
  MessageSquare,
  Search,
  ChevronRight,
} from "lucide-react";
import { getConsoleConfig } from "@/config/consoles";

interface CommandDef {
  id: string;
  label: string;
  hint: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * The 5 parent commands. Mirrors the items returned by
 * getDefaultNavigation("parent") (nav + href), so the command palette and
 * the IconRail stay in sync. If a parent-specific sub-page lands later
 * (e.g. /parent/records) the mapping is a single-line update here.
 */
const COMMAND_DEFS: CommandDef[] = [
  {
    id: "timeline",
    label: "Child activity timeline",
    hint: "timeline — Open the child-activity timeline",
    href: "/parent",
    icon: History,
  },
  {
    id: "notifications",
    label: "Notifications & account settings",
    hint: "notifications — Open notification settings",
    href: "/parent/settings",
    icon: Bell,
  },
  {
    id: "fees",
    label: "Fees & passes",
    hint: "fees — Open fees / pass records",
    href: "/parent/passes",
    icon: CreditCard,
  },
  {
    id: "records",
    label: "Child movement records",
    hint: "records — Open the child movement log",
    href: "/parent/child",
    icon: FileSpreadsheet,
  },
  {
    id: "contact",
    label: "Help & support",
    hint: "contact — Open the support desk",
    href: "/support",
    icon: MessageSquare,
  },
];

export interface ParentCommandBarProps {
  role: string;
  open: boolean;
  onClose: () => void;
}

export function ParentCommandBar({ role, open, onClose }: ParentCommandBarProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // The console config declares `parent` commands; restrict to the ones the
  // role actually has so the palette stays in sync with CONSOLES.
  const available = useMemo(() => {
    const cfg = getConsoleConfig(role);
    const ids: string[] = cfg?.commands ?? [];
    if (ids.length === 0) return COMMAND_DEFS;
    return COMMAND_DEFS.filter((c) => ids.includes(c.id as "timeline"));
  }, [role]);

  const filtered = useMemo(() => {
    if (!query.trim()) return available;
    const q = query.toLowerCase();
    return available.filter(
      (c) => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
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
    (cmd: CommandDef) => {
      window.location.href = cmd.href;
      onClose();
    },
    [onClose]
  );

  const handleSelect = useCallback((cmd: CommandDef) => {
    setQuery(cmd.id);
    inputRef.current?.focus();
  }, []);

  const handleEnter = useCallback(() => {
    const first = query.trim().toLowerCase();
    const match =
      first.length === 0
        ? filtered[active]
        : filtered.find(
            (c) =>
              c.id.toLowerCase() === first ||
              c.label.toLowerCase().includes(first) ||
              c.hint.toLowerCase().includes(first)
          );
    if (match) navigate(match);
  }, [filtered, active, navigate, query]);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Parent command palette"
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
            placeholder={`Parent command (role: ${role})…`}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none min-w-0"
            aria-label="Parent command input"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] shrink-0">
            esc
          </kbd>
        </div>

        {/* Command list */}
        <ul role="listbox" aria-label="Parent commands" className="max-h-64 overflow-y-auto py-1">
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

export default ParentCommandBar;
