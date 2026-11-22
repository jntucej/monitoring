/**
 * lib/commands/parse.ts — single source of truth for free-text command parsing.
 *
 * Replaces the 9 copy-pasted `parseCommand` functions in the approver
 * command bars. Each bar defines its own `CommandDef[]` (its commands) and
 * passes them to `parseCommand()`. The bar keeps its own execution logic
 * (which fetch to call per action); the parser is shared.
 *
 * This is Tier 0 (kernel) — it never forks.
 */

// ── Command grammar ────────────────────────────────────────────────────────

/** A single argument slot a command accepts. */
export type CommandArg =
  | "ticket"       // one token: the ticket id/number
  | "reason"       // rest of the line (greedy)
  | "targetRole"   // token after "to"
  | "delegateRole" // first token after "delegate"
  | "validUntil";  // token after "till"

/** A command definition: verb + args. `args` order matters. */
export interface CommandDef {
  id: string;
  verb: string;            // lowercase trigger word, e.g. "forward"
  label: string;
  hint: string;
  args?: CommandArg[];
  icon?: string;           // icon key; the shell maps it to a component
}

export type CommandAction =
  | "APPROVE" | "REJECT" | "ESCALATE"
  | "FORWARD" | "DELEGATE"
  | "DEPT_STATS"
  | "RESOLVE" | "ALLOCATE" | "VIEW_RESIDENTS"
  | "UNKNOWN";

export interface ParsedCommand {
  action: CommandAction;
  /** The command id (e.g. "approve"), or "unknown". */
  id: string;
  /** Parsed arguments by name. Missing args are "". */
  args: Record<string, string>;
  /** The original raw input (for echo / logging). */
  raw: string;
}

/**
 * A role-specific parser for verbs the shared grammar can't fully express
 * (e.g. hostel-manager's `allocate <roll> to <room>-<bed>`). The kernel
 * parser checks the custom parser first; if it returns a known action it
 * wins, otherwise the shared grammar applies.
 */
export type CustomParser = (input: string, base: ParsedCommand) => ParsedCommand;

// ── parseCommand ───────────────────────────────────────────────────────────

/**
 * Parse free-text input against a set of CommandDefs.
 *
 *   forward P-1042 to deputy_warden   → { action:"FORWARD", args:{ticket:"P-1042", targetRole:"deputy_warden"} }
 *   reject P-1042 too early           → { action:"REJECT", args:{ticket:"P-1042", reason:"too early"} }
 *   approve P-1042                   → { action:"APPROVE", args:{ticket:"P-1042"} }
 *
 * @param input  The raw command text.
 * @param defs    The command set to parse against.
 * @param custom  Optional role-specific parser for exotic verbs.
 */
export function parseCommand(
  input: string,
  defs: CommandDef[],
  custom?: CustomParser,
): ParsedCommand {
  const raw = input.trim();
  const tokens = raw.split(/\s+/).filter(Boolean);
  const empty: ParsedCommand = { action: "UNKNOWN", id: "unknown", args: {}, raw };

  if (tokens.length === 0) return empty;

  const first = (tokens[0] ?? "").toLowerCase();

  // Role-specific parser gets first crack (for verbs the shared grammar
  // can't fully express, e.g. allocate <roll> to <room>-<bed>).
  if (custom) {
    const result = custom(raw, empty);
    if (result.action !== "UNKNOWN") return result;
  }

  // Find the matching command def.
  const def = defs.find((d) => d.verb === first);
  if (!def) return { ...empty, raw };

  const args: Record<string, string> = {};
  const spec = def.args ?? [];

  if (spec.includes("ticket")) {
    args.ticket = tokens[1] ?? "";
  }

  // Special two-verb forms.
  if (def.id === "forward" || def.id === "assign" || spec.includes("targetRole")) {
    const toIdx = tokens.findIndex((t) => t.toLowerCase() === "to");
    args.ticket = tokens[1] ?? "";
    args.targetRole = toIdx > 0 ? (tokens[toIdx + 1] ?? "") : "";
    // For "assign" the comment is "to <target>"; for "forward" same.
    args.comment = args.targetRole ? `to ${args.targetRole}` : tokens.slice(2).join(" ").trim();
  }

  if (def.id === "delegate" || spec.includes("delegateRole")) {
    args.delegateRole = tokens[1] ?? "";
    const tillIdx = tokens.findIndex((t) => t.toLowerCase() === "till");
    args.validUntil = tillIdx > 0 ? (tokens[tillIdx + 1] ?? "") : "";
  }

  // Greedy reason/comment: everything after the ticket token.
  if (spec.includes("reason") || def.id === "resolve") {
    args.reason = tokens.slice(2).join(" ");
    if (def.id === "resolve") args.comment = args.reason;
  }

  return {
    action: mapAction(def.id),
    id: def.id,
    args,
    raw,
  };
}

// ── Action mapping ─────────────────────────────────────────────────────────

function mapAction(defId: string): CommandAction {
  switch (defId) {
    case "approve": return "APPROVE";
    case "reject": return "REJECT";
    case "escalate": return "ESCALATE";
    case "forward": return "FORWARD";
    case "delegate": return "DELEGATE";
    case "dept-stats":
    case "dept": return "DEPT_STATS";
    case "assign": return "FORWARD";
    case "resolve": return "APPROVE";
    case "residents":
    case "view-residents": return "VIEW_RESIDENTS";
    case "allocate": return "ALLOCATE";
    default: return "UNKNOWN";
  }
}

// ── Default command sets (reusable across bars) ───────────────────────────

/** Base HOD / generic permission commands. */
export const BASE_COMMANDS: CommandDef[] = [
  { id: "approve", verb: "approve", label: "Approve a permission", hint: "approve <ticket>", args: ["ticket"] },
  { id: "reject", verb: "reject", label: "Reject a permission", hint: "reject <ticket> [reason]", args: ["ticket", "reason"] },
  { id: "escalate", verb: "escalate", label: "Escalate to next stage", hint: "escalate <ticket>", args: ["ticket"] },
];

/** Deputy warden adds forward + delegate. */
export const DEPUTY_COMMANDS: CommandDef[] = [
  ...BASE_COMMANDS,
  { id: "forward", verb: "forward", label: "Forward to a higher role", hint: "forward <ticket> to <role>", args: ["ticket", "targetRole"] },
  { id: "delegate", verb: "delegate", label: "Check delegation state", hint: "delegate <role> till <date>", args: ["delegateRole", "validUntil"] },
];

/** Caretaker adds assign. */
export const CARETAKER_COMMANDS: CommandDef[] = [
  ...BASE_COMMANDS,
  { id: "assign", verb: "assign", label: "Assign a ticket to staff", hint: "assign <ticket> to <staff>", args: ["ticket", "targetRole"] },
];

/** Hostel manager: assign + resolve + allocate + escalate + residents. */
export const HOSTEL_MANAGER_COMMANDS: CommandDef[] = [
  { id: "assign", verb: "assign", label: "Assign a ticket to staff", hint: "assign <ticket> to <staff>", args: ["ticket", "targetRole"] },
  { id: "resolve", verb: "resolve", label: "Resolve a ticket", hint: "resolve <ticket> [note]", args: ["ticket", "reason"] },
  { id: "escalate", verb: "escalate", label: "Escalate to next stage", hint: "escalate <ticket>", args: ["ticket"] },
  { id: "residents", verb: "residents", label: "View resident service requests", hint: "residents — Open resident service requests" },
  { id: "view-residents", verb: "view-residents", label: "View resident service requests", hint: "residents — Open resident service requests" },
];

/** Principal: top-authority oversight verbs — all pure navigations to the
 *  principal sub-pages under /principal/ (the principal is scoped to all
 *  workflows, so no hostel/branch filter). No consequential write verbs run
 *  through the palette; those stay on the dedicated decision surfaces. */
export const PRINCIPAL_COMMANDS: CommandDef[] = [
  { id: "dashboard", verb: "dashboard", label: "Open the principal dashboard", hint: "dashboard — Go to the command centre" },
  { id: "delegations", verb: "delegations", label: "Open the delegation register", hint: "delegations — Go to the delegations page" },
  { id: "audit", verb: "audit", label: "Open the audit trail", hint: "audit — Go to the audit page" },
  { id: "reports", verb: "reports", label: "Open reports", hint: "reports — Go to the reports page" },
  { id: "approvals", verb: "approvals", label: "Open pending approvals", hint: "approvals — Go to the approvals queue" },
  { id: "attention", verb: "attention", label: "Open the attention queue", hint: "attention — Go to the attention queue" },
  { id: "escalations", verb: "escalations", label: "Open escalations", hint: "escalations — Go to the escalations page" },
  { id: "emergency", verb: "emergency", label: "Open the emergency command plane", hint: "emergency — Go to the emergency page" },
  { id: "examinations", verb: "examinations", label: "Open examinations", hint: "examinations — Go to the examinations page" },
  { id: "cases", verb: "cases", label: "Open institutional cases", hint: "cases — Go to the cases page" },
];

export default parseCommand;
