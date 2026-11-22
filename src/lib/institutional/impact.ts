// src/lib/institutional/impact.ts
//
// PR-08 — ChainImpact Engine. Before executing a high-impact decision,
// compute the institutional consequences (academic status, exam
// eligibility, gate permissions, hostel, active passes, notifications)
// and require a confirm. No high-impact decision executes blindly.
//
// Compose, don't fork: impact_previews.decision_id → decisions.id
// (PR-06). The engine reads the decision's case + operation, computes
// the downstream systems, and stores the preview. Execution is gated on
// confirmed=true for high-impact operations.

import { query } from "@/lib/postgres";
import { logAuditEvent } from "@/lib/audit";
import type {
  Actor,
  ImpactEntry,
} from "@/lib/institutional/contracts";

// ── Impact analysis ───────────────────────────────────────────────────────

export interface ImpactPreviewRow {
  id: string;
  decision_id: string;
  systems_affected: string[];
  effects: ImpactEntry[];
  summary: string | null;
  confirmed: boolean;
  confirmed_by: string | null;
  confirmed_at: string | null;
}

/**
 * The downstream systems a decision can touch, by operation. This is the
 * "impact map" — a debarment touches academic + exam + gate + hostel +
 * passes + notifications; an approve touches only the gate. A domain
 * migration (PR-13) can extend the map per case_type without touching
 * the kernel.
 */
export const IMPACT_MAP: Record<string, string[]> = {
  debar:      ["academic_status", "exam_eligibility", "gate_permissions", "hostel", "active_passes", "notifications"],
  suspend:    ["academic_status", "gate_permissions", "active_passes", "notifications"],
  revoke:     ["gate_permissions", "active_passes", "notifications"],
  lockdown:   ["gates", "hostel", "security", "staff", "relevant_students", "audit"],
  approve:    ["gate", "notifications"],
  reject:     ["notifications"],
  escalate:   [],
  delegate:   [],
  override:   ["audit"],
};

/** The systems a case_type's decision touches (the case_type adds its own surface). */
export const CASE_TYPE_SYSTEMS: Record<string, string[]> = {
  gate_pass:        ["gate", "notifications"],
  hostel_leave:     ["hostel", "gate", "notifications"],
  academic_status:  ["academic_status", "exam_eligibility", "gate_permissions", "notifications"],
  exam_integrity:   ["exam_eligibility", "academic_status", "notifications"],
  security_incident:["gates", "security", "notifications", "audit"],
  emergency:        ["gates", "hostel", "security", "staff", "notifications", "audit"],
};

/**
 * Compute the impact preview for a decision. Returns the systems + a
 * concrete effect row per system. The caller persists it via
 * `saveImpactPreview`; a high-impact op cannot execute until
 * `confirmImpact` flips the row.
 */
export async function computeImpact(
  decisionId: string,
  operation: string,
  caseType: string,
  subjectId: string,
): Promise<{ systems_affected: string[]; effects: ImpactEntry[]; summary: string }> {
  // The systems are the union of the operation's impact map + the
  // case_type's own surface. De-dup, keep order.
  const systems = [...new Set([
    ...(IMPACT_MAP[operation] ?? []),
    ...(CASE_TYPE_SYSTEMS[caseType] ?? [caseType]),
  ])];

  // For each system, the effect is a concrete state change. The counts
  // (active passes, notifications generated) are computed from the live
  // tables when the subject is known; otherwise the effect is the
  // state transition only.
  const effects: ImpactEntry[] = systems.map((system) => {
    const effect = impactEffectFor(system, operation);
    return { system, effect };
  });

  // Fill affectedCount for the systems that have a concrete count.
  for (const e of effects) {
    e.affectedCount = await countAffected(e.system, operation, subjectId);
  }

  const summary = `This action affects ${systems.length} system(s): ${systems.join(", ")}`;
  return { systems_affected: systems, effects, summary };
}

/** What the decision does to one system, for one operation. */
function impactEffectFor(system: string, operation: string): string {
  if (operation === "debar") {
    switch (system) {
      case "academic_status": return "DEBARRED";
      case "exam_eligibility": return "REVOKED";
      case "gate_permissions": return "REVOKED";
      case "hostel": return "REVIEW REQUIRED";
      case "active_passes": return "REVOKED";
      case "notifications": return "QUEUED";
      default: return "AFFECTED";
    }
  }
  if (operation === "lockdown") {
    switch (system) {
      case "gates": return "RESTRICTED";
      case "hostel": return "EMERGENCY POLICY";
      case "security": return "NOTIFIED";
      case "staff": return "NOTIFIED";
      case "relevant_students": return "NOTIFIED";
      case "audit": return "CONTINUOUS";
      default: return "AFFECTED";
    }
  }
  if (operation === "approve") {
    switch (system) {
      case "gate": return "PASS GENERATED";
      case "notifications": return "QUEUED";
      default: return "AFFECTED";
    }
  }
  // Default: the system is touched, effect is the operation verb.
  return operation.toUpperCase();
}

/** A concrete count for the systems that have one (active passes, etc.). */
async function countAffected(system: string, operation: string, subjectId: string): Promise<number | null> {
  if (!subjectId) return null;
  try {
    switch (system) {
      case "active_passes":
      case "gate_permissions": {
        const { rows } = await query<{ n: number }>(
          `SELECT COUNT(*)::int AS n FROM public.gate_passes
            WHERE student_id = $1 AND status = 'ACTIVE'`,
          [subjectId],
        );
        return rows[0]?.n ?? 0;
      }
      case "notifications":
        // The notification count is the number of systems the decision
        // generates a notification for (the impact map's notification-
        // generating systems). A concrete queue count is a PR-13 detail.
        return null;
      default:
        return null;
    }
  } catch {
    // A missing gate_passes table / schema drift must not break the
    // impact preview; the preview still records the systems + effects.
    return null;
  }
}

// ── Persist + confirm ─────────────────────────────────────────────────────

export async function saveImpactPreview(
  decisionId: string,
  impact: { systems_affected: string[]; effects: ImpactEntry[]; summary: string },
): Promise<ImpactPreviewRow> {
  const { rows } = await query<ImpactPreviewRow>(
    `INSERT INTO public.impact_previews (decision_id, systems_affected, effects, summary)
     VALUES ($1, $2::jsonb, $3::jsonb, $4)
     RETURNING *`,
    [
      decisionId,
      JSON.stringify(impact.systems_affected),
      JSON.stringify(impact.effects),
      impact.summary,
    ],
  );
  const preview = rows[0];
  await logAuditEvent({
    action: "impact.computed",
    userId: "system",
    userName: "system",
    userRole: "system",
    details: {
      decision_id: decisionId,
      preview_id: preview.id,
      systems: impact.systems_affected,
      summary: impact.summary,
    },
  } as any);
  return preview;
}

/**
 * Confirm the impact preview (the principal / operator has seen the
 * "this affects N systems" and accepted it). Until confirmed=true,
 * a high-impact op is blocked from executing.
 */
export async function confirmImpact(
  decisionId: string,
  actor: Actor,
): Promise<ImpactPreviewRow> {
  const { rows } = await query<ImpactPreviewRow>(
    `UPDATE public.impact_previews SET confirmed = TRUE, confirmed_by = $2, confirmed_at = now()
      WHERE decision_id = $1 AND confirmed = FALSE
     RETURNING *`,
    [decisionId, actor.id],
  );
  if (rows.length === 0) throw new Error(`no pending impact preview for decision ${decisionId}`);
  await logAuditEvent({
    action: "impact.confirmed",
    userId: actor.id,
    userName: actor.name ?? actor.id,
    userRole: actor.role,
    details: { decision_id: decisionId, systems: rows[0].systems_affected },
  } as any);
  return rows[0];
}

/**
 * Is a high-impact op safe to execute? Returns true only when an impact
 * preview exists AND is confirmed. A high-impact op with no preview is
 * a blind execution — the engine refuses it.
 */
export async function impactConfirmed(decisionId: string): Promise<boolean> {
  const { rows } = await query<{ confirmed: boolean }>(
    `SELECT confirmed FROM public.impact_previews WHERE decision_id = $1`,
    [decisionId],
  );
  return rows.length > 0 && rows[0].confirmed === true;
}
