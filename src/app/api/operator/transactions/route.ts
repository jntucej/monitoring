import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/operator/transactions
 *
 * Thin, read-only endpoint for the operator desk's "Transactions" section.
 *
 * Returns today's gate movement logs (Asia/Kolkata calendar day), optionally
 * scoped to the caller's assigned gate:
 *
 *   {
 *     success: true,
 *     data: {
 *       transactions: [{ id, roll, name, person_type, direction, reason,
 *                        gate_id, gate_name, timestamp, scan_type, created_at }],
 *       counts: { total, entries, exits, manual, flagged },
 *       gateScoped: boolean
 *     }
 *   }
 *
 * Operator-tier only — a gate operator must not pull another gate's flow.
 * Pure read: no writes, no mutations.
 */
interface TransactionRow {
  id: string;
  roll: string | null;
  name: string | null;
  person_type: string | null;
  direction: string;
  reason: string | null;
  gate_id: string | null;
  gate_name: string | null;
  timestamp: string;
  scan_type: string | null;
  created_at: string | null;
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    // Role gate: operator-tier roles only.
    if (!TIER.OPERATOR.includes(auth.role)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Operator transactions are only available to operator-tier roles." },
        },
        { status: 403 }
      );
    }

    // Scoped to the caller's assigned gate when one exists.
    const callerGateId = auth.gateId || null;
    const isOperatorRole = auth.role === "operator";

    const params: unknown[] = [];
    let where = "(ml.timestamp AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date";
    if (callerGateId && isOperatorRole) {
      where += " AND ml.gate_id = $1";
      params.push(callerGateId);
    }

    const rows: TransactionRow[] = (
      await query<TransactionRow>(
        `SELECT ml.id,
                u.unique_id   AS roll,
                u.name,
                u.role        AS person_type,
                ml.direction,
                ml.reason,
                ml.gate_id,
                ml.gate_name,
                ml.timestamp,
                ml.scan_type,
                ml.created_at
           FROM movement_logs ml
           LEFT JOIN users u ON u.id = ml.user_id
          WHERE ${where}
          ORDER BY ml.timestamp DESC
          LIMIT 200`,
        params
      )
    ).rows;

    const total = rows.length;
    const counts = {
      total,
      entries: rows.filter((r) => r.direction === "IN").length,
      exits: rows.filter((r) => r.direction === "OUT").length,
      manual: rows.filter((r) => r.scan_type === "manual" || r.scan_type === "MANUAL").length,
      // Flagged = correction scans or explicitly flagged reasons recorded today.
      flagged: rows.filter(
        (r) =>
          r.scan_type === "correction" ||
          r.scan_type === "CORRECTION" ||
          (r.reason && /flagged|hold|violation|blocked/i.test(String(r.reason)))
      ).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        transactions: rows,
        counts,
        gateScoped: Boolean(callerGateId && isOperatorRole),
        gateId: callerGateId,
      },
    });
  } catch (error) {
    console.error("Operator transactions fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch gate transactions." },
      },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: TIER.OPERATOR }),
  { keyPrefix: "operator_transactions", maxRequests: 60 }
);

export const dynamic = "force-dynamic";
