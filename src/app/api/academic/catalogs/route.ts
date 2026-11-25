import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet() {
  const [years, semesters, programs, branches, entryModes, regulations, courses] = await Promise.all([
    query(`SELECT * FROM public.academic_years ORDER BY start_date DESC`),
    query(`SELECT * FROM public.academic_semesters ORDER BY academic_year_code DESC, semester_number ASC`),
    query(`SELECT * FROM public.academic_programs WHERE is_active = true ORDER BY code ASC`),
    query(`SELECT * FROM public.academic_branches WHERE is_active = true ORDER BY code ASC`),
    query(`SELECT * FROM public.entry_modes ORDER BY code ASC`),
    query(`SELECT * FROM public.academic_regulations WHERE is_active = true ORDER BY effective_from DESC`),
    query(`SELECT * FROM public.academic_courses WHERE is_active = true ORDER BY semester_number ASC, code ASC`),
  ]);
  return ok({
    academic_years: years.rows,
    semesters: semesters.rows,
    programs: programs.rows,
    branches: branches.rows,
    entry_modes: entryModes.rows,
    regulations: regulations.rows,
    courses: courses.rows,
  });
}

async function handlePost(req: NextRequest) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const kind = String(b?.kind ?? "").trim();

  if (kind === "branch") {
    const code = String(b?.code ?? "").trim();
    const shortName = String(b?.short_name ?? "").trim().toUpperCase();
    const fullName = String(b?.full_name ?? "").trim();
    if (!code || !shortName || !fullName) return fail("INVALID_INPUT", "code, short_name, full_name required", 400);
    const { rows } = await query(
      `INSERT INTO public.academic_branches (code, short_name, full_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE SET short_name = EXCLUDED.short_name, full_name = EXCLUDED.full_name
       RETURNING *`,
      [code, shortName, fullName],
    );
    return ok(rows[0], 201);
  }

  if (kind === "academic_year") {
    const code = String(b?.code ?? "").trim();
    const startDate = String(b?.start_date ?? "").trim();
    const endDate = String(b?.end_date ?? "").trim();
    if (!code || !startDate || !endDate) return fail("INVALID_INPUT", "code, start_date, end_date required", 400);
    const { rows } = await query(
      `INSERT INTO public.academic_years (code, start_date, end_date, is_current)
       VALUES ($1, $2::date, $3::date, $4)
       ON CONFLICT (code) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, is_current = EXCLUDED.is_current
       RETURNING *`,
      [code, startDate, endDate, Boolean(b?.is_current)],
    );
    return ok(rows[0], 201);
  }

  if (kind === "semester") {
    const ay = String(b?.academic_year_code ?? "").trim();
    const num = Number(b?.semester_number);
    const name = String(b?.name ?? "").trim();
    const startDate = String(b?.start_date ?? "").trim();
    const endDate = String(b?.end_date ?? "").trim();
    if (!ay || !num || !name || !startDate || !endDate) {
      return fail("INVALID_INPUT", "academic_year_code, semester_number, name, start_date, end_date required", 400);
    }
    const { rows } = await query(
      `INSERT INTO public.academic_semesters (academic_year_code, semester_number, name, start_date, end_date, status)
       VALUES ($1, $2, $3, $4::date, $5::date, $6)
       ON CONFLICT (academic_year_code, semester_number) DO UPDATE
         SET name = EXCLUDED.name, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, status = EXCLUDED.status
       RETURNING *`,
      [ay, num, name, startDate, endDate, String(b?.status ?? "upcoming")],
    );
    return ok(rows[0], 201);
  }

  if (kind === "course") {
    const code = String(b?.code ?? "").trim().toUpperCase();
    const title = String(b?.title ?? "").trim();
    const branchCode = String(b?.branch_code ?? "").trim();
    const regCode = String(b?.regulation_code ?? "R22").trim();
    const semNum = Number(b?.semester_number ?? 1);
    if (!code || !title || !branchCode) {
      return fail("INVALID_INPUT", "code, title, branch_code required", 400);
    }
    const { rows } = await query(
      `INSERT INTO public.academic_courses (code, title, branch_code, regulation_code, semester_number, credits)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, credits = EXCLUDED.credits, is_active = true
       RETURNING *`,
      [code, title, branchCode, regCode, semNum, Number(b?.credits ?? 3)],
    );
    return ok(rows[0], 201);
  }

  return fail("INVALID_KIND", "kind must be branch, academic_year, semester, or course", 400);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "faculty", "hod", "dean", "oie", "vice_principal", "principal", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["admin", "sysadmin", "principal", "oie"],
});

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const kind = String(b?.kind ?? "").trim();
  const code = String(b?.code ?? "").trim();
  if (!code) return fail("INVALID_INPUT", "code is required", 400);

  if (kind === "branch_deactivate") {
    const { rows: deps } = await query<{ cnt: number }>(
      `SELECT COUNT(*)::int AS cnt FROM public.student_academic_history WHERE branch_code = $1 AND effective_to IS NULL`,
      [code],
    );
    if ((deps[0]?.cnt ?? 0) > 0 && !b?.force_archive) {
      return fail("HAS_DEPENDENCIES", `Branch ${code} has ${deps[0].cnt} active student records; archive instead of deleting`, 409);
    }
    const { rows } = await query(
      `UPDATE public.academic_branches SET is_active = false, effective_to = CURRENT_DATE WHERE code = $1 RETURNING *`,
      [code],
    );
    await addAudit({ action: "ACADEMIC_BRANCH_DEACTIVATED", userId: auth.userId, role: auth.role, details: { code } });
    return ok(rows[0]);
  }

  return fail("INVALID_KIND", "Unsupported patch kind", 400);
}

export const PATCH = withAuthorization(handlePatch, {
  requiredRole: ["admin", "sysadmin", "principal", "oie"],
});
