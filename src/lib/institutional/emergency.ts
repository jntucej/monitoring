// src/lib/institutional/emergency.ts
//
// PR-10 — Emergency Command subsystem. Emergency execution bypasses
// normal workflows, but NEVER bypasses authorization and audit. The
// command plane issues an emergency command; the data plane (the gate
// IN/OUT gating) already reads lockdown_broadcasts — so the command
// links to the existing broadcast, it does not fork a new mechanism.
//
// Compose, don't fork:
//   * emergency_commands.lockdown_id → lockdown_broadcasts.id (the
//     table the data plane already reads). No new broadcast table.
//   * emergency_commands is the command-plane record: who → what → why
//     → when → scope → duration + a mandatory post-incident review for
//     LOCKDOWN/EMERGENCY.
//   * An emergency command lands on the attention queue as CRITICAL
//     (PR-09) so the principal + operators see it.

import { query } from "@/lib/postgres";
import { logAuditEvent } from "@/lib/audit";
import type {
  Actor,
  EmergencyState,
} from "@/lib/institutional/contracts";

// ── Issue ─────────────────────────────────────────────────────────────────

export interface EmergencyCommandRow {
  id: string;
  state: EmergencyState;
  authority_source: string;
  lockdown_id: string | null;
  actor_id: string;
  actor_role: string;
  role_context: string;
  reason: string;
  scopes: string[];
  duration_hours: number | null;
  review_status: string;
  created_at: string;
}

export interface IssueEmergencyCommandInput {
  state: EmergencyState;
  reason: string;
  scopes?: string[];
  /** The lockdown_broadcasts row to link (the data plane acts on this). */
  lockdownId?: string | null;
  durationHours?: number | null;
  /** Who issued it + under which hat. */
  actor: Actor;
  /** The authority that permits the command (role / delegation / emergency_override). */
  authoritySource?: "role" | "delegation" | "emergency_override";
}

/**
 * Issue an emergency command. LOCKDOWN and EMERGENCY require the
 * emergency_command role context (the principal acting as the
 * emergency-commander) + a mandatory post-incident review. ELEVATED /
 * CRITICAL can be issued by a higher-tier role without the full review.
 *
 * The command is audited at issuance (who → what → why → scope →
 * duration) and the review is tracked to closure.
 */
export async function issueEmergencyCommand(
  input: IssueEmergencyCommandInput,
): Promise<EmergencyCommandRow> {
  // LOCKDOWN / EMERGENCY require the emergency_command context. The
  // principal is the single emergency-commander; a delegation to the
  // context is also acceptable (authority_source = delegation).
  const needsCommandContext = input.state === "LOCKDOWN" || input.state === "EMERGENCY";
  if (needsCommandContext && input.actor.roleContext !== "emergency_command"
      && input.authoritySource !== "emergency_override") {
    throw new Error(
      `state '${input.state}' requires the emergency_command role context ` +
      `(or an emergency_override authority); actor context is '${input.actor.roleContext}'`,
    );
  }

  // The reason is mandatory — an emergency action with no stored reason
  // cannot be reconstructed at post-incident review.
  if (!input.reason || input.reason.trim().length < 5) {
    throw new Error("an emergency command requires a substantive reason (stored for post-incident review)");
  }

  const { rows } = await query<EmergencyCommandRow>(
    `INSERT INTO public.emergency_commands
       (state, authority_source, lockdown_id, actor_id, actor_role, role_context,
        reason, scopes, duration_hours, review_status)
     VALUES ($1::text,$2::text,$3::uuid,$4::uuid,$5::text,$6::text,$7::text,$8::jsonb,$9::int,
            CASE WHEN $1 IN ('LOCKDOWN','EMERGENCY') THEN 'PENDING' ELSE 'WAIVED' END)
     RETURNING *`,
    [
      input.state,
      input.authoritySource ?? "role",
      input.lockdownId ?? null,
      input.actor.id,
      input.actor.role,
      input.actor.roleContext,
      input.reason,
      JSON.stringify(input.scopes ?? []),
      input.durationHours ?? null,
    ],
  );
  const cmd = rows[0];

  await logAuditEvent({
    action: "emergency.command_issued",
    userId: input.actor.id,
    userName: input.actor.name ?? input.actor.id,
    userRole: input.actor.role,
    details: {
      command: cmd.id,
      state: cmd.state,
      scopes: cmd.scopes,
      reason: cmd.reason,
      authority_source: cmd.authority_source,
    },
  } as any);

  // Land on the attention queue as CRITICAL (PR-09). The principal +
  // operators see it in the executive cockpit.
  const { generateAttention } = await import("@/lib/institutional/attention");
  await generateAttention({
    severity: "CRITICAL",
    title: `Emergency: ${cmd.state}`,
    detail: cmd.reason,
    sourceKind: "lockdown",
    sourceId: cmd.id,
    recommendedAction: "Review the emergency command",
    actor: input.actor,
  }).catch(() => {});

  return cmd;
}

// ── Review (mandatory for LOCKDOWN / EMERGENCY) ─────────────────────────

export interface ReviewEmergencyCommandInput {
  commandId: string;
  reviewer: Actor;
  status: "COMPLETE" | "WAIVED";
  notes?: string;
}

/**
 * Close the post-incident review for a LOCKDOWN / EMERGENCY command.
 * Until reviewed, the command's review_status stays 'PENDING' — the
 * audit trail is incomplete.
 */
export async function reviewEmergencyCommand(
  input: ReviewEmergencyCommandInput,
): Promise<EmergencyCommandRow> {
  const { rows } = await query<EmergencyCommandRow>(
    `UPDATE public.emergency_commands
      SET review_status = $3, reviewed_by = $4, reviewed_at = now(), review_notes = $5,
          actor_id = $2::uuid
      WHERE id = $1 AND review_status = 'PENDING'
     RETURNING *`,
    [input.commandId, input.reviewer.id, input.status, input.reviewer.id, input.notes ?? null],
  );
  if (rows.length === 0) throw new Error(`emergency command ${input.commandId} has no pending review`);
  await logAuditEvent({
    action: "emergency.reviewed",
    userId: input.reviewer.id,
    userName: input.reviewer.name ?? input.reviewer.id,
    userRole: input.reviewer.role,
    details: { command: input.commandId, status: input.status },
  } as any);
  return rows[0];
}

// ── Current state ─────────────────────────────────────────────────────────

/**
 * The institution's current emergency state: the state of the latest
 * non-archived command (a new command supersedes the previous state).
 * No commands → NORMAL.
 */
export async function currentEmergencyState(): Promise<EmergencyState> {
  const { rows } = await query<{ state: string }>(
    `SELECT state FROM public.emergency_commands
      WHERE archived_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
  );
  return (rows[0]?.state as EmergencyState) ?? "NORMAL";
}
