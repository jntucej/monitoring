import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

/**
 * GET /api/sysadmin/actions
 *
 * The approval-gate queue for operator_actions. Filter with ?status=pending
 * (default), approved, executed, auto_executed, rejected, expired, or
 * ?status=all. Read-only.
 *
 * Every pending row is a "one-tap decision": the card shows the title, risk,
 * and evidence block; the caller approves/rejects via PATCH /actions/[id].
 */
interface OperatorActionRow {
  id: string;
  kind: string;
  title: string;
  payload: unknown;
  evidence: unknown;
  risk: string;
  status: string;
  approver_role: string;
  auto_run_seconds: number;
  source: string;
  expires_at: string;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
  decision_note: string | null;
}

async function handleGet(req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  void _ctx;
  const statusParam = req.nextUrl.searchParams.get("status") ?? "pending";
  const statusIn =
    statusParam === "all"
      ? null
      : ["pending", "approved", "executed", "auto_executed", "rejected", "expired"].includes(statusParam)
        ? statusParam
        : null;

  const res = await query<OperatorActionRow>(
    `SELECT id, kind, title, payload, evidence, risk, status, approver_role,
            auto_run_seconds, source, expires_at, created_at, decided_at, decided_by, decision_note
       FROM public.operator_actions
      ${statusIn ? `WHERE status = $1` : ""}
      ORDER BY created_at DESC
      LIMIT 200`,
    statusIn ? [statusIn] : []
  ).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (/relation .*operator_actions/i.test(msg)) {
      return { rows: [] as OperatorActionRow[] };
    }
    throw err;
  });

  const rows = res.rows.map((r: OperatorActionRow) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    payload: r.payload,
    evidence: r.evidence,
    risk: r.risk,
    status: r.status,
    approverRole: r.approver_role,
    autoRunSeconds: r.auto_run_seconds,
    source: r.source,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    decidedAt: r.decided_at,
    decidedBy: r.decided_by,
    decisionNote: r.decision_note,
  }));

  return ok({ actions: rows, filter: statusIn ?? "all" });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] }),
  { keyPrefix: "sysadmin_actions", maxRequests: 120 }
);
