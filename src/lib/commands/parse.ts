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

// ── parseCommand ───────────────────────────────────────────────────────────

/**
 * Parse free-text input against a set of CommandDefs.
 *
 *   forward P-1042 to deputy_warden   → { action:"FORWARD", args:{ticket:"P-1042", targetRole:"deputy_warden"} }
 *   reject P-1042 too early           → { action:"REJECT", args:{ticket:"P-1042", reason:"too early"} }
 *   approve P-1042                   → { action:"APPROVE", args:{ticket:"P-1042"} }
 */
export function parseCommand(input: string, defs: CommandDef[]): ParsedCommand {
  const raw = input.trim();
  const tokens = raw.split(/\s+/).filter(Boolean);
  const empty: ParsedCommand = { action: "UNKNOWN", id: "unknown", args: {}, raw };

  if (tokens.length === 0) return empty;

  const first = (tokens[0] ?? "").toLowerCase();

  // Find the matching command def.
  const def = defs.find((d) => d.verb === first);
  if (!def) return { ...empty, raw };

  const args: Record<string, string> = {};
  const spec = def.args ?? [];

  if (spec.includes("ticket")) {
    args.ticket = tokens[1] ?? "";
  }

  // Special two-verb forms.
  if (def.id === "forward" || spec.includes("targetRole")) {
    const toIdx = tokens.findIndex((t) => t.toLowerCase() === "to");
    args.ticket = tokens[1] ?? "";
    args.targetRole = toIdx > 0 ? (tokens[toIdx + 1] ?? "") : "";
  }

  if (def.id === "delegate" || spec.includes("delegateRole")) {
    args.delegateRole = tokens[1] ?? "";
    const tillIdx = tokens.findIndex((t) => t.toLowerCase() === "till");
    args.validUntil = tillIdx > 0 ? (tokens[tillIdx + 1] ?? "") : "";
  }

  // Greedy reason: everything after the ticket token.
  if (spec.includes("reason")) {
    args.reason = tokens.slice(2).join(" ");
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

export default parseCommand;
