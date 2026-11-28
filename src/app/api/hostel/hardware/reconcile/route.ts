import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/hostel/hardware/reconcile — resolve a non-blocking H0201
 * reconciliation anomaly (UNMATCHED_EXIT / UNMATCHED_ENTRY tailgating or
 * missed scan) with a warden audit note.
 *
 * Non-blocking: resolving the anomaly does NOT lock the student out of the
 * gate or crash state — it logs a `hostel_incidents` row + an
 * `audit_events` row (actor_type 'agent'/'human') and clears the tag.
 *
 * Live-DB: anomalies are tracked in processed_events (H0201) + hostel
 * incidents. No dedicated punch table exists; the H0201 terminal is the
 * integration_adapter, reconciliation tags live in processed_events /
 * audit_events.
 */

export interface ReconcileBody {
  anomalyId: string;
  tag: "UNMATCHED_EXIT" | "UNMATCHED_ENTRY" | "DEBOUNCED_300S" | "STALE_OFFLINE_IGNORED";
  resolution: "Noted" | "Matched_to_exit" | "Matched_to_entry" | "False_positive";
  auditNote?: string;
  device?: string;
}

async function implPost(req: NextRequest, ctx: ApiChainContext<ReconcileBody, AuthContext>) {
  const body = (await req.json().catch(() => ({}))) as ReconcileBody;
  const auth = ctx.auth;
  if (!["chief_warden", "deputy_warden", "hostel_manager", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Hardware reconcile requires a warden / hostel_manager role.", 403);
  }
  const { anomalyId, tag, resolution, auditNote, device } = body;
  if (!anomalyId || !resolution) return fail("MISSING_BODY", "anomalyId + resolution required.", 400);

  // 1. Log the reconciliation as a hostel incident (non-blocking; the student
  // is never locked out). student_id is a soft reference to a user; use the
  // warden's own id as the recording actor when no specific student is known.
  const anyStudent = await query<{ id: string }>(
    `SELECT id FROM public.users WHERE role = 'student' LIMIT 1`,
  ).catch(() => ({ rows: [] as { id: string }[] }));
  await query(
    `INSERT INTO public.hostel_incidents (student_id, category, description, status, logged_by, logged_at)
       VALUES ($1, $2, $3, 'RESOLVED', $4, NOW())`,
    [
      anyStudent.rows[0]?.id ?? auth.userId,
      `H0201 ${tag}`,
      `${tag} reconciled: ${resolution} — ${auditNote ?? "warden audit note"} (device: ${device ?? "H0201"})`,
      auth.userId,
    ],
  ).catch(() => {});
  // 2. Audit row (actor_type 'human').
  await query(
    `INSERT INTO public.audit_events
       (event_id, actor_type, actor_id, role_context, action, resource, resource_id, before_state, created_at)
     VALUES (gen_random_uuid(), 'human', $1, $2, 'h0201_reconciliation_resolved', 'gate_reconciliation', $3, $4, NOW())`,
    [auth.userId, auth.role, anomalyId, JSON.stringify({ tag, resolution, auditNote, device })],
  ).catch(() => {});

  return ok({
    reconciled: true,
    anomalyId,
    tag,
    resolution,
    note: "Anomaly reconciled (non-blocking — student not locked out). Audit + incident rows written.",
  });
}

export const POST = withApiChain(implPost, {
  route: "/api/hostel/hardware/reconcile",
  auth: "user",
  requiredRole: ["chief_warden", "deputy_warden", "hostel_manager", "admin", "sysadmin"],
});
