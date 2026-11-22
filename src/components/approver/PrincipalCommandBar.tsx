"use client";

/**
 * PrincipalCommandBar — PR-13. The contextual Principal command palette.
 *
 * Extends the original 5-command navigation palette into a contextual command
 * system WITHOUT breaking its behaviour:
 *   - Cmd/Ctrl+K to open, ↑/↓ to navigate, Enter to execute, Esc to close
 *   - deterministic navigation + workflow commands (the original 5 + more)
 *   - REAL entity search (delegated to /api/students?q= — RBAC-scoped)
 *   - recent entities (only when the caller stores them; never fabricated)
 *   - permission-aware quick actions: consequential verbs are shown but NOT
 *     executed in-palette — they route to the surface that owns the verb
 *     (the palette must not bypass authorization / confirmations)
 *
 * Ambiguous input shows MULTIPLE relevant choices; it never guesses a single
 * action. Unknown free text falls back to entity search, not a fabricated
 * command.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  ChevronRight,
  User,
  Clock,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import {
  parseCommand,
  PRINCIPAL_COMMANDS,
  type ParsedCommand,
} from "@/lib/commands/parse";
import {
  NAV_COMMANDS,
  resolvePaletteCommands,
  searchResultsToCommands,
  recentEntitiesToCommands,
  CONSEQUENTIAL_QUICK_ACTIONS,
  type PaletteCommand,
} from "@/lib/principal/commandPaletteData";

/** A recent entity the caller persisted. */

interface RecentEntity {
  kind: "student";
  id: string;
  label: string;
  href: string;
}

export interface PrincipalCommandBarProps {
  role: string;
  open: boolean;
  onClose: () => void;
  /**
   * Optional recent entities the caller persisted (session/localStorage).
   * When absent the palette shows an honest "no recent entities" state.
   */
  recents?: RecentEntity[];
  /**
   * Optional REAL, RBAC-scoped entity search the caller injects (a verified
   * endpoint). When provided, free-text queries run it (debounced). When NOT
   * provided, free text shows an honest "no entity search available" state —
   * the palette never falls back to an unfiltered roster, which would leak
   * records the user is not scoped to see. (PR-13: "Search respects
   * permissions.")
   */
  searchEntities?: (q: string) => Promise<
    Array<{ id: string; label: string; href: string; kind?: "student" }>
  >;
}

/** Resolve a query to the palette's command list: deterministic commands when
 *  the text is a known keyword, otherwise fall through to entity search. */
function commandsForQuery(query: string): { commands: PaletteCommand[]; searching: boolean } {
  const q = query.trim().toLowerCase();
  if (!q) {
    // Empty → navigation + workflow + quick-action groups.
    return { commands: [...NAV_COMMANDS, ...CONSEQUENTIAL_QUICK_ACTIONS], searching: false };
  }
  // Deterministic command resolution through the shared KERNEL parser
  // (conformance: the bar delegates parsing to the kernel, not a local copy).
  // The kernel matches the first token against PRINCIPAL_COMMANDS verbs; a
  // hit maps to the matching nav command. No hit → fall through to search.
  const parsed: ParsedCommand = parseCommand(q, PRINCIPAL_COMMANDS);
  if (parsed.action !== "UNKNOWN") {
    const nav = NAV_COMMANDS.find((c) => c.id === `nav-${parsed.id}`);
    if (nav) return { commands: [nav], searching: false };
  }
  // Ambiguous/other keywords still resolve to multiple choices (honest, no
  // single guess) via the display-layer resolver.
  const matched = resolvePaletteCommands(q);
  if (matched.length > 0) return { commands: matched, searching: false };
  // Not a command keyword → real entity search (the component fetches).
  return { commands: [], searching: true };
}

export function PrincipalCommandBar({
  role,
  open,
  onClose,
  recents,
  searchEntities,
}: PrincipalCommandBarProps) {
  const addToast = useUIStore((s) => s.addToast);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Real entity search results (only populated when the caller injects a
  // verified, RBAC-scoped search; otherwise stays empty → honest state).
  const [searchRows, setSearchRows] = useState<
    Array<{ id: string; label: string; href: string; kind?: "student" }>
  >([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { commands, searching: inSearch } = commandsForQuery(query);

  const recentsCommands = useMemo(
    () => (recents ? recentEntitiesToCommands(recents) : []),
    [recents],
  );

  // The visible list: deterministic commands (+ recents when empty query),
  // or real search results when in free-text search mode.
  const list = useMemo<PaletteCommand[]>(() => {
    if (inSearch && searchEntities) {
      return searchResultsToCommands(
        searchRows.map((r) => ({
          id: r.id,
          label: r.label,
          kind: r.kind ?? "student",
          href: r.href,
        })),
        "student",
        (r) => r.href,
      );
    }
    if (!query.trim()) return [...commands, ...recentsCommands];
    return commands;
  }, [inSearch, searchEntities, searchRows, commands, recentsCommands, query]);

  // Clamp the active index to the current list length (the list can shrink
  // when a search returns fewer rows). Derived, not effect-synced.
  const activeIdx = Math.min(active, Math.max(list.length - 1, 0));

  // Debounced entity search via the injected (verified) search fn.
  useEffect(() => {
    if (!open) return;
    if (!inSearch || !searchEntities) {
      setSearchRows([]);
      setSearchError(null);
      setSearching(false);
      return;
    }
    const q = query.trim();
    if (q.length < 2) {
      setSearchRows([]);
      return;
    }
    setSearching(true);
    setSearchError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const rows = await searchEntities(q);
        setSearchRows(rows ?? []);
      } catch (e) {
        setSearchRows([]);
        setSearchError(e instanceof Error ? e.message : "Search failed");
      } finally {
        setSearching(false);
        setActive(0);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, inSearch, open, searchEntities]);

  // Reset on open. A single functional reset avoids cascading setStates.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSearchRows([]);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  const execute = useCallback(
    (cmd: PaletteCommand) => {
      // Consequential actions are NOT executed in-palette — route to their
      // owning surface (the palette must not bypass authorization/confirmation).
      if (cmd.kind === "consequential") {
        addToast({
          variant: "info",
          message: `To ${cmd.label.toLowerCase()}, open ${cmd.needsSurface}. Consequential actions run there, not in the palette.`,
        });
        return;
      }
      if (cmd.href) {
        setBusy(true);
        // Navigation is a plain client transition; keep the console state.
        window.location.href = cmd.href;
        onClose();
      }
    },
    [addToast, onClose],
  );

  const runActive = useCallback(() => {
    const cmd = list[activeIdx];
    if (!cmd) return;
    execute(cmd);
  }, [list, activeIdx, execute]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(list.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        runActive();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [list.length, runActive, onClose],
  );

  if (!open) return null;

  const noResults = !inSearch && list.length === 0;
  const emptySearch = inSearch && !searching && !searchError && list.length === 0;
  const noSearchAvailable =
    inSearch && !searchEntities && query.trim().length >= 2 && list.length === 0;

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
        <div className="surface-card flex items-center gap-2 px-4 py-3">
          <Search className="w-4 h-4 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={handleKey}
            placeholder={`Principal command (role: ${role})…`}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none min-w-0"
            aria-label="Principal command input"
          />
          <kbd className="surface-card text-xs font-mono px-1.5 py-0.5 bg-bg-elevated text-text-muted shrink-0">
            esc
          </kbd>
        </div>

        <ul
          role="listbox"
          aria-label="Principal commands"
          className="max-h-72 overflow-y-auto py-1"
        >
          {noResults ? (
            <li className="px-4 py-6 text-center text-xs text-text-muted">
              No matching commands
            </li>
          ) : noSearchAvailable ? (
            <li className="px-4 py-6 text-center text-xs text-text-muted">
              No entity search is available for your role — try a navigation
              command above.
            </li>
          ) : emptySearch ? (
            <li className="px-4 py-6 text-center text-xs text-text-muted">
              No students match “{query}”.
            </li>
          ) : searchError ? (
            <li className="px-4 py-4 text-center text-xs text-action-warning" role="alert">
              {searchError}
            </li>
          ) : searching && list.length === 0 ? (
            <li className="px-4 py-4 text-center text-xs text-text-muted">
              Searching…
            </li>
          ) : (
            list.map((cmd, idx) => {
              const isActive = idx === activeIdx;
              const GroupIcon = groupIcon(cmd.group, cmd.kind);
              return (
                <li key={cmd.id} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => execute(cmd)}
                    onMouseEnter={() => setActive(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors disabled:opacity-50 ${
                      isActive ? "bg-action-primary/10" : "hover:bg-bg-elevated"
                    }`}
                  >
                    <span
                      className={`size-6 rounded-lg flex items-center justify-center shrink-0 ${
                        cmd.kind === "consequential"
                          ? "bg-surface-2 text-action-warning"
                          : isActive
                            ? "bg-action-primary/20 text-action-primary"
                            : "bg-bg-elevated text-text-secondary"
                      }`}
                    >
                      <GroupIcon className="w-3.5 h-3.5" />
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
                        {cmd.kind === "consequential"
                          ? `routed to ${cmd.needsSurface}`
                          : `${cmd.group}${cmd.entityKind ? ` · ${cmd.entityKind}` : ""}`}
                      </p>
                    </div>
                    {cmd.kind === "consequential" ? (
                      <ArrowRight className="w-4 h-4 text-action-warning shrink-0" />
                    ) : isActive ? (
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

/** A small group/affordance icon (visual only; the label is the truth). */
function groupIcon(
  group: PaletteCommand["group"],
  kind: PaletteCommand["kind"],
): React.ComponentType<{ className?: string }> {
  if (kind === "consequential") return ShieldAlert;
  if (group === "Recent") return Clock;
  if (group === "Records" || group === "Entities") return User;
  return Search;
}

export default PrincipalCommandBar;
