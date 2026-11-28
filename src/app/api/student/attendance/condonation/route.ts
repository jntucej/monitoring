/**
 * /api/student/attendance/condonation
 *
 *   GET  — the student's own most recent condonation application (if any).
 *   POST — submit a new condonation application. Only valid while the student
 *          is in the condonation band (condonationMinPct <= pct < eligibleMinPct),
 *          per the config-driven policy engine. Creating one outside the band is
 *          rejected (no fabricated remedies).
 *
 * The HOD endorsement + CAC/Principal decision + fee-cleared flips live on the
 * approver side (POST /api/.../condonation/[id]/...). This route is the student
 * composition entry point.
 */
import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { resolveAttendanceVerdict } from "@/server/policy/attendance-verdict";
import type { AuthContext } from "@/lib/authContext";

interface CondonationRow {
  id: string;
  status: string;
  grounds_category: string;
  aggregate_pct: string;
  absence_from: string;
  absence_to: string;
  missed_hours: string;
  fee_cleared: boolean;
  fee_challan_ref: string | null;
  created_at: string;
}

async function implGet(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const { rows } = await query<CondonationRow>(
    `SELECT id, status, grounds_category, aggregate_pct::text AS aggregate_pct,
            absence_from, absence_to, missed_hours::text AS missed_hours,
            fee_cleared, fee_challan_ref, created_at
       FROM public.attendance_condonations
      WHERE student_id = $1::uuid
      ORDER BY created_at DESC NULLS LAST
      LIMIT 1`,
    [auth.userId],
  );
  return ok({ condonation: rows[0] ?? null });
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as
    | {
        academicYear?: string;
        semester?: number;
        groundsCategory?: string;
        absenceFrom?: string;
        absenceTo?: string;
        missedHours?: number;
        proofStorageKey?: string;
      }
    | null;
  if (!body) return fail("VALIDATION", "JSON body required", 400);

  const groundsCategory = String(body.groundsCategory ?? "").toUpperCase();
  const allowedGrounds = ["MEDICAL", "INSTITUTIONAL_DEPUTATION"];
  if (!allowedGrounds.includes(groundsCategory)) {
    return fail("VALIDATION", "groundsCategory must be MEDICAL or INSTITUTIONAL_DEPUTATION", 400);
  }

  const absenceFrom = String(body.absenceFrom ?? "").trim();
  const absenceTo = String(body.absenceTo ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(absenceFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(absenceTo)) {
    return fail("VALIDATION", "absenceFrom and absenceTo must be YYYY-MM-DD", 400);
  }
  const missedHours = Math.max(1, Math.floor(Number(body.missedHours ?? 0)));
  const semester = Math.min(8, Math.max(1, Math.floor(Number(body.semester ?? 1))));
  const academicYear = String(body.academicYear ?? "").trim() || "current";

  // Gate to the band: only a student who NEEDS a condonation may file one.
  const v = await resolveAttendanceVerdict({ userId: auth.userId, academicYear });
  if (!v.condonationRemedyAvailable) {
    return fail(
      "NOT_IN_CONDONATION_BAND",
      "A condonation application is only available when your aggregate attendance is in the condonation band.",
      409,
    );
  }

  const { rows } = await query<{ id: string; reg_code: string }>(
    `SELECT id::text AS id, code AS reg_code
       FROM public.academic_regulations
      WHERE status = 'ACTIVE'
      ORDER BY version DESC LIMIT 1`,
    [],
  );
  const activeRegCode = rows[0]?.reg_code ?? null;
  if (!activeRegCode) {
    return fail("NO_ACTIVE_REGULATION", "No active academic regulation found in the catalog.", 409);
  }

  const { rows: insertRows } = await query<{ id: string }>(
    `INSERT INTO public.attendance_condonations
       (student_id, regulation_code, academic_year, semester, aggregate_pct,
        grounds_category, absence_from, absence_to, missed_hours, proof_storage_key, status)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::date, $8::date, $9, $10, 'PENDING_HOD')
     RETURNING id::text AS id`,
    [
      auth.userId,
      activeRegCode,
      academicYear,
      semester,
      v.aggregatePct,
      groundsCategory,
      absenceFrom,
      absenceTo,
      missedHours,
      String(body.proofStorageKey ?? "").trim() || null,
    ],
  );

  return ok({ id: insertRows[0]?.id, status: "PENDING_HOD", submittedPct: v.aggregatePct, regulationCode: activeRegCode });
}

export const GET = withApiChain(implGet, {
  route: "/api/student/attendance/condonation",
  auth: "user",
  requiredRole: ["student"],
  rateLimit: { keyPrefix: "student_condonation_get", maxRequests: 120 },
});

export const POST = withMutationGuard(implPost, {
  requiredRole: ["student"],
  rateLimit: { maxRequests: 10, windowMs: 60_000 },
});
