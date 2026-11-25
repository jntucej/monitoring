import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";

async function handleGet() {
  const [years, programs, branches, entryModes, regulations] = await Promise.all([
    query(`SELECT * FROM public.academic_years ORDER BY start_date DESC`),
    query(`SELECT * FROM public.academic_programs WHERE is_active = true ORDER BY code ASC`),
    query(`SELECT * FROM public.academic_branches WHERE is_active = true ORDER BY code ASC`),
    query(`SELECT * FROM public.entry_modes ORDER BY code ASC`),
    query(`SELECT * FROM public.academic_regulations WHERE is_active = true ORDER BY effective_from DESC`),
  ]);
  return ok({
    academic_years: years.rows,
    programs: programs.rows,
    branches: branches.rows,
    entry_modes: entryModes.rows,
    regulations: regulations.rows,
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

  return fail("INVALID_KIND", "kind must be branch or academic_year", 400);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "faculty", "hod", "dean", "oie", "vice_principal", "principal", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["admin", "sysadmin", "principal", "oie"],
});
