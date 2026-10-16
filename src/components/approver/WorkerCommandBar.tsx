"use client";

/**
 * WorkerCommandBar — Cmd/Ctrl+K command palette for the Worker console.
 *
 * A free-text navigation parser: the 5 console commands are each a
 * destination under the worker root. Since the worker role currently ships a
 * single root sub-page (`/worker/page.tsx`), every command navigates to the
 * worker root rather than inventing placeholder sub-pages. Typing a command
 * keyword (e.g. "shifts") triggers a router.push to /worker; selecting a row
 * from the list does the same.
 *
 * Keyboard: up/down to navigate, Enter to execute, Escape to close.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  CalendarClock,
  Wrench,
  History,
  FileSpreadsheet,
  Search,
  CornerUpRight,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { getConsoleConfig } from "@/config/consoles";
import { useRouter } from "next/navigation";

interface CommandDef {
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** All available worker command definitions (5 nav commands). */
const COMMAND_DEFS: CommandDef[] = [
  {
    id: "my-work",
    label: "My Work",
    hint: "my-work — open work items / task board",
    icon: ClipboardList,
  },
  {
    id: "shifts",
    label: "Shifts",
    hint: "shifts — today's shift + check-in / check-out",
    icon: CalendarClock,
  },
  {
    id: "work-orders",
    label: "Work Orders",
    hint: "work-orders — open maintenance work orders",
    icon: Wrench,
  },
  {
    id: "history",
    label: "History",
    hint: "history — personal completion history",
    icon: History,
  },
  {
    id: "records",
    label: "Records",
    hint: "records — work-order records",
    icon: FileSpreadsheet,
  },
];

export interface WorkerCommandBarProps {
  role: string;
  open: boolean;
  onClose: () => void;
}

export function WorkerCommandBar({ role, open, onClose }: WorkerCommandBarProps) {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const roleRoot = useMemo(() => {
    // The worker role ships a single root sub-page on disk (page.tsx), so all
    // 5 commands resolve to the worker root.
    return "/worker";
  }, []);

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
      (c) => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q) || c.id.includes(q),
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

  const navigateTo = useCallback(
    (cmd: CommandDef) => {
      // All 5 commands target the worker root — the only sub-page that exists
      // on disk today. (Sub-pages like /worker/shifts will light up later.)
      void cmd;
      router.push(roleRoot);
      addToast({ variant: "info", message: `Navigating to ${cmd.label}` });
      onClose();
    },
    [router, roleRoot, addToast, onClose],
  );

  const handleEnter = useCallback(() => {
    const q = query.trim().toLowerCase();
    const exact = available.find((c) => c.id === q || c.label.toLowerCase() === q);
    if (exact) {
      navigateTo(exact);
      return;
    }
    if (filtered[active]) {
      navigateTo(filtered[active]);
      return;
    }
    addToast({ variant: "error", message: "Unknown command. Type a command from the list." });
  }, [query, available, filtered, active, navigateTo, addToast]);

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
        handleEnter();
      }
    },
    [filtered, handleEnter],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Worker command palette"
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
            placeholder="Worker command (my-work / shifts / work-orders / history / records)…"
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none min-w-0"
            aria-label="Worker command input"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] shrink-0">
            esc
          </kbd>
        </div>

        {/* Command list */}
        <ul role="listbox" aria-label="Worker commands" className="max-h-64 overflow-y-auto py-1">
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
                    onClick={() => navigateTo(cmd)}
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
                      <CornerUpRight className="w-4 h-4 text-[var(--action-primary)] shrink-0" />
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

export default WorkerCommandBar;
