/**
 * Confirmations — shared chain primitives over the EXISTING `permissions`
 * multi-stage chain (not a new confirmations table).
 *
 * Two jobs:
 *  1. `validateChain` — the hard guardrail: hostel entity types (leave,
 *     gate_pass, hostel_room_allot, mess_bill) must NEVER include an
 *     academic role. This is the segregation the hostel docs keep
 *     emphasising.
 *  2. `getConfirmationChain` — resolve the stage list for an entity type from
 *     ops_rules(domain='confirmation_chain'), so chains change without a
 *     deploy.
 */
import { getRule } from "@/lib/rules/service";

export class ChainValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "ChainValidationError";
  }
}

/** Roles that are academic and can never appear in a hostel chain. */
const ACADEMIC_ROLES = new Set([
  "faculty",
  "hod",
  "dean",
  "exam_branch",
  "oie",
  "exam_superintendent",
  "controller_examinations",
  "addl_controller_academic",
  "addl_controller_results",
  "addl_controller_automation",
]);

/** Entity types that are hostel-scoped (no academic role allowed). */
const HOSTEL_ENTITY_TYPES = new Set([
  "leave",
  "gate_pass",
  "hostel_room_allot",
  "mess_bill",
]);

export interface ChainStage {
  role: string;
  context?: string; // 'chief_warden', 'exam_superintendent', …
  twoPerson?: boolean;
}

export interface ConfirmationChain {
  entityType: string;
  stages: ChainStage[];
  twoPerson: boolean;
  parallelNotify: string[];
}

/**
 * Throw if a hostel chain includes an academic role. Called at chain-creation
 * time so a bad seed or bad request fails fast, before any permission row is
 * written.
 */
export function validateChain(entityType: string, stages: { role: string }[]): void {
  if (!HOSTEL_ENTITY_TYPES.has(entityType)) return;
  const offender = stages.find((s) => ACADEMIC_ROLES.has(s.role));
  if (offender) {
    throw new ChainValidationError(
      `Chain violation: ${entityType} must not include academic role '${offender.role}'`
    );
  }
}

/**
 * Resolve the stage list for an entity type from ops_rules. Returns null if
 * no chain is configured (caller falls back to the entity's native flow).
 */
export async function getConfirmationChain(
  entityType: string
): Promise<ConfirmationChain | null> {
  const raw = await getRule<Record<string, unknown>>("confirmation_chain", entityType);
  if (!raw) return null;
  const stages = (raw.stages as ChainStage[] | undefined) ?? [];
  const twoPerson = Boolean(raw.two_person);
  const parallelNotify = (raw.parallel_notify as string[] | undefined) ?? [];
  return { entityType, stages, twoPerson, parallelNotify };
}

/**
 * Pick the leave-duration class (short/medium/long/emergency) that maps to a
 * confirmation chain, per ops_rules('leave_threshold').
 */
export async function classifyLeave(
  hours: number,
  isEmergency: boolean
): Promise<{ key: string; chain: string[] }> {
  if (isEmergency) {
    const rule = (await getRule<{ duration?: string; chain?: string[] }>("leave_threshold", "emergency")) ?? {
      chain: ["deputy_warden"],
    };
    return { key: "emergency", chain: rule.chain ?? [] };
  }
  const short = (await getRule<{ duration?: string }>("leave_threshold", "short"))?.duration ?? "PT2H";
  const medium = (await getRule<{ duration?: string }>("leave_threshold", "medium"))?.duration ?? "P1D";
  const long = (await getRule<{ duration?: string }>("leave_threshold", "long"))?.duration ?? "P7D";
  // ISO-8601 to hours.
  const toHours = (iso: string): number => {
    const m = iso.match(/PT?([0-9]+)([HMD])?/);
    if (!m) return 0;
    const n = parseInt(m[1], 10);
    switch (m[2]) {
      case "H":
        return n;
      case "D":
        return n * 24;
      case "M":
        return n / 60;
      default:
        return n;
    }
  };
  if (hours <= toHours(short)) {
    const rule = await getRule<{ chain?: string[] }>("leave_threshold", "short");
    return { key: "short", chain: rule?.chain ?? [] };
  }
  if (hours <= toHours(medium)) {
    const rule = await getRule<{ chain?: string[] }>("leave_threshold", "medium");
    return { key: "medium", chain: rule?.chain ?? [] };
  }
  const rule = await getRule<{ chain?: string[] }>("leave_threshold", "long");
  return { key: "long", chain: rule?.chain ?? [] };
}
