import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok } from "@/server/http/response";

async function handleGet(req: NextRequest) {
  const shiftDate = req.nextUrl.searchParams.get("shift_date");
  const { rows } = await query(
    shiftDate
      ? `SELECT s.*, t.name AS template_name
           FROM public.security_shifts s
           LEFT JOIN public.security_shift_templates t ON t.id = s.template_id
          WHERE s.shift_date = $1::date
          ORDER BY s.starts_at ASC`
      : `SELECT s.*, t.name AS template_name
           FROM public.security_shifts s
           LEFT JOIN public.security_shift_templates t ON t.id = s.template_id
          ORDER BY s.shift_date DESC, s.starts_at ASC
          LIMIT 30`,
    shiftDate ? [shiftDate] : [],
  );
  return ok({ shifts: rows });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["supervisor", "admin", "sysadmin"],
});
