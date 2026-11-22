/**
 * commandPaletteData — PR-13. The deterministic + verified data layer behind
 * the Principal command palette. Pure + testable; the component consumes it.
 *
 * Rules honored (protocol §PR-13, §12.2):
 *  - Deterministic commands + real search APIs (no fake NL engine).
 *  - Ambiguous input → return MULTIPLE relevant choices, never a single guess.
 *  - Consequential actions are NOT palette triggers. Quick actions that would
 *    change institutional state are marked `kind: "consequential"` so the UI
 *    refuses to execute them here and routes to the surface that owns the
 *    verb (the palette must not bypass authorization / confirmations).
 *  - Navigation + record-open are safe; they carry a real destination.
 */
import type { PrincipalEntityType } from "@/lib/principal/contracts";

/** What the palette can do with an entry. Closed set. */
export type CommandKind =
  | "navigate" // safe: go to a register / page
  | "open-record" // safe: open an entity in the inspector (read-only)
  | "search" // the search input itself (not an entry)
  | "consequential"; // NOT executable in-palette; routes to its surface

export interface PaletteCommand {
  kind: CommandKind;
  /** Stable id (used as the listbox option key). */
  id: string;
  /** Human label. */
  label: string;
  /** Short hint / group label. */
  group: "Navigate" | "Entities" | "Records" | "Workflows" | "Recent";
  /** Destination (for navigate / open-record). */
  href?: string;
  /** Entity kind (for open-record), so the inspector can route it. */
  entityKind?: PrincipalEntityType;
  entityId?: string;
  /** When true, the palette must NOT execute this in-place — it surfaces a
   *  "go to the <surface> to do this" hint instead. */
  needsSurface?: string;
}

/** The 5 original navigation commands (preserved verbatim — acceptance:
 *  "existing navigation commands continue to work"). */
export const NAV_COMMANDS: PaletteCommand[] = [
  { kind: "navigate", id: "nav-dashboard", label: "Open principal dashboard", group: "Navigate", href: "/principal" },
  { kind: "navigate", id: "nav-delegations", label: "Open delegation register", group: "Workflows", href: "/principal/governance/delegations" },
  { kind: "navigate", id: "nav-audit", label: "Open audit trail", group: "Workflows", href: "/principal/governance/audit" },
  { kind: "navigate", id: "nav-reports", label: "Open reports", group: "Workflows", href: "/principal/governance/reports" },
  { kind: "navigate", id: "nav-approvals", label: "Open pending approvals", group: "Workflows", href: "/principal/approvals" },
  { kind: "navigate", id: "nav-attention", label: "Open attention queue", group: "Navigate", href: "/principal/attention" },
  { kind: "navigate", id: "nav-escalations", label: "Open escalations", group: "Navigate", href: "/principal/escalations" },
  { kind: "navigate", id: "nav-emergency", label: "Open emergency command plane", group: "Navigate", href: "/principal/emergency" },
  { kind: "navigate", id: "nav-exams", label: "Open examinations", group: "Workflows", href: "/principal/examinations" },
  { kind: "navigate", id: "nav-cases", label: "Open institutional cases", group: "Workflows", href: "/principal/cases" },
];

/** Deterministic keyword → command resolution. No free-text guessing: each
 *  command matches by its stable id or a known keyword set. */
const KEYWORDS: Record<string, string[]> = {
  "nav-dashboard": ["dashboard", "home", "command", "command center"],
  "nav-delegations": ["delegation", "delegations", "delegate"],
  "nav-audit": ["audit", "audit trail", "history"],
  "nav-reports": ["report", "reports"],
  "nav-approvals": ["approval", "approvals", "pending", "approvals queue"],
  "nav-attention": ["attention", "queue", "decide"],
  "nav-escalations": ["escalation", "escalations"],
  "nav-emergency": ["emergency", "incident", "security"],
  "nav-exams": ["exam", "exams", "examination", "examinations"],
  "nav-cases": ["case", "cases", "institutional case"],
};

/**
 * Resolve a query to palette commands.
 *  - empty query → the full navigation + workflow set (all deterministic).
 *  - a command keyword → the matching command(s) (multiple when ambiguous).
 *  - anything else → empty (the caller falls back to real entity search).
 * Never invents a command; unknown text returns [] so the UI can search.
 */
export function resolvePaletteCommands(query: string): PaletteCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return NAV_COMMANDS;
  const matches = NAV_COMMANDS.filter((c) => {
    const kws = KEYWORDS[c.id] ?? [c.id];
    return (
      c.label.toLowerCase().includes(q) ||
      c.id.includes(q) ||
      kws.some((k) => k.includes(q) || q.includes(k))
    );
  });
  // Ambiguous → return all matches (the UI lists them), not a single guess.
  return matches;
}

/**
 * Build the "open-record" commands from REAL search results. Each result is a
 * record the user is authorized to view (the search API is RBAC-scoped); the
 * palette offers to open it in the inspector (read-only) — never a
 * consequential verb.
 */
export function searchResultsToCommands<T extends { id: string; label: string; kind?: PrincipalEntityType }>(
  results: T[],
  kind: PrincipalEntityType,
  target: (r: T) => string,
): PaletteCommand[] {
  return results.map((r) => ({
    kind: "open-record",
    id: `open-${kind}-${r.id}`,
    label: `Inspect ${r.label}`,
    group: "Records",
    href: target(r),
    entityKind: r.kind ?? kind,
    entityId: r.id,
  }));
}

/**
 * Recent entities, when the caller supplies them (session/localStorage). The
 * palette never fabricates recents — if none are stored, this returns [] and
 * the UI shows an honest "no recent entities" state.
 */
export function recentEntitiesToCommands(
  recents: Array<{ kind: PrincipalEntityType; id: string; label: string; href: string }>,
): PaletteCommand[] {
  return recents.map((r) => ({
    kind: "open-record",
    id: `recent-${r.kind}-${r.id}`,
    label: r.label,
    group: "Recent",
    href: r.href,
    entityKind: r.kind,
    entityId: r.id,
  }));
}

/**
 * Consequential quick actions that must NOT run in-palette. These are listed
 * so the user can SEE what's available, but execution is routed to the owning
 * surface (the palette "must not bypass authorization or trigger
 * consequential actions without confirmation").
 */
export const CONSEQUENTIAL_QUICK_ACTIONS: PaletteCommand[] = [
  { kind: "consequential", id: "qa-approve", label: "Approve a request", group: "Records", needsSurface: "the approvals queue" },
  { kind: "consequential", id: "qa-delegate", label: "Create a delegation", group: "Records", needsSurface: "the delegation manager" },
  { kind: "consequential", id: "qa-escalate", label: "Escalate an item", group: "Records", needsSurface: "the attention queue" },
];
