import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const targetAy = String(b?.target_academic_year_code ?? "").trim();
  if (!targetAy) return fail("INVALID_INPUT", "target_academic_year_code is required", 400);

  const { rows: activeRows } = await query<{
    id: string;
    student_id: string;
    program_code: string;
    branch_code: string;
    entry_mode_code: string;
    regulation_code: string | null;
    year_of_study: number;
    section: string | null;
    duration_years: number;
  }>(
    `SELECT sah.id, sah.student_id, sah.program_code, sah.branch_code, sah.entry_mode_code,
            sah.regulation_code, sah.year_of_study, sah.section, ap.duration_years
       FROM public.student_academic_history sah
       JOIN public.academic_programs ap ON ap.code = sah.program_code
      WHERE sah.effective_to IS NULL
        AND sah.academic_status = 'active'
        AND sah.academic_year_code <> $1`,
    [targetAy],
  );

  let promoted = 0;
  let graduated = 0;

  for (const r of activeRows) {
    const isGrad = r.year_of_study >= r.duration_years;
    const nextYear = isGrad ? r.year_of_study : r.year_of_study + 1;
    const nextStatus = isGrad ? "graduated" : "active";

    await query(`UPDATE public.student_academic_history SET effective_to = NOW() WHERE id = $1::uuid`, [r.id]);
    await query(
      `INSERT INTO public.student_academic_history
         (student_id, academic_year_code, program_code, branch_code, entry_mode_code,
          regulation_code, year_of_study, section, academic_status, event_reason, created_by)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::uuid)`,
      [
        r.student_id,
        targetAy,
        r.program_code,
        r.branch_code,
        r.entry_mode_code,
        r.regulation_code,
        nextYear,
        r.section,
        nextStatus,
        isGrad ? `Graduated at end of AY` : `Promoted to year ${nextYear} for ${targetAy}`,
        auth.userId,
      ],
    );
    if (isGrad) graduated++;
    else promoted++;
  }

  await addAudit({
    action: "ACADEMIC_BATCH_PROMOTION",
    userId: auth.userId,
    role: auth.role,
    details: { targetAy, promoted, graduated },
  });

  return ok({ target_academic_year_code: targetAy, promoted, graduated });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["oie", "principal", "admin", "sysadmin"],
});
