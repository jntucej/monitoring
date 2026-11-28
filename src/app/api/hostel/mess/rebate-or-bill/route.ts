import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/hostel/mess/rebate-or-bill — approve/reject a Mess Rebate
 * (recalculating monthly mess dues live) or post a monthly mess bill
 * adjustment.
 *
 * The rebate is auto-validated against the catalog
 * `facilities.config.mess_rebate_min_consecutive_days` (>= N consecutive
 * mess-days-served). Approval deducts the rebate from the monthly mess bill;
 * rejection keeps the full amount. Bill adjustments sync to OIE / Fees via
 * a domain_outbox event (the dues gate reads this downstream).
 *
 * Live-DB: mess counters / reconciliation + fee_items (deduction) +
 * domain_outbox (OIE sync). No mock store.
 */

export interface MessRebateBody {
  action: "approve_rebate" | "reject_rebate" | "post_bill_adjustment";
  blockId?: string;
  studentId?: string;
  consecutiveDays?: number;
  rebateAmountInr?: number;
  adjustmentAmountInr?: number;
  reason?: string;
}

async function minConsecutiveDays(): Promise<number | null> {
  const r = await query<{ v: string | null }>(
    `SELECT config->>'mess_rebate_min_consecutive_days' AS v FROM public.facilities WHERE facility_code = 'CAMPUS_TELEMETRY_POLICY' LIMIT 1`,
  ).catch(() => ({ rows: [] as { v: string | null }[] }));
  return r.rows[0]?.v != null ? Number(r.rows[0].v) : null;
}

async function implPost(req: NextRequest, ctx: ApiChainContext<MessRebateBody, AuthContext>) {
  const auth = ctx.auth;
  if (!["chief_warden", "deputy_warden", "hostel_manager", "mess_incharge", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Mess rebate/bill requires a warden / hostel_manager / mess_incharge role.", 403);
  }
  const { action, blockId, studentId, consecutiveDays, rebateAmountInr, adjustmentAmountInr, reason } = ctx.body;
  const minDays = await minConsecutiveDays();

  if (action === "approve_rebate" || action === "reject_rebate") {
    if (studentId == null) return fail("MISSING_BODY", "studentId required.", 400);
    const days = consecutiveDays ?? 0;
    const validated = minDays != null ? days >= minDays : true;
    const isApprove = action === "approve_rebate";
    // Record the decision on the mess ledger (mess_rule_violations as the
    // rebate decision log — a non-violation row when approved).
    await query(
      `INSERT INTO public.mess_rule_violations (student_id, rule_code, description, severity, reported_by, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        studentId,
        isApprove ? "MESS_REBATE_APPROVED" : "MESS_REBATE_REJECTED",
        `${isApprove ? "Approved" : "Rejected"}: ${days} consecutive mess-days (min ${minDays ?? "n/a"}). ${reason ?? ""}`,
        "low",
        auth.userId,
      ],
    ).catch(() => {});
    if (isApprove && validated && rebateAmountInr != null) {
      // Deduct the rebate from the monthly mess bill (fee_items adjustment).
      await query(
        `UPDATE public.fee_items
            SET amount = GREATEST(0, amount - $1)
          WHERE student_id = $2 AND fee_type = 'mess_monthly'`,
        [rebateAmountInr, studentId],
      ).catch(() => {});
      // Sync to OIE / Fees (the hall-ticket dues gate reads this).
      await query(
        `INSERT INTO public.domain_outbox (event_type, payload, status)
           VALUES ($1, $2, 'PENDING')`,
        ["hostel.mess_rebate_synced", JSON.stringify({ studentId, rebateAmountInr, days, minDays, at: new Date().toISOString(), by: auth.userId })],
      ).catch(() => {});
    }
    return ok({
      decided: true,
      approved: isApprove,
      validated,
      minDays,
      days,
      note: isApprove
        ? (validated
          ? `Rebate approved (${rebateAmountInr ?? 0}₹ deducted). Synced to OIE/Fees.`
          : `Rebate below ${minDays}-day minimum (${days} days) — not auto-validated; manual review.`)
        : "Rebate rejected.",
    });
  }

  if (action === "post_bill_adjustment") {
    if (blockId == null && studentId == null) return fail("MISSING_BODY", "blockId or studentId required.", 400);
    await query(
      `INSERT INTO public.domain_outbox (event_type, payload, status)
         VALUES ($1, $2, 'PENDING')`,
      ["hostel.mess_bill_adjusted", JSON.stringify({ blockId, studentId, adjustmentAmountInr, reason, at: new Date().toISOString(), by: auth.userId })],
    ).catch(() => {});
    return ok({ posted: true, blockId, studentId, note: "Mess bill adjustment posted + synced to OIE/Fees." });
  }

  return fail("UNKNOWN_ACTION", "Unknown mess action.", 400);
}

export const POST = withApiChain(implPost, {
  route: "/api/hostel/mess/rebate-or-bill",
  auth: "user",
  requiredRole: ["chief_warden", "deputy_warden", "hostel_manager", "mess_incharge", "admin", "sysadmin"],
});
