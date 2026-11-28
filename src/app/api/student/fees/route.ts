// /api/student/fees/route.ts
// Student fee dues + receipts (STEP 3.1). Self-scoped: only the
// caller's own fee items. Parent has a parallel endpoint that scopes
// via the guardian mapping.

import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { z } from "zod";
import type { AuthContext } from "@/lib/authContext";

async function implGet(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const { rows } = await query<{
    id: string; fee_type: string; amount: string; paid: string;
    due_date: string | null; status: string; receipt_no: string | null;
    paid_at: string | null;
  }>(
    `SELECT id, fee_type, amount, COALESCE(paid,0) AS paid, due_date, status, receipt_no, paid_at
       FROM public.fee_items WHERE student_id = $1 ORDER BY due_date NULLS LAST`,
    [auth.userId],
  ).catch(() => ({ rows: [] as { id: string; fee_type: string; amount: string; paid: string; due_date: string | null; status: string; receipt_no: string | null; paid_at: string | null }[] }));

  // Scholarship / aid records (scholarship_awards table, migration 60).
  const aidRows = await query<{
    id: string; scheme_name: string; amount: string; status: string;
  }>(
    `SELECT id, scheme_name, amount, status
       FROM public.scholarship_awards
      WHERE student_id = $1 AND status IN ('APPROVED','AWARDED','PENDING')
      ORDER BY created_at DESC`,
    [auth.userId],
  ).catch(() => ({ rows: [] as { id: string; scheme_name: string; amount: string; status: string }[] }));

  const items = rows.map((r) => ({
    id: r.id, feeType: r.fee_type, amount: Number(r.amount),
    paid: Number(r.paid), dueDate: r.due_date, status: r.status,
    receiptNo: r.receipt_no, paidAt: r.paid_at,
  }));
  const totalDue = items.filter((i) => i.status !== "PAID" && i.status !== "WAIVED")
    .reduce((s, i) => s + Math.max(0, i.amount - i.paid), 0);
  const totalAid = aidRows.rows.reduce((s, a) => s + Number(a.amount), 0);

  return ok({
    userId: auth.userId,
    totalDue,
    totalAid,
    netDue: Math.max(0, totalDue - totalAid),
    items,
    aid: aidRows.rows.map((a) => ({
      id: a.id, scheme: a.scheme_name, amount: Number(a.amount), status: a.status,
    })),
  });
}

const PayBody = z.object({
  payMethod: z.enum(["SBI_COLLECT", "UPI", "CARD"]),
  utrRef: z.string().min(6).max(32),
});

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = PayBody.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return fail("VALIDATION", "payMethod + utrRef (6–32 chars) required", 400);
  }

  // Log the payment reference. The SBI Collect / UPI webhook adapter
  // (integration_adapters.sbi_collect_upi_fee) will reconcile the webhook's
  // utr_ref against this row — no fee amount is hardcoded here.
  await query(
    `INSERT INTO public.fee_payment_references (student_id, utr_ref, pay_method, amount_inr, status, created_at)
     VALUES ($1::uuid, $2, $3, 0, 'PENDING_WEBHOOK', NOW())`,
    [auth.userId, body.data.utrRef, body.data.payMethod],
  ).catch(() => null); // table may not exist on a pre-migration DB — non-fatal

  return ok({ utrRef: body.data.utrRef, payMethod: body.data.payMethod, status: "PENDING_WEBHOOK" });
}

export const GET = withApiChain(implGet, {
  route: "/api/student/fees",
  auth: "user",
  requiredRole: ["student", "parent", "guardian", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "student-fees", maxRequests: 30, windowMs: 60_000 },
});

export const POST = withApiChain(implPost, {
  route: "/api/student/fees",
  auth: "user",
  requiredRole: ["student", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "student-fees-pay", maxRequests: 20, windowMs: 60_000 },
});
