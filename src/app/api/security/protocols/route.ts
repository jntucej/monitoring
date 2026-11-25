import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";

async function handleGet() {
  const { rows } = await query(
    `SELECT * FROM public.emergency_protocols WHERE active = true ORDER BY severity DESC, code ASC`,
  );
  return ok({ protocols: rows });
}

async function handlePost(req: NextRequest) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const code = String(b?.code ?? "").trim().toUpperCase();
  const title = String(b?.title ?? "").trim();
  const severity = ["low", "medium", "high", "critical"].includes(String(b?.severity))
    ? String(b.severity)
    : "high";
  const steps = Array.isArray(b?.steps) ? b.steps.map(String) : [];
  const ownerRole = String(b?.owner_role ?? "supervisor").trim();

  if (!code || !title) return fail("INVALID_INPUT", "code and title are required", 400);

  const { rows } = await query(
    `INSERT INTO public.emergency_protocols (code, title, severity, steps, owner_role)
     VALUES ($1, $2, $3, $4::jsonb, $5)
     ON CONFLICT (code) DO UPDATE
       SET title = EXCLUDED.title, severity = EXCLUDED.severity, steps = EXCLUDED.steps, owner_role = EXCLUDED.owner_role, updated_at = NOW()
     RETURNING *`,
    [code, title, severity, JSON.stringify(steps), ownerRole],
  );
  return ok(rows[0], 201);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["operator", "supervisor", "principal", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["supervisor", "principal", "admin", "sysadmin"],
});
