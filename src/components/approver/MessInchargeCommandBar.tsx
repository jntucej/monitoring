"use client";

/**
 * MessInchargeCommandBar — Cmd/Ctrl+K command palette for the mess In-charge
 * console.
 *
 * Mirrors the DeputyWardenCommandBar free-text parser pattern with 5 commands
 * (the new digest-board + MealServePanel spec):
 *   finalize   → POST /api/admin/mess-finalize { messDayId, finalHeadcount }
 *   revoke <day> → POST /api/mess/revoke { dayId }
 *   count      → navigate /mess/daily-meal-counts
 *   menu       → navigate /mess/menu-management
 *   issue <severity> <text> → POST /api/mess/issues { eventType, description }
 *
 * The `finalize` / `revoke` / `issue` commands take optional arguments parsed
 * from the free-text input (the mess day id and severity come from the
 * /api/mess/analytics fetch when omitted). `count` and `menu` are pure
 * navigations to the real mess sub-pages under /mess/.
 *
 * Keyboard: up/down to navigate, Enter to execute, Escape to close.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCheck,
  Ban,
  BarChart3,
  UtensilsCrossed,
  ShieldAlert,
  Search,
  ChevronRight,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { getConsoleConfig } from "@/config/consoles";
import { useApiResource } from "@/hooks/useApiResource";

interface CommandDef {
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** All mess In-charge command definitions (the new 5-command spec). */
const COMMAND_DEFS: CommandDef[] = [
  {
    id: "finalize",
    label: "Finalize the active mess day",
    hint: "finalize [headcount] — Finalize the day's headcount",
    icon: CheckCheck,
  },
  {
    id: "revoke",
    label: "Revoke unused tokens for a mess day",
    hint: "revoke <dayId> — Revoke all unused tokens for a day",
    icon: Ban,
  },
  {
    id: "count",
    label: "Open daily meal counts",
    hint: "count — Go to the daily meal counts page",
    icon: BarChart3,
  },
  {
    id: "menu",
    label: "Open mess menu management",
    hint: "menu — Go to the mess menu-management page",
    icon: UtensilsCrossed,
  },
  {
    id: "issue",
    label: "Raise a mess issue / exception",
    hint: "issue <severity> <text> — Raise a mess issue (audit-sourced)",
    icon: ShieldAlert,
  },
];

type Action = "FINALIZE" | "REVOKE" | "COUNT" | "MENU" | "ISSUE" | "UNKNOWN";

interface ParsedCommand {
  action: Action;
  /** Day id (revoke) or headcount (finalize), as free-text arg. */
  arg: string;
  /** Remaining tokens (issue description / reason). */
  rest: string;
}

/**
 * Parse a mess In-charge free-text command.
 *
 *   finalize [headcount]
 *   revoke <dayId>
 *   count
 *   menu
 *   issue <severity> <text…>
 */
function parseCommand(input: string): ParsedCommand {
  const tokens = input.trim().split(/\s+/);
  const first = (tokens[0] || "").toLowerCase();
  const empty: ParsedCommand = { action: "UNKNOWN", arg: "", rest: "" };

  if (first === "finalize") {
    return { ...empty, action: "FINALIZE", arg: tokens[1] ?? "" };
  }
  if (first === "revoke") {
    return { ...empty, action: "REVOKE", arg: tokens[1] ?? "" };
  }
  if (first === "count") {
    return { ...empty, action: "COUNT" };
  }
  if (first === "menu") {
    return { ...empty, action: "MENU" };
  }
  if (first === "issue") {
    // issue <severity> <text…>
    const severity = tokens[1] ?? "";
    const rest = tokens.slice(2).join(" ");
    return { ...empty, action: "ISSUE", arg: severity, rest };
  }
  return { ...empty, action: "UNKNOWN" };
}

export interface MessInchargeCommandBarProps {
  role: string;
  open: boolean;
  onClose: () => void;
}

export function MessInchargeCommandBar({ role, open, onClose }: MessInchargeCommandBarProps) {
  const addToast = useUIStore((s) => s.addToast);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // The active mess day id, for finalize / revoke when the user omits the arg.
  const { data: analyticsData } = useApiResource<{
    success?: boolean;
    data: { messDayId?: string };
  }>(open ? "/api/mess/analytics" : null, { ttlMs: 15_000, enabled: open });
  const activeDayId = analyticsData?.data?.messDayId ?? "";

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
      if (parsed.action === "UNKNOWN") {
        addToast({ variant: "error", message: "Unknown command. Type a command from the list below." });
        return;
      }
      if (parsed.action === "COUNT") {
        setBusy(true);
        window.location.href = "/mess/daily-meal-counts";
        onClose();
        return;
      }
      if (parsed.action === "MENU") {
        setBusy(true);
        window.location.href = "/mess/menu-management";
        onClose();
        return;
      }
      if (parsed.action === "FINALIZE") {
        // finalize [headcount] — the active day id comes from the analytics
        // fetch when the user doesn't pass one. The finalize endpoint is
        // admin-scoped (withAdminMutation); the mess In-charge calls it with
        // their own auth.
        const dayId = activeDayId;
        if (!dayId) {
          addToast({ variant: "error", message: "No active mess day to finalize." });
          return;
        }
        const headcount = parsed.arg
          ? Number(parsed.arg)
          : null;
        setBusy(true);
        try {
          const res = await fetch("/api/admin/mess-finalize", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            credentials: "include",
            body: JSON.stringify({
              messDayId: dayId,
              // The route requires a non-negative integer finalHeadcount.
              // When the user omits it, fall back to 0 is not meaningful;
              // use the confirmed tally from the latest analytics if available
              // (not fetched here) — so require the user to pass a number.
              finalHeadcount:
                headcount !== null && Number.isInteger(headcount) && headcount >= 0
                  ? headcount
                  : undefined,
            }),
          });
          const json = (await res.json().catch(() => null)) as
            | { success?: boolean; error?: { message?: string } }
            | null;
          if (res.ok && json?.success) {
            addToast({ variant: "success", message: `Finalized mess day ${dayId}.` });
            onClose();
          } else {
            addToast({
              variant: "error",
              message:
                json?.error?.message ??
                (headcount === null
                  ? "Usage: finalize <headcount> — a non-negative integer is required."
                  : `Finalize failed (HTTP ${res.status})`),
            });
          }
        } catch {
          addToast({ variant: "error", message: "Network error while finalizing the mess day" });
        } finally {
          setBusy(false);
        }
        return;
      }
      if (parsed.action === "REVOKE") {
        const dayId = parsed.arg || activeDayId;
        if (!dayId) {
          addToast({ variant: "error", message: "Usage: revoke <dayId> (or pass the active day)" });
          return;
        }
        setBusy(true);
        try {
          const res = await fetch("/api/mess/revoke", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            credentials: "include",
            body: JSON.stringify({ dayId }),
          });
          const json = (await res.json().catch(() => null)) as
            | { success?: boolean; data?: { revokedCount?: number }; error?: { message?: string } }
            | null;
          if (res.ok && json?.success) {
            addToast({
              variant: "success",
              message: `Revoked ${json.data?.revokedCount ?? 0} unused token(s) for ${dayId}.`,
            });
            onClose();
          } else {
            addToast({
              variant: "error",
              message: json?.error?.message ?? `Revoke failed (HTTP ${res.status})`,
            });
          }
        } catch {
          addToast({ variant: "error", message: "Network error while revoking tokens" });
        } finally {
          setBusy(false);
        }
        return;
      }
      if (parsed.action === "ISSUE") {
        // issue <severity> <text…> — the route reads { eventType, description }.
        // Map the free-text severity token onto eventType; the rest is the
        // description.
        const severity = parsed.arg || "MESS_ISSUE";
        const description = parsed.rest || severity;
        if (!description.trim()) {
          addToast({ variant: "error", message: "Usage: issue <severity> <text>" });
          return;
        }
        setBusy(true);
        try {
          const res = await fetch("/api/mess/issues", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            credentials: "include",
            body: JSON.stringify({ eventType: severity.toUpperCase(), description }),
          });
          const json = (await res.json().catch(() => null)) as
            | { success?: boolean; error?: { message?: string } }
            | null;
          if (res.ok && json?.success) {
            addToast({ variant: "success", message: `Raised mess issue (${severity}).` });
            onClose();
          } else {
            addToast({
              variant: "error",
              message: json?.error?.message ?? `Issue raise failed (HTTP ${res.status})`,
            });
          }
        } catch {
          addToast({ variant: "error", message: "Network error while raising the issue" });
        } finally {
          setBusy(false);
        }
        return;
      }
    },
    [activeDayId, addToast, onClose],
  );

  const handleSelect = useCallback((cmd: CommandDef) => {
    // Pre-fill the input with the keyword so the user can add the inline args.
    setQuery(cmd.id + " ");
    inputRef.current?.focus();
  }, []);

  const handleEnter = useCallback(() => {
    const parsed = parseCommand(query);
    const first = (query.trim().split(/\s+/)[0] || "").toLowerCase();
    // Bare keywords that need inline args: keep focus so the user can finish.
    if (parsed.action === "UNKNOWN" || (first === "finalize" && !query.trim().split(/\s+/)[1]) || (first === "revoke" && !query.trim().split(/\s+/)[1]) || (first === "issue" && !query.trim().split(/\s+/).slice(1).join(" ").trim())) {
      inputRef.current?.focus();
      return;
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
      aria-label="Mess In-charge command palette"
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
            placeholder={`Mess command (role: ${role})…`}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none min-w-0"
            aria-label="Mess In-charge command input"
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
            {parsedPreview.action === "ISSUE" ? (
              <>
                {parsedPreview.arg ? (
                  <span className="ml-1.5 font-mono">{parsedPreview.arg}</span>
                ) : (
                  <span className="ml-1.5 text-[var(--text-muted)] italic">[severity]</span>
                )}
                {parsedPreview.rest ? (
                  <span className="ml-1.5 text-[var(--text-muted)] italic">
                    {parsedPreview.rest.length > 24 ? parsedPreview.rest.slice(0, 24) + "…" : parsedPreview.rest}
                  </span>
                ) : (
                  <span className="ml-1.5 text-[var(--text-muted)] italic">[text]</span>
                )}
              </>
            ) : parsedPreview.arg ? (
              <span className="ml-1.5 font-mono">{parsedPreview.arg}</span>
            ) : null}
            {busy ? <span className="ml-2 text-[var(--text-muted)]">processing…</span> : null}
          </div>
        ) : null}

        {/* Command list */}
        <ul role="listbox" aria-label="Mess In-charge commands" className="max-h-64 overflow-y-auto py-1">
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

export default MessInchargeCommandBar;
