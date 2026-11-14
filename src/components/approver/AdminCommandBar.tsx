"use client";

/**
 * AdminCommandBar — Cmd/Ctrl+K command palette for the admin console.
 *
 * Mirrors the DeputyWardenCommandBar / MessInchargeCommandBar /
 * SysadminCommandBar free-text parser pattern with 5 navigation commands —
 * all five are page navigations (the admin console is a read/monitor surface),
 * each routing to the real admin sub-page under /admin/:
 *   alerts        → /admin/alerts
 *   announcements → /admin/announcements
 *   audit         → /admin/audit-logs
 *   backup        → /admin/health (closest existing admin sub-page; no
 *                   dedicated /admin/backup page exists yet)
 *   reports       → /admin/reports
 *
 * Keyboard: up/down to navigate, Enter to execute, Escape to close.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Megaphone,
  ScrollText,
  Activity,
  FileSpreadsheet,
  Search,
  ChevronRight,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { getConsoleConfig } from "@/config/consoles";
import adminManifest from "../../../packages/admin-console-kit/manifest/ia.json";

interface CommandDef {
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

/** All admin navigation commands (targeting the real sub-page routes). */
const COMMAND_DEFS: CommandDef[] = [
  {
    id: "alerts",
    label: "Open security alerts",
    hint: "alerts — Go to the alerts & radar page",
    icon: Bell,
    href: "/admin/alerts",
  },
  {
    id: "announcements",
    label: "Open broadcast announcements",
    hint: "announcements — Go to the announcements page",
    icon: Megaphone,
    href: "/admin/announcements",
  },
  {
    id: "audit",
    label: "Open audit logs",
    hint: "audit — Go to the audit-logs page",
    icon: ScrollText,
    href: "/admin/audit-logs",
  },
  {
    id: "backup",
    label: "Open system health & ops",
    hint: "backup — Go to the system-health & ops page",
    icon: Activity,
    href: "/admin/health",
  },
  {
    id: "reports",
    label: "Open gate reports",
    hint: "reports — Go to the gate-reports page",
    icon: FileSpreadsheet,
    href: "/admin/reports",
  },
];

type Action = "NAVIGATE" | "UNKNOWN";

interface ParsedCommand {
  action: Action;
  commandId: string;
}

/**
 * Parse an admin free-text command. Each of the five keywords routes to its
 * sub-page; anything else is UNKNOWN.
 */
function parseCommand(input: string): ParsedCommand {
  const tokens = input.trim().split(/\s+/);
  const first = (tokens[0] || "").toLowerCase();
  const match = COMMAND_DEFS.find((c) => c.id === first);
  if (match) {
    return { action: "NAVIGATE", commandId: match.id };
  }
  return { action: "UNKNOWN", commandId: "" };
}

export interface AdminCommandBarProps {
  role: string;
  open: boolean;
  onClose: () => void;
}

export function AdminCommandBar({ role, open, onClose }: AdminCommandBarProps) {
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

  // 1.10 — default mode fuzzy-searches every admin manifest page; typing ">"
  // switches to the navigation commands.
  const ALL_PAGES = useMemo(() => {
    const root = "/admin";
    return (adminManifest.categories ?? []).flatMap((c: { label?: string; pages?: Array<Record<string, unknown>> }) =>
      (c.pages ?? []).map((p) => {
        const raw = String(p.href ?? p.route ?? p.label ?? "");
        const href = raw.startsWith("/") ? raw : `${root}/${raw}`;
        return {
          label: String(p.label ?? p.title ?? raw),
          href,
          category: String(c.label ?? ""),
        };
      }),
    );
  }, []);

  const isCommandMode = query.startsWith(">");
  const pageQuery = isCommandMode ? "" : query;

  const filtered = useMemo(() => {
    if (isCommandMode) {
      const q = query.slice(1).trim().toLowerCase();
      return q === ""
        ? available
        : available.filter(
            (c) =>
              c.id.startsWith(q) ||
              c.label.toLowerCase().includes(q) ||
              c.hint.toLowerCase().includes(q),
          );
    }
    const q = pageQuery.trim().toLowerCase();
    if (q === "") return available.slice(0, 12);
    const matched = ALL_PAGES.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.href.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    ).slice(0, 12);
    return [
      ...matched.map((p) => ({
        id: `page:${p.href}`,
        label: p.label,
        hint: `${p.category} — ${p.href}`,
        icon: Search,
        href: p.href,
      })),
      ...available.filter((c) =>
        c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q),
      ),
    ];
  }, [query, isCommandMode, available, ALL_PAGES, pageQuery]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const executeTarget = useCallback(
    (target: { href: string }) => {
      setBusy(true);
      window.location.href = target.href;
      onClose();
    },
    [onClose],
  );

  const handleSelect = useCallback((cmd: CommandDef) => {
    setQuery(cmd.id);
    inputRef.current?.focus();
  }, []);

  const handleEnter = useCallback(() => {
    if (isCommandMode) {
      const parsed = parseCommand(query);
      if (parsed.action === "UNKNOWN") {
        addToast({ variant: "error", message: "Unknown command. Type a command from the list below." });
        return;
      }
      const target = filtered.find((c) => c.id === parsed.commandId);
      if (!target) {
        addToast({ variant: "error", message: "Command not available for this console." });
        return;
      }
      executeTarget(target);
      return;
    }
    const target = filtered[active];
    if (!target) return;
    executeTarget(target);
  }, [isCommandMode, query, filtered, active, addToast, executeTarget]);

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
      aria-label="Admin command palette"
    >
      <div
        className="w-full max-w-md bg-bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onListKeyDown}
            placeholder={isCommandMode ? "Command…" : `Search pages or type ">" for commands (${role})…`}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none min-w-0"
            aria-label="Admin command input"
          />
          <kbd className="text-xs font-mono px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted border border-border shrink-0">
            esc
          </kbd>
        </div>

        {/* Command list */}
        <ul role="listbox" aria-label="Admin commands" className="max-h-64 overflow-y-auto py-1">
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
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
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

export default AdminCommandBar;
