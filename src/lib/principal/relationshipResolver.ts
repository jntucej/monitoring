/**
 * relationshipResolver — turn REAL API payloads into PrincipalRelationship[].
 *
 * PR-07 rule (protocol §7.3): "Use verified API relationships. Represent
 * missing or inaccessible related records honestly. Never invent graph
 * connections." This module is a *mapper over real data*, not a graph engine.
 * It knows no backend — it receives rows the caller fetched and returns
 * typed relationships. Each target ref's `id`/`type` come straight from the
 * row; a target with no id/label is marked `available: false` with a reason,
 * never guessed.
 */
import type {
  PrincipalRelationship,
  PrincipalEntityRef,
} from "@/lib/principal/contracts";

/** A real pending permission/approval row (principal dashboard shape). */
export interface PermissionRelRow {
  id: string;
  ticket_number?: string;
  requester_user_id?: string | null;
  /** Denormalized requester name (dashboard joins users). */
  student_name?: string | null;
  current_stage?: string | null;
}

/** A real emergency/security alert row (principal dashboard shape). */
export interface AlertRelRow {
  id: string;
  gate_id?: string | null;
  gate_name?: string | null;
  dept_code?: string | null;
  resolved?: boolean | null;
}

/**
 * The requesting entity of a permission/approval. The server is authoritative
 * for whether the principal may inspect the requester; this only builds the
 * ref so the UI can offer inspection (the inspector enforces access).
 */
export function permissionRelationships(
  row: PermissionRelRow,
): PrincipalRelationship[] {
  const out: PrincipalRelationship[] = [];
  // Requester (student/faculty) — the person who raised the request.
  const reqId = row.requester_user_id;
  out.push({
    relation: "requested by",
    target: reqId
      ? { type: "student", id: reqId, label: row.student_name ?? reqId }
      : {
          type: "student",
          id: row.id, // self-ref: the permission record itself
          label: row.ticket_number ?? row.id,
        },
    available: Boolean(reqId),
    unavailableReason: reqId
      ? undefined
      : "requester not recorded on this request",
  });
  // The approval workflow the request sits in (its current stage).
  if (row.current_stage) {
    out.push({
      relation: "in workflow stage",
      target: {
        type: "approval",
        id: row.id,
        label: row.current_stage,
      },
    });
  }
  return out;
}

/**
 * The physical context of an alert: the gate it fired on + the department
 * it concerns. Honest when a target id is missing (no invented gate).
 */
export function alertRelationships(row: AlertRelRow): PrincipalRelationship[] {
  const out: PrincipalRelationship[] = [];
  // Gate (location) the alert fired on.
  out.push({
    relation: "at gate",
    target: row.gate_id
      ? { type: "gate", id: row.gate_id, label: row.gate_name ?? row.gate_id }
      : { type: "gate", id: row.id, label: "gate not recorded" },
    available: Boolean(row.gate_id),
    unavailableReason: row.gate_id ? undefined : "no gate linked to this alert",
  });
  // Department the alert concerns (code → name is resolved by the target's
  // own inspector; we only carry the real code, never a guessed name).
  if (row.dept_code) {
    out.push({
      relation: "concerns department",
      target: {
        type: "department",
        id: row.dept_code,
        label: row.dept_code,
      },
    });
  }
  return out;
}

/**
 * Generic helper: build a relationship whose target must exist, marking it
 * unavailable (with a reason) rather than inventing it when `present` is
 * false. Useful for domain rows that carry an optional foreign id.
 */
export function refOrUnavailable(
  relation: string,
  type: PrincipalEntityRef["type"],
  realId: string | null | undefined,
  label?: string | null,
  unavailableReason = "record not available",
): PrincipalRelationship {
  return {
    relation,
    target: realId
      ? { type, id: realId, label: label ?? realId }
      : { type, id: "", label: unavailableReason },
    available: Boolean(realId),
    unavailableReason: realId ? undefined : unavailableReason,
  };
}

export const relationshipResolver = {
  permission: permissionRelationships,
  alert: alertRelationships,
  refOrUnavailable,
};
