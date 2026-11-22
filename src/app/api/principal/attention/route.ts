// src/app/api/principal/attention/route.ts
//
// PR-12 — Principal Command Center: the institutional API surface the UI
// projects over. Thin capability routes over the engines (PR-02..11); no
// business logic in the routes.
//
//   GET /api/principal/attention              the active queue (PR-09)
//   GET /api/principal/attention/:id          one item
//   POST /api/principal/attention/:id/resolve
//   GET /api/principal/escalations            open escalations (PR-05)
//   POST /api/principal/escalations/:id/resolve
//   GET /api/principal/decisions              the decision ledger (PR-06)
//   GET /api/principal/emergency              current state + commands (PR-10)

import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { attentionQueue, resolveAttention, type AttentionItemRow } from "@/lib/institutional/attention";
import { query } from "@/lib/postgres";
import { currentEmergencyState, type EmergencyCommandRow } from "@/lib/institutional/emergency";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const READ_ROLES: Role[] = ["principal", "admin", "sysadmin"];
const WRITE_ROLES: Role[] = ["principal", "admin", "sysadmin"];

// ── GET /api/principal/attention ──────────────────────────────────────────

async function getAttention(req: NextRequest, _ctx: { auth: AuthContext }) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50, 200);
  try {
    const items = await attentionQueue(limit);
    return ok({ items, total: items.length });
  } catch (e) {
    return fail("INTERNAL", e instanceof Error ? e.message : "Failed to load attention queue", 500);
  }
}

// ── POST /api/principal/attention/:id/resolve ─────────────────────────────

async function resolveAttentionItem(req: NextRequest, ctx: { auth: AuthContext }) {
  const auth = ctx.auth;
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  // /api/principal/attention/:id/resolve → segments [ 'api','principal','attention',':id','resolve' ]
  const id = segments[3] ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("BAD_REQUEST", "Item id must be a uuid", 400);
  try {
    const item = await resolveAttention(id, {
      id: auth.userId,
      name: auth.email,
      role: auth.role,
      roleContext: "administrative",
    });
    return ok({ item });
  } catch (e) {
    return fail("NOT_FOUND", e instanceof Error ? e.message : "Failed to resolve item", 404);
  }
}

// ── GET /api/principal/escalations ────────────────────────────────────────

export interface EscalationView {
  id: string;
  case_id: string;
  reason: string;
  severity: string;
  source: string | null;
  target_role: string | null;
  target_context: string | null;
  status: string;
  recommended_action: string | null;
  created_at: string;
}

async function getEscalations(req: NextRequest, _ctx: { auth: AuthContext }) {
  const onlyOpen = req.nextUrl.searchParams.get("open") !== "false";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50, 200);
  try {
    const { rows } = await query<EscalationView>(
      `SELECT id, case_id, reason, severity, source, target_role, target_context,
              status, recommended_action, created_at
         FROM public.escalations
        ${onlyOpen ? "WHERE status = 'OPEN'" : ""}
        ORDER BY
          CASE severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
          created_at DESC
        LIMIT $1`,
      [limit],
    );
    return ok({ escalations: rows, total: rows.length });
  } catch (e) {
    return fail("INTERNAL", e instanceof Error ? e.message : "Failed to load escalations", 500);
  }
}

async function resolveEscalation(req: NextRequest, ctx: { auth: AuthContext }) {
  const auth = ctx.auth;
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  // /api/principal/escalations/:id/resolve
  const id = segments[3] ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("BAD_REQUEST", "Escalation id must be a uuid", 400);
  const body = await req.json().catch(() => null);
  const status = (body?.status ?? "RESOLVED") as "RESOLVED" | "DISMISSED";
  if (!["RESOLVED", "DISMISSED"].includes(status)) return fail("BAD_REQUEST", "status must be RESOLVED or DISMISSED", 400);
  try {
    const { rows } = await query<EscalationView>(
      `UPDATE public.escalations SET status = $2, resolved_by = $3, resolved_at = now()
        WHERE id = $1 AND status = 'OPEN'
       RETURNING id, case_id, reason, severity, status, created_at`,
      [id, status, auth.userId],
    );
    if (rows.length === 0) return fail("NOT_FOUND", "Escalation not found or already resolved", 404);
    return ok({ escalation: rows[0] });
  } catch (e) {
    return fail("INTERNAL", e instanceof Error ? e.message : "Failed to resolve escalation", 500);
  }
}

// ── GET /api/principal/decisions ──────────────────────────────────────────

export interface DecisionView {
  id: string;
  decision_no: string;
  case_id: string;
  operation: string;
  actor_role: string;
  role_context: string;
  authority_source: string;
  reason: string;
  resulting_state: string | null;
  timestamp: string;
}

async function getDecisions(req: NextRequest, _ctx: { auth: AuthContext }) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50, 200);
  try {
    const { rows } = await query<DecisionView>(
      `SELECT id, decision_no, case_id, operation, actor_role, role_context,
              authority_source, reason, resulting_state, timestamp
         FROM public.decisions
        ORDER BY timestamp DESC
        LIMIT $1`,
      [limit],
    );
    return ok({ decisions: rows, total: rows.length });
  } catch (e) {
    return fail("INTERNAL", e instanceof Error ? e.message : "Failed to load decisions", 500);
  }
}

// ── GET /api/principal/emergency ──────────────────────────────────────────

async function getEmergency(_req: NextRequest, _ctx: { auth: AuthContext }) {
  try {
    const state = await currentEmergencyState();
    const { rows: commands } = await query<EmergencyCommandRow>(
      `SELECT * FROM public.emergency_commands
        WHERE archived_at IS NULL
        ORDER BY created_at DESC
        LIMIT 20`,
    );
    return ok({ currentState: state, commands });
  } catch (e) {
    return fail("INTERNAL", e instanceof Error ? e.message : "Failed to load emergency state", 500);
  }
}

export const GET = withAuthorization(getAttention, { requiredRole: READ_ROLES });
export const POST = withMutationGuard(resolveAttentionItem, { requiredRole: WRITE_ROLES });
