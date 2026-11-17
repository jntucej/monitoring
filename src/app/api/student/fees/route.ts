// /api/student/fees/route.ts
// Student fee dues + receipts (STEP 3.1). Self-scoped: only the
// caller's own fee items. Parent has a parallel endpoint that scopes
// via the guardian mapping.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function implGet(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const { rows } = await query<{
    id: string; fee_type: string; amount: string; paid: string;
    due_date: string | null; status: string; receipt_no: string | null;
    paid_at: string | null;
  }>(
    `SELECT id, fee_type, amount, paid, due_date, status, receipt_no, paid_at
       FROM public.fee_items WHERE student_id = $1 ORDER BY due_date NULLS LAST`,
    [auth.userId],
  );
  const totalDue = rows.filter((r) => r.status !== "PAID" && r.status !== "WAIVED")
    .reduce((sum, r) => sum + (Number(r.amount) - Number(r.paid)), 0);
  return ok({
    userId: auth.userId,
    totalDue,
    items: rows.map((r) => ({
      id: r.id, feeType: r.fee_type, amount: Number(r.amount),
      paid: Number(r.paid), dueDate: r.due_date, status: r.status,
      receiptNo: r.receipt_no, paidAt: r.paid_at,
    })),
  });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["student", "parent", "guardian", "admin", "sysadmin"] }),
  { keyPrefix: "student-fees", maxRequests: 30, windowMs: 60_000 },
);
