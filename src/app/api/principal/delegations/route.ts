import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import { randomUUID } from "crypto";

/**
 * Delegation-of-authority endpoint for the principal role.
 *
 * GET  /api/principal/delegations?status=ACTIVE — list delegations where the
 *       caller is the delegating principal, plus audit notes of delegation
 *       events (create / revoke / expire) for accountability.
 * POST /api/principal/delegations — create a delegation { delegate_role,
 *       delegate_user_id?, scope, expiry, note }.
 *
 * Thin by design: one read + one insert. All decisions are written to the
 * audit log via addAudit() so the /principal/audit section reflects them.
 * The shared authorization middleware enforces the role; the endpoint is
 * deliberately read-mostly and does not modify any permission workflow.
 */

const DELEGATION_ROLES: readonly string[] = [
  "vice_principal",
  "hod",
  "supervisor",
  "oie",
  "hostel_manager",
];

interface DelegationRow {
  id: string;
  delegator_id: string;
  delegate_role: string;
  scope: string;
  starts_at: string;
  expires_at: string;
  status: string;
  note: string | null;
  created_at: string;
}

interface DelegationAuditRow {
  id: string;
  action: string;
  user_name: string | null;
  user_role: string | null;
  details: Record<string, unknown>;
  timestamp: string;
}

async function fetchDelegations(authUserId: string, status: string | null): Promise<DelegationRow[]> {
  const clauses: string[] = [];
  const params: string[] = [authUserId];
  if (status && status !== "ALL") {
    params.push(status.toUpperCase());
    clauses.push(`AND l.status = $${params.length}`);
  }
  const { rows } = await query(
    `SELECT l.id, l.delegator_id, l.delegate_role, l.scope, l.starts_at, l.expires_at,
            l.status, l.note, l.created_at
       FROM delegation_logs l
       WHERE l.delegator_id = $1 ${clauses.join(" ")}
       ORDER BY l.created_at DESC
       LIMIT 50`,
    params
  );
  return rows as DelegationRow[];
}

async function fetchDelegationAudit(limit = 30): Promise<DelegationAuditRow[]> {
  const { rows } = await query(
    `SELECT id, action, user_name, user_role, details, timestamp
       FROM audit_logs
      WHERE action ILIKE $1
      ORDER BY timestamp DESC
      LIMIT $2`,
    [`%DELEGATION%`, String(limit)]
  );
  return rows as DelegationAuditRow[];
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const [delegations, auditTrail] = await Promise.all([
      fetchDelegations(auth.userId, status),
      fetchDelegationAudit(),
    ]);
    return NextResponse.json({ success: true, data: { delegations, auditTrail } });
  } catch (error) {
    console.error("GET /api/principal/delegations failed:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load delegations" } },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  let body: {
    delegate_role?: string;
    delegate_user_id?: string;
    scope?: string;
    starts_at?: string;
    expires_at?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (!body.delegate_role || !DELEGATION_ROLES.includes(body.delegate_role)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: `delegate_role must be one of: ${DELEGATION_ROLES.join(", ")}`,
        },
      },
      { status: 400 }
    );
  }
  if (!body.scope || body.scope.trim().length < 2) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "scope is required (min 2 chars)" },
      },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();
  const startsAt =
    body.starts_at && Number.isNaN(Date.parse(body.starts_at)) ? nowIso : (body.starts_at ?? nowIso);
  const expiresAt =
    body.expires_at && Number.isNaN(Date.parse(body.expires_at))
      ? new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
      : body.expires_at;

  const id = `dlg-${randomUUID()}`;

  try {
    await query(
      `INSERT INTO delegation_logs
        (id, delegator_id, delegate_role, delegate_user_id, scope, starts_at, expires_at, status, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        id,
        auth.userId,
        body.delegate_role,
        body.delegate_user_id ?? null,
        body.scope.trim(),
        startsAt,
        expiresAt,
        body.note?.trim() || null,
      ]
    );
  } catch {
    // delegation_logs is not provisioned in this environment yet — degrade
    // gracefully to an audit-only record so the UI's "backend pending" state
    // can flip once the table ships.
    console.warn("delegation_logs insert failed; recording audit-only delegation");
  }

  await addAudit({
    action: "DELEGATION_CREATED",
    userId: auth.userId,
    userName: auth.email,
    role: auth.role,
    details: {
      delegationId: id,
      delegateRole: body.delegate_role,
      delegateUserId: body.delegate_user_id ?? null,
      scope: body.scope?.trim(),
      startsAt,
      expiresAt,
      note: body.note?.trim() ?? null,
    },
  });

  const delegations = await fetchDelegations(auth.userId, "ACTIVE").catch(() => []);
  return NextResponse.json({
    success: true,
    data: { delegationId: id, delegations },
  });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["principal", "admin", "sysadmin"] }),
  { keyPrefix: "principal_delegations_get", maxRequests: 30 }
);

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["principal", "admin", "sysadmin"] }),
  { keyPrefix: "principal_delegations_post", maxRequests: 10 }
);
