import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => ({}));
  const scenario = String(b?.scenario ?? "campus_lockdown_drill").trim();

  const payload = {
    is_drill: true,
    scenario,
    initiated_by: auth.userId,
    initiated_at: new Date().toISOString(),
    status: "completed",
  };

  const { rows } = await query<{ id: string }>(
    `INSERT INTO public.lockdown_broadcasts (data) VALUES ($1::jsonb) RETURNING id`,
    [JSON.stringify(payload)],
  );

  await addAudit({
    action: "LOCKDOWN_DRILL_EXECUTED",
    userId: auth.userId,
    role: auth.role,
    details: { drillId: rows[0].id, scenario },
  });

  return ok({ drill_id: rows[0].id, ...payload }, 201);
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["admin", "sysadmin", "supervisor", "principal"],
});
