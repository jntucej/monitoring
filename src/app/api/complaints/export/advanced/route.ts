// src/app/api/complaints/export/advanced/route.ts
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["admin", "sysadmin", "principal"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }
  const { rows } = await query(`SELECT * FROM public.complaints WHERE deleted_at IS NULL LIMIT 5000`);
  const csv = "id,complaint_number,category_code,title,status,created_at\n" +
    rows.map((r: any) => `${r.id},${r.complaint_number},${r.category_code},"${(r.title||"").replace(/"/g,'""')}",${r.status},${r.created_at}`).join("\n");
  return new Response(csv, { headers: { "content-type": "text/csv", "content-disposition": 'attachment; filename="complaints-advanced.csv"' } });
}
export const GET = withAuthorization(handleGet);
