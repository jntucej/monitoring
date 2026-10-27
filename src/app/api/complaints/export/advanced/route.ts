// src/app/api/complaints/export/advanced/route.ts
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { csvRow } from "@/lib/csv";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["admin", "sysadmin", "principal"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }
  const { rows } = await query(`SELECT * FROM public.complaints WHERE deleted_at IS NULL LIMIT 5000`);
  const headers = ["id", "complaint_number", "category_code", "title", "status", "created_at"];
  const csv = [headers.join(",")]
    .concat(
      rows.map((r: Record<string, unknown>) =>
        csvRow(headers.map((h) => String(r[h] ?? ""))),
      ),
    )
    .join("\n");
  return new Response(csv, { headers: { "content-type": "text/csv", "content-disposition": 'attachment; filename="complaints-advanced.csv"' } });
}
export const GET = withAuthorization(handleGet);
