import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

/**
 * Admin-scoped view of today's gate movement exceptions (correction scans,
 * flagged/denied/blocked/hold reasons, manual entries) across ALL gates.
 *
 * This is the review surface the admin overview was missing (panel finding:
 * "no clear path to review flagged scan exceptions"). It mirrors the operator
 * transactions query but is not gate-scoped — an admin reviews the whole
 * campus. Gated to ADMIN tier (admin + sysadmin).
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
  is_correction: boolean | null;
  created_at: string | null;
}

const FLAGGED_RE = /flagged|hold|violation|blocked|denied|rejected|exception|correction/i;

function isFlagged(r: TransactionRow): boolean {
  return Boolean(r.is_correction) ||
    (r.reason !== null && r.reason !== undefined && FLAGGED_RE.test(String(r.reason)));
}

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    if (!TIER.ADMIN.includes(auth.role as (typeof TIER.ADMIN)[number])) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Admin exceptions are only available to admin-tier roles." },
        },
        { status: 403 }
      );
    }

    // Today's movement logs across every gate, corrections + flagged first.
    const where =
      "(ml.timestamp AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date";

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
                ml.is_manual AS scan_type,
                ml.is_correction AS is_correction,
                ml.timestamp AS created_at
           FROM movement_logs ml
           LEFT JOIN users u ON u.id = ml.user_id
          WHERE ${where}
            AND (ml.is_correction = TRUE
                 OR ml.is_manual = TRUE
                 OR (ml.reason IS NOT NULL AND ml.reason <> ''))
          ORDER BY ml.timestamp DESC
          LIMIT 500`,
        []
      )
    ).rows;

    const flagged = rows.filter(isFlagged);
    const counts = {
      total: flagged.length,
      corrections: rows.filter((r) => Boolean(r.is_correction)).length,
      manual: rows.filter((r) => r.scan_type === "manual" || r.scan_type === "MANUAL" || r.scan_type === "true" || r.scan_type === "True").length,
      denied: rows.filter((r) => r.reason && /denied|rejected|blocked/i.test(String(r.reason))).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        transactions: flagged,
        counts,
        allGates: true,
      },
    });
  } catch (error) {
    console.error("Admin exceptions fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch gate exceptions." },
      },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: TIER.ADMIN }),
  { keyPrefix: "admin_exceptions", maxRequests: 60 }
);

export const dynamic = "force-dynamic";
